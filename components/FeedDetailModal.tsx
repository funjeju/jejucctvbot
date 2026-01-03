import React, { useState } from 'react';
import type { FeedPost, Place, FeedComment } from '../types';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

interface FeedDetailModalProps {
  feed: FeedPost;
  spots: Place[];
  language: 'KOR' | 'ENG' | 'CHN';
  onClose: () => void;
  onSpotClick?: (spotId: string) => void;
}

const translations = {
  KOR: {
    close: '닫기',
    location: '위치',
    nearbySpots: '주변 가볼만한 곳',
    distance: '미터',
    noNearbySpots: '주변 추천 장소가 없습니다',
    takenAt: '촬영',
    uploadedAt: '업로드',
    edit: '수정',
    delete: '삭제',
    deleteConfirm: '정말 삭제하시겠습니까?',
    addComment: '댓글 작성',
    commentPlaceholder: '댓글을 입력하세요...',
    send: '전송',
    noComments: '댓글이 없습니다',
  },
  ENG: {
    close: 'Close',
    location: 'Location',
    nearbySpots: 'Nearby Places',
    distance: 'm',
    noNearbySpots: 'No nearby recommendations',
    takenAt: 'Taken',
    uploadedAt: 'Uploaded',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this?',
    addComment: 'Add Comment',
    commentPlaceholder: 'Write a comment...',
    send: 'Send',
    noComments: 'No comments yet',
  },
  CHN: {
    close: '关闭',
    location: '位置',
    nearbySpots: '附近景点',
    distance: '米',
    noNearbySpots: '没有附近推荐',
    takenAt: '拍摄',
    uploadedAt: '上传',
    edit: '编辑',
    delete: '删除',
    deleteConfirm: '确定要删除吗？',
    addComment: '添加评论',
    commentPlaceholder: '写评论...',
    send: '发送',
    noComments: '还没有评论',
  },
};

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({ feed, spots, language, onClose, onSpotClick }) => {
  const { user } = useAuth();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isBusinessInfoModalOpen, setIsBusinessInfoModalOpen] = useState(false);
  const t = translations[language];

  // 데모용: 예약/특가 시스템 여부 (나중에 feed 데이터에서 가져올 것)
  const hasReservationSystem = true; // 데모용
  const hasSpecialOffer = true; // 데모용

  // CTA 버튼 개수 계산
  const buttonCount = 2 + (hasReservationSystem ? 1 : 0) + (hasSpecialOffer ? 1 : 0);
  const gridColsClass = buttonCount === 2 ? 'grid-cols-2' : buttonCount === 3 ? 'grid-cols-3' : 'grid-cols-4';

  const isLiked = user ? (feed.likedBy?.includes(user.uid) || false) : false;
  const isBookmarked = user ? (feed.bookmarkedBy?.includes(user.uid) || false) : false;
  const isOwner = user ? (feed.userId === user.uid) : false;

  // 좋아요 토글
  const handleLike = async () => {
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
        await updateDoc(feedRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
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

  // 찜 토글
  const handleBookmark = async () => {
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
        await updateDoc(feedRef, {
          bookmarks: increment(-1),
          bookmarkedBy: arrayRemove(user.uid)
        });
      } else {
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
      const newComment: FeedComment = {
        id: `comment_${Date.now()}`,
        userId: user.uid,
        username: user.displayName || user.email || '사용자',
        content: commentText.trim(),
        timestamp: Timestamp.now() as any
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

  // 삭제
  const handleDelete = async () => {
    if (!isOwner) return;
    if (!confirm(t.deleteConfirm)) return;

    try {
      await deleteDoc(doc(db, 'feeds', feed.id));
      onClose();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  const currentMedia = feed.media[currentMediaIndex];

  // 이전 미디어
  const handlePrevMedia = () => {
    setCurrentMediaIndex(prev => (prev > 0 ? prev - 1 : feed.media.length - 1));
  };

  // 다음 미디어
  const handleNextMedia = () => {
    setCurrentMediaIndex(prev => (prev < feed.media.length - 1 ? prev + 1 : 0));
  };

  // 시간 표시
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
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen flex items-start justify-center p-0 lg:p-4 lg:py-8">
        <div className="w-full h-full lg:h-auto lg:max-w-6xl bg-black lg:rounded-lg overflow-hidden flex flex-col lg:flex-row" onClick={(e) => e.stopPropagation()}>
          {/* 왼쪽: 미디어 */}
          <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-y-auto">
            {/* 미디어 표시 */}
            {currentMedia && (
              <>
                <div className="relative w-full flex-shrink-0 flex items-center justify-center">
                  {currentMedia.type === 'image' ? (
                    <img
                      src={currentMedia.url}
                      alt="Feed media"
                      className="max-w-full max-h-full object-contain"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        setIsLandscape(img.naturalWidth > img.naturalHeight);
                      }}
                    />
                  ) : (
                    <video
                      src={currentMedia.url}
                      controls
                      className="max-w-full max-h-full object-contain"
                      autoPlay
                      onLoadedMetadata={(e) => {
                        const video = e.target as HTMLVideoElement;
                        setIsLandscape(video.videoWidth > video.videoHeight);
                      }}
                    />
                  )}
                </div>

                {/* EXIF 정보 (세로 이미지일 때 사진 아래 배치 - 모바일) */}
                {currentMedia.exif && !isLandscape && (
                  <div className="w-full bg-gray-900 text-white p-3 space-y-2 text-xs overflow-y-auto lg:hidden">
                    {/* 촬영 날짜/시간 + 업로드 시간 (한 줄) */}
                    {currentMedia.exif.dateTime && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="opacity-70">{t.takenAt}</span>
                          <span className="font-medium">{currentMedia.exif.dateTime}</span>
                        </div>
                        <span className="opacity-50">•</span>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="opacity-70">{t.uploadedAt}</span>
                          <span className="font-medium">{getRelativeTime(feed.timestamp)}</span>
                        </div>
                      </div>
                    )}

                    {/* 위치 */}
                    {currentMedia.exif.location && (
                      <button className="w-full flex items-center gap-2 bg-indigo-600 bg-opacity-50 hover:bg-opacity-70 px-3 py-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-left flex-1 line-clamp-1">{currentMedia.exif.location}</span>
                      </button>
                    )}

                    {/* 카메라 정보 + 촬영 설정 (한 줄) */}
                    {currentMedia.exif.camera && currentMedia.exif.camera !== 'Unknown' && (
                      <div className="flex items-center gap-2 flex-wrap opacity-90">
                        <div className="flex items-center gap-1.5">
                          <span>📷</span>
                          <span className="font-medium">{currentMedia.exif.camera}</span>
                        </div>
                        {(currentMedia.exif.fNumber || currentMedia.exif.iso || currentMedia.exif.exposureTime || currentMedia.exif.focalLength) && (
                          <>
                            <span className="opacity-50">•</span>
                            <div className="flex flex-wrap gap-2">
                              {currentMedia.exif.focalLength && <span>{currentMedia.exif.focalLength}</span>}
                              {currentMedia.exif.fNumber && <span>{currentMedia.exif.fNumber}</span>}
                              {currentMedia.exif.exposureTime && <span>{currentMedia.exif.exposureTime}</span>}
                              {currentMedia.exif.iso && <span>ISO {currentMedia.exif.iso}</span>}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PC에서 가로 이미지일 때 EXIF 오버레이 */}
                {currentMedia.exif && isLandscape && (
                  <div className="hidden lg:block absolute bottom-4 left-4 right-4 top-auto bg-black bg-opacity-50 text-white rounded-lg p-3 space-y-2 text-xs max-h-[40vh] overflow-y-auto">
                    {/* 촬영 날짜/시간 + 업로드 시간 (한 줄) */}
                    {currentMedia.exif.dateTime && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="opacity-70">{t.takenAt}</span>
                          <span className="font-medium">{currentMedia.exif.dateTime}</span>
                        </div>
                        <span className="opacity-50">•</span>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="opacity-70">{t.uploadedAt}</span>
                          <span className="font-medium">{getRelativeTime(feed.timestamp)}</span>
                        </div>
                      </div>
                    )}

                    {/* 위치 */}
                    {currentMedia.exif.location && (
                      <button className="w-full flex items-center gap-2 bg-indigo-600 bg-opacity-50 hover:bg-opacity-70 px-3 py-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-left flex-1 line-clamp-1">{currentMedia.exif.location}</span>
                      </button>
                    )}

                    {/* 카메라 정보 + 촬영 설정 (한 줄) */}
                    {currentMedia.exif.camera && currentMedia.exif.camera !== 'Unknown' && (
                      <div className="flex items-center gap-2 flex-wrap opacity-90">
                        <div className="flex items-center gap-1.5">
                          <span>📷</span>
                          <span className="font-medium">{currentMedia.exif.camera}</span>
                        </div>
                        {(currentMedia.exif.fNumber || currentMedia.exif.iso || currentMedia.exif.exposureTime || currentMedia.exif.focalLength) && (
                          <>
                            <span className="opacity-50">•</span>
                            <div className="flex flex-wrap gap-2">
                              {currentMedia.exif.focalLength && <span>{currentMedia.exif.focalLength}</span>}
                              {currentMedia.exif.fNumber && <span>{currentMedia.exif.fNumber}</span>}
                              {currentMedia.exif.exposureTime && <span>{currentMedia.exif.exposureTime}</span>}
                              {currentMedia.exif.iso && <span>ISO {currentMedia.exif.iso}</span>}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 이전/다음 버튼 (미디어가 여러 개일 때) */}
            {feed.media.length > 1 && (
              <>
                <button
                  onClick={handlePrevMedia}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextMedia}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 미디어 인디케이터 */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {currentMediaIndex + 1} / {feed.media.length}
                </div>
              </>
            )}

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 모바일: 사용자 정보 + 좋아요/댓글 */}
            <div className="lg:hidden w-full bg-white">
              {/* 사용자 정보 */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {feed.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{feed.username}</p>
                      <p className="text-xs text-gray-500">{getRelativeTime(feed.timestamp)}</p>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={handleDelete}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      {t.delete}
                    </button>
                  )}
                </div>
              </div>

              {/* 내용 */}
              {feed.content && (
                <div className="p-4 border-b border-gray-200">
                  <p className="text-gray-800 whitespace-pre-wrap">{feed.content}</p>
                </div>
              )}

              {/* 좋아요 & 찜 & 댓글 */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                      }`}
                  >
                    <svg className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="font-semibold">{feed.likes || 0}</span>
                  </button>
                  <button
                    onClick={handleBookmark}
                    disabled={isBookmarking}
                    className={`flex items-center gap-2 transition-colors ${isBookmarked ? 'text-yellow-600' : 'text-gray-600 hover:text-yellow-600'
                      }`}
                  >
                    <svg className="w-6 h-6" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="font-semibold">{feed.bookmarks || 0}</span>
                  </button>
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="font-semibold">{feed.commentList?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* 댓글 목록 */}
              <div className="max-h-64 overflow-y-auto border-b border-gray-200">
                {feed.commentList && feed.commentList.length > 0 ? (
                  feed.commentList.map((comment) => (
                    <div key={comment.id} className="p-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {comment.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800">{comment.username}</p>
                          <p className="text-sm text-gray-700 mt-1 break-words">{comment.content}</p>
                          <p className="text-xs text-gray-500 mt-1">{getRelativeTime(comment.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 text-sm">{t.noComments}</p>
                  </div>
                )}
              </div>

              {/* 댓글 입력 */}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t.commentPlaceholder}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={isCommenting || !commentText.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {t.send}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 정보 (PC에서만) */}
          <div className="hidden lg:block w-96 bg-white overflow-y-auto">
            {/* 사용자 정보 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    {feed.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{feed.username}</p>
                    <p className="text-xs text-gray-500">{getRelativeTime(feed.timestamp)}</p>
                  </div>
                </div>
                {/* 수정/삭제 버튼 (작성자만) */}
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                    >
                      {t.delete}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 내용 */}
            {feed.content && (
              <div className="p-4 border-b border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{feed.content}</p>
              </div>
            )}

            {/* 좋아요 & 찜 & 댓글 */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-4">
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                  }`}
              >
                <svg className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="font-medium">{feed.likes || 0}</span>
              </button>
              <button
                onClick={handleBookmark}
                disabled={isBookmarking}
                className={`flex items-center gap-2 transition-colors ${isBookmarked ? 'text-yellow-600' : 'text-gray-600 hover:text-yellow-600'
                  }`}
              >
                <svg className="w-6 h-6" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="font-medium">{feed.bookmarks || 0}</span>
              </button>
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="font-medium">{feed.commentList?.length || 0}</span>
              </div>
            </div>

            {/* 댓글 섹션 */}
            <div className="flex-1 overflow-y-auto">
              {/* 댓글 목록 */}
              <div className="p-4 space-y-3">
                {(!feed.commentList || feed.commentList.length === 0) ? (
                  <p className="text-gray-500 text-sm text-center py-8">{t.noComments}</p>
                ) : (
                  feed.commentList.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {comment.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="font-semibold text-sm text-gray-800">{comment.username}</p>
                          <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{getRelativeTime(comment.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 댓글 입력 */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder={t.commentPlaceholder}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  disabled={isCommenting}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isCommenting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {t.send}
                </button>
              </div>
            </div>

            {/* CTA 버튼 섹션 */}
            <div className="p-4 border-t border-gray-200">
              <div className={`grid ${gridColsClass} gap-3`}>
                {/* 1. 위치보기 (기본) */}
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 py-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-700">위치보기</span>
                </button>

                {/* 2. 업체정보 (기본) */}
                <button
                  onClick={() => setIsBusinessInfoModalOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">업체정보</span>
                </button>

                {/* 3. 바로예약 (옵션) */}
                {hasReservationSystem && (
                  <button
                    onClick={() => alert('예약 페이지로 이동 (데모)')}
                    className="flex flex-col items-center justify-center gap-2 py-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-green-700">바로예약</span>
                  </button>
                )}

                {/* 4. 특가할인 (옵션) */}
                {hasSpecialOffer && (
                  <button
                    onClick={() => alert('특가상품 페이지로 이동 (데모)')}
                    className="flex flex-col items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-red-700">특가할인</span>
                  </button>
                )}
              </div>
            </div>

            {/* 주변 추천 장소 */}
            {feed.nearbySpots && feed.nearbySpots.length > 0 && (
              <div className="p-4">
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-bold text-orange-800">{t.nearbySpots}</h3>
                  </div>
                  <div className="space-y-2">
                    {feed.nearbySpots.map((spot) => (
                      <button
                        key={spot.id}
                        onClick={() => onSpotClick?.(spot.id)}
                        className="w-full flex items-center gap-3 bg-white rounded-lg p-3 hover:bg-orange-50 transition-colors text-left border border-orange-100 hover:border-orange-300"
                      >
                        {/* 썸네일 */}
                        {spot.thumbnailUrl ? (
                          <img
                            src={spot.thumbnailUrl}
                            alt={spot.title}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 line-clamp-1">{spot.title}</p>
                          <p className="text-sm text-orange-600">
                            {spot.distance < 1000
                              ? `${Math.round(spot.distance)}m`
                              : `${(spot.distance / 1000).toFixed(1)}km`}{' '}
                            {language === 'KOR' ? '거리' : language === 'ENG' ? 'away' : '距离'}
                          </p>
                        </div>
                        <svg className="w-6 h-6 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

export default FeedDetailModal;
