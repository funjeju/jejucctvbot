import React, { useState } from 'react';
import type { FeedPost, FeedComment } from '../types';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

interface FeedCardProps {
  feed: FeedPost;
  onClick: () => void;
  language: 'KOR' | 'ENG' | 'CHN';
  onSpotClick?: (spotId: string) => void; // 스팟 클릭 핸들러
}

const FeedCard: React.FC<FeedCardProps> = ({ feed, onClick, language, onSpotClick }) => {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showAllSpots, setShowAllSpots] = useState(false);

  const isLiked = user ? (feed.likedBy?.includes(user.uid) || false) : false;
  const isBookmarked = user ? (feed.bookmarkedBy?.includes(user.uid) || false) : false;

  // 디버깅: nearbySpots 확인
  console.log('FeedCard - feed.id:', feed.id);
  console.log('FeedCard - nearbySpots:', feed.nearbySpots);
  console.log('FeedCard - nearbySpots length:', feed.nearbySpots?.length);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지

    // 로그인 체크
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    try {
      const feedRef = doc(db, 'feeds', feed.id);

      if (isLiked) {
        // 좋아요 취소
        await updateDoc(feedRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        // 좋아요 추가
        await updateDoc(feedRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('좋아요 업데이트 실패:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지

    // 로그인 체크
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (isBookmarking) return;

    setIsBookmarking(true);
    try {
      const feedRef = doc(db, 'feeds', feed.id);

      if (isBookmarked) {
        // 찜 취소
        await updateDoc(feedRef, {
          bookmarks: increment(-1),
          bookmarkedBy: arrayRemove(user.uid)
        });
      } else {
        // 찜 추가
        await updateDoc(feedRef, {
          bookmarks: increment(1),
          bookmarkedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('찜 업데이트 실패:', error);
    } finally {
      setIsBookmarking(false);
    }
  };

  // 대표 미디어 (첫 번째 미디어)
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const mainMedia = feed.media[0];

  // 댓글 추가
  const handleAddComment = async () => {
    if (!commentText.trim() || isCommenting) return;

    // 로그인 체크
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    setIsCommenting(true);
    try {
      const newComment = {
        id: `comment_${Date.now()}`,
        userId: user.uid,
        username: user.displayName || user.email || '사용자',
        content: commentText.trim(),
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };

      const feedRef = doc(db, 'feeds', feed.id);
      await updateDoc(feedRef, {
        comments: increment(1),
        commentList: arrayUnion(newComment)
      });

      setCommentText('');
    } catch (error) {
      console.error('댓글 추가 실패:', error);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(!showComments);
  };

  // 공유하기 핸들러
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const shareUrl = `${window.location.origin}/feed/${feed.id}`;
    const shareText = feed.content ? `${feed.content}\n\n` : '';
    const shareTitle = `${feed.username}님의 피드`;

    // Web Share API 지원 확인
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // 사용자가 공유를 취소한 경우 무시
        if ((error as Error).name !== 'AbortError') {
          console.error('공유 실패:', error);
        }
      }
    } else {
      // Web Share API 미지원 시 클립보드에 복사
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert(language === 'KOR' ? '링크가 복사되었습니다!' : language === 'ENG' ? 'Link copied!' : '链接已复制！');
      } catch (error) {
        console.error('클립보드 복사 실패:', error);
        alert(language === 'KOR' ? '링크 복사에 실패했습니다.' : language === 'ENG' ? 'Failed to copy link.' : '复制链接失败。');
      }
    }
  };

  // 시간 표시 (상대 시간) - EXIF 촬영 시간 기준
  const getRelativeTimeFromExif = (exifDateTime?: string) => {
    if (!exifDateTime) return '';

    try {
      let photoDate: Date;

      // 다양한 EXIF 날짜 형식 처리
      // 형식 1: "2024:01:15 14:30:00" (표준 EXIF)
      if (exifDateTime.includes(':') && exifDateTime.match(/^\d{4}:\d{2}:\d{2}/)) {
        const exifDateStr = exifDateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        photoDate = new Date(exifDateStr);
      }
      // 형식 2: "2023. 11. 19. 오전 7:50:20" (한글 형식)
      else if (exifDateTime.includes('.') && (exifDateTime.includes('오전') || exifDateTime.includes('오후'))) {
        // "2023. 11. 19. 오전 7:50:20" → "2023-11-19 07:50:20" (24시간 형식)
        let dateStr = exifDateTime
          .replace(/\. /g, '-')  // "2023. 11. 19." → "2023-11-19-"
          .replace(/\.$/, '')     // 마지막 점 제거
          .trim();

        const isAM = dateStr.includes('오전');
        dateStr = dateStr.replace(/오전|오후/, '').trim();

        // "2023-11-19- 7:50:20" → "2023-11-19 7:50:20"
        dateStr = dateStr.replace(/-\s+/, ' ');

        // 시간 파싱
        const parts = dateStr.split(' ');
        if (parts.length >= 2) {
          const datePart = parts[0]; // "2023-11-19"
          const timePart = parts[1]; // "7:50:20" 또는 "01:27"
          const timeComponents = timePart.split(':');
          let hours = parseInt(timeComponents[0]);

          // 오전/오후 처리
          if (!isAM && hours < 12) hours += 12;
          if (isAM && hours === 12) hours = 0;

          const hours24 = hours.toString().padStart(2, '0');
          const minutes = timeComponents[1];
          const seconds = timeComponents[2] || '00'; // 초가 없으면 00으로 설정
          const formattedDateTime = `${datePart} ${hours24}:${minutes}:${seconds}`;
          photoDate = new Date(formattedDateTime);
        } else {
          photoDate = new Date(dateStr);
        }
      }
      // 형식 3: 기타 형식 (JavaScript Date가 파싱 시도)
      else {
        photoDate = new Date(exifDateTime);
      }

      // 유효한 날짜인지 확인
      if (isNaN(photoDate.getTime())) {
        return '';
      }

      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - photoDate.getTime()) / 1000);

      if (diffInSeconds < 60) return language === 'KOR' ? '방금 전 촬영' : language === 'ENG' ? 'Taken just now' : '刚拍摄';
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return language === 'KOR' ? `${minutes}분 전 촬영` : language === 'ENG' ? `Taken ${minutes}m ago` : `${minutes}分钟前拍摄`;
      }
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return language === 'KOR' ? `${hours}시간 전 촬영` : language === 'ENG' ? `Taken ${hours}h ago` : `${hours}小时前拍摄`;
      }
      const days = Math.floor(diffInSeconds / 86400);
      return language === 'KOR' ? `${days}일 전 촬영` : language === 'ENG' ? `Taken ${days}d ago` : `${days}天前拍摄`;
    } catch (error) {
      console.error('Error parsing EXIF date:', error);
      return '';
    }
  };

  // 업로드 시간 표시 (사용자 정보 영역용)
  const getRelativeTime = (timestamp: any) => {
    const now = new Date();
    const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return language === 'KOR' ? '방금 전' : language === 'ENG' ? 'Just now' : '刚刚';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return language === 'KOR' ? `${minutes}분 전` : language === 'ENG' ? `${minutes}m ago` : `${minutes}分钟前`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return language === 'KOR' ? `${hours}시간 전` : language === 'ENG' ? `${hours}h ago` : `${hours}小时前`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return language === 'KOR' ? `${days}일 전` : language === 'ENG' ? `${days}d ago` : `${days}天前`;
  };

  return (
    <div
      onClick={onClick}
      className="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* 사용자 정보 */}
      <div className="p-3 flex items-center gap-3">
        {feed.userAvatar ? (
          <img
            src={feed.userAvatar}
            alt={feed.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
            {feed.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{feed.username}</p>
          <p className="text-xs text-gray-500">{getRelativeTime(feed.timestamp)}</p>
        </div>
      </div>

      {/* 미디어 (세로 기준 썸네일) */}
      {mainMedia && (
        <div className="relative w-full" style={{ paddingBottom: '133.33%' }}> {/* 3:4 비율 */}
          {mainMedia.type === 'image' ? (
            <img
              src={mainMedia.url}
              alt="Feed media"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              src={mainMedia.url}
              className="absolute inset-0 w-full h-full object-cover bg-gray-900"
              controls
              muted
              playsInline
              preload="auto"
              onLoadStart={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                const video = e.target as HTMLVideoElement;
                video.currentTime = 0.1;
              }}
            />
          )}

          {/* 시간 표시 오버레이 (상단 왼쪽) - EXIF 촬영 시간 기준 */}
          {mainMedia?.exif?.dateTime && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              {getRelativeTimeFromExif(mainMedia.exif.dateTime)}
            </div>
          )}

          {/* 사업자 업체명 오버레이 (상단 중앙) */}
          {feed.userRole === 'store' && feed.businessName && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 via-black/40 to-transparent p-4 pt-12">
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white font-bold text-lg drop-shadow-lg">
                  {feed.businessName}
                </span>
              </div>
            </div>
          )}

          {/* 미디어 개수 표시 */}
          {feed.media.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              {feed.media.length}
            </div>
          )}

          {/* EXIF 정보 오버레이 (하단) */}
          {mainMedia.exif && Object.keys(mainMedia.exif).length > 0 && (
            <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white rounded-lg p-3 space-y-2 max-h-[40vh] overflow-y-auto text-xs">
              {/* 위치 */}
              {mainMedia.exif.location && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="flex-1 break-words">{mainMedia.exif.location}</span>
                </div>
              )}

              {/* 카메라 정보 + 촬영 설정 */}
              {(mainMedia.exif.camera && mainMedia.exif.camera !== 'Unknown') && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{mainMedia.exif.camera}</span>
                  </div>
                  {/* 촬영 설정 (카메라 옆에 표시) */}
                  {(mainMedia.exif.aperture || mainMedia.exif.exposureTime || mainMedia.exif.iso || mainMedia.exif.focalLength) && (
                    <>
                      <span className="opacity-50">•</span>
                      <div className="flex flex-wrap gap-2 opacity-90">
                        {mainMedia.exif.focalLength && <span>{mainMedia.exif.focalLength}mm</span>}
                        {mainMedia.exif.aperture && <span>f/{mainMedia.exif.aperture}</span>}
                        {mainMedia.exif.exposureTime && <span>{mainMedia.exif.exposureTime}s</span>}
                        {mainMedia.exif.iso && <span>ISO {mainMedia.exif.iso}</span>}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 내용 */}
      {feed.content && (
        <div className="p-3">
          <p className="text-gray-800 text-sm line-clamp-2">{feed.content}</p>
        </div>
      )}

      {/* 사업자 웹사이트 CTA 버튼 */}
      {feed.userRole === 'store' && feed.businessWebsite && (
        <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
          <a
            href={feed.businessWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
              </svg>
              <span>
                {language === 'KOR' ? '웹사이트 바로가기' : language === 'ENG' ? 'Visit Website' : '访问网站'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </a>
        </div>
      )}

      {/* 주변 가볼만한곳 (식당/카페) */}
      {feed.nearbySpots && feed.nearbySpots.length > 0 && (
        <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <h4 className="text-sm font-bold text-orange-800">
                  {language === 'KOR' ? '🍽️ 주변 가볼만한곳' : language === 'ENG' ? '🍽️ Nearby Places' : '🍽️ 附近推荐'}
                </h4>
              </div>
              {feed.nearbySpots.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllSpots(!showAllSpots);
                  }}
                  className="text-xs text-orange-600 font-semibold hover:text-orange-700 transition-colors"
                >
                  {showAllSpots
                    ? (language === 'KOR' ? '접기 ▲' : language === 'ENG' ? 'Collapse ▲' : '收起 ▲')
                    : (language === 'KOR' ? `더보기 (${feed.nearbySpots.length}) ▼` : language === 'ENG' ? `More (${feed.nearbySpots.length}) ▼` : `更多 (${feed.nearbySpots.length}) ▼`)
                  }
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(showAllSpots ? feed.nearbySpots : feed.nearbySpots.slice(0, 1)).map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => onSpotClick?.(spot.id)}
                  className="w-full flex items-center gap-3 bg-white rounded-lg p-2 hover:bg-orange-50 transition-colors text-left border border-orange-100 hover:border-orange-300"
                >
                  {spot.thumbnailUrl ? (
                    <img
                      src={spot.thumbnailUrl}
                      alt={spot.title}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm line-clamp-1">{spot.title}</p>
                    <p className="text-xs text-orange-600">
                      {spot.distance < 1000
                        ? `${Math.round(spot.distance)}m`
                        : `${(spot.distance / 1000).toFixed(1)}km`}{' '}
                      {language === 'KOR' ? '거리' : language === 'ENG' ? 'away' : '距离'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 좋아요/찜/댓글/공유 수 */}
      <div className="px-3 pb-3 flex items-center gap-4 text-sm">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
            }`}
        >
          <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="font-medium">{feed.likes || 0}</span>
        </button>
        <button
          onClick={handleBookmark}
          disabled={isBookmarking}
          className={`flex items-center gap-1 transition-colors ${isBookmarked ? 'text-yellow-600' : 'text-gray-600 hover:text-yellow-600'
            }`}
        >
          <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="font-medium">{feed.bookmarks || 0}</span>
        </button>
        <button
          onClick={handleCommentClick}
          className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{feed.comments || 0}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-gray-600 hover:text-green-600 transition-colors ml-auto"
          title={language === 'KOR' ? '공유하기' : language === 'ENG' ? 'Share' : '分享'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {/* 댓글 섹션 (펼침) */}
      {showComments && (
        <div className="border-t border-gray-200" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          {/* 댓글 목록 */}
          {feed.commentList && feed.commentList.length > 0 ? (
            <div className="px-3 py-2 max-h-64 overflow-y-auto">
              {feed.commentList.map((comment: FeedComment) => (
                <div key={comment.id} className="py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {comment.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-gray-800">{comment.username}</p>
                      <p className="text-sm text-gray-700 mt-0.5 break-words">{comment.content}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{getRelativeTime(comment.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-center">
              <p className="text-gray-500 text-sm">
                {language === 'KOR' ? '댓글이 없습니다' : language === 'ENG' ? 'No comments yet' : '还没有评论'}
              </p>
            </div>
          )}

          {/* 댓글 입력 */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommentText(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddComment()}
                placeholder={language === 'KOR' ? '댓글을 입력하세요...' : language === 'ENG' ? 'Write a comment...' : '输入评论...'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                disabled={isCommenting}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || isCommenting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {language === 'KOR' ? '전송' : language === 'ENG' ? 'Send' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <LoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}
    </div>
  );
};

export default FeedCard;
