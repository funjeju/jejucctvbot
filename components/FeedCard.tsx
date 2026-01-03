import React, { useState } from 'react';
import type { FeedPost, FeedComment } from '../types';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

// 말풍선 위치 CSS 클래스 헬퍼 함수
const getBubblePositionClass = (position: string) => {
  const positions: { [key: string]: string } = {
    'top-left': 'top-2 left-2',
    'top-center': 'top-2 left-1/2 -translate-x-1/2',
    'top-right': 'top-2 right-2',
    'top-left-2': 'top-[25%] left-2',
    'top-center-2': 'top-[25%] left-1/2 -translate-x-1/2',
    'top-right-2': 'top-[25%] right-2',
    'center-left': 'top-1/2 -translate-y-1/2 left-2',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'center-right': 'top-1/2 -translate-y-1/2 right-2',
    'bottom-left': 'bottom-[25%] left-2',
    'bottom-center': 'bottom-[25%] left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-[25%] right-2',
    'bottom-left-2': 'bottom-4 left-2',
    'bottom-center-2': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right-2': 'bottom-4 right-2',
  };
  return positions[position] || 'bottom-4 left-1/2 -translate-x-1/2';
};

// 말풍선 꼬리 위치 클래스
const getBubbleTailClass = (position: string) => {
  if (position.includes('top')) return '-bottom-2 left-1/2 -translate-x-1/2';
  if (position.includes('bottom')) return '-top-2 left-1/2 -translate-x-1/2';
  if (position.includes('left') && position.includes('center')) return 'top-1/2 -translate-y-1/2 -right-2';
  if (position.includes('right') && position.includes('center')) return 'top-1/2 -translate-y-1/2 -left-2';
  return '-bottom-2 left-1/2 -translate-x-1/2';
};

// 말풍선 꼬리 방향 (border)
const getBubbleTailBorderClass = (position: string) => {
  if (position.includes('top')) return 'border-t-8 border-t-white';
  if (position.includes('bottom')) return 'border-b-8 border-b-white';
  if (position.includes('left') && position.includes('center')) return 'border-l-8 border-l-white';
  if (position.includes('right') && position.includes('center')) return 'border-r-8 border-r-white';
  return 'border-t-8 border-t-white';
};

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
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isBusinessInfoModalOpen, setIsBusinessInfoModalOpen] = useState(false);

  // 데모용: 예약/특가 시스템 여부
  const hasReservationSystem = true; // 데모용
  const hasSpecialOffer = true; // 데모용

  // CTA 버튼 개수 계산
  const buttonCount = 2 + (hasReservationSystem ? 1 : 0) + (hasSpecialOffer ? 1 : 0);
  const gridColsClass = buttonCount === 2 ? 'grid-cols-2' : buttonCount === 3 ? 'grid-cols-3' : 'grid-cols-4';

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

  // 말풍선 정보 (실제 데이터 또는 데모)
  const photoComment = mainMedia?.bubbleText || "제주 바다가 정말 아름답네요!"; // 실제 데이터 우선, 없으면 데모
  const bubblePosition = mainMedia?.bubblePosition || 'bottom-center';
  const bubbleOpacity = mainMedia?.bubbleOpacity || 95;

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

          {/* 사진 코멘트 말풍선 */}
          {photoComment && (
            <div className={`absolute ${getBubblePositionClass(bubblePosition)} max-w-[85%] z-10`}>
              <div className="relative bg-white backdrop-blur-sm text-gray-900 px-4 py-2.5 rounded-2xl shadow-lg" style={{ opacity: bubbleOpacity / 100 }}>
                <p className="text-sm font-medium leading-snug text-center">
                  {photoComment}
                </p>
                {/* 말풍선 꼬리 */}
                <div className={`absolute ${getBubbleTailClass(bubblePosition)} w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent ${getBubbleTailBorderClass(bubblePosition)}`} style={{ opacity: bubbleOpacity / 100 }}></div>
              </div>
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

      {/* CTA 버튼 섹션 */}
      <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
        <div className={`grid ${gridColsClass} gap-2`}>
          {/* 1. 위치보기 (기본) */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-blue-700">위치보기</span>
          </button>

          {/* 2. 업체정보 (기본) */}
          <button
            onClick={() => setIsBusinessInfoModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
            </svg>
            <span className="text-xs font-semibold text-gray-700">업체정보</span>
          </button>

          {/* 3. 바로예약 (옵션) */}
          {hasReservationSystem && (
            <button
              onClick={() => alert('예약 페이지로 이동 (데모)')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-green-700">바로예약</span>
            </button>
          )}

          {/* 4. 특가할인 (옵션) */}
          {hasSpecialOffer && (
            <button
              onClick={() => alert('특가상품 페이지로 이동 (데모)')}
              className="flex flex-col items-center justify-center gap-1.5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-red-700">특가할인</span>
            </button>
          )}
        </div>
      </div>

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

      {/* 위치보기 모달 */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setIsLocationModalOpen(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">위치 정보</h3>
                <button
                  onClick={() => setIsLocationModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 지도 영역 (데모) */}
              <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center mb-4">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-gray-500">지도 API 연동 예정</p>
                </div>
              </div>

              {/* 상세 주소 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">상세 주소</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border">제주특별자치도 제주시 애월읍 (데모 주소)</p>
              </div>

              {/* 네비게이션 바로가기 버튼 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => alert('카카오맵 네비 실행 (데모)')}
                  className="flex items-center justify-center gap-2 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  카카오맵
                </button>
                <button
                  onClick={() => alert('네이버맵 네비 실행 (데모)')}
                  className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  네이버맵
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 업체정보 모달 */}
      {isBusinessInfoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setIsBusinessInfoModalOpen(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">업체 정보</h3>
                <button
                  onClick={() => setIsBusinessInfoModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 업체 기본 정보 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">업체명</label>
                  <p className="text-gray-900 font-semibold">제주 맛집 (데모)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                  <a href="tel:064-123-4567" className="text-blue-600 hover:underline">064-123-4567</a>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">영업시간</label>
                  <p className="text-gray-900">매일 10:00 - 22:00</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">휴무일</label>
                  <p className="text-gray-900">연중무휴</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">소개</label>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    제주도 현지인이 사랑하는 맛집입니다. 신선한 제주 식재료를 사용하여 정성스럽게 요리합니다. (데모 설명)
                  </p>
                </div>

                {/* 네이버플레이스 링크 */}
                <button
                  onClick={() => alert('네이버플레이스로 이동 (데모)')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                  </svg>
                  네이버플레이스에서 더보기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedCard;
