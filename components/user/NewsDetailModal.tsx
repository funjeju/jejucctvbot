import React, { useState } from 'react';
import type { NewsItem, Place } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface NewsDetailModalProps {
  news: NewsItem;
  relatedSpots: Place[];
  onClose: () => void;
  onEdit?: (news: NewsItem) => void;
}

const NewsDetailModal: React.FC<NewsDetailModalProps> = ({ news, relatedSpots, onClose, onEdit }) => {
  const { currentUser } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? news.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === news.images.length - 1 ? 0 : prev + 1));
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!window.confirm('정말 이 소식을 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'news', news.id));
      alert('소식이 삭제되었습니다.');
      onClose();
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 수정 핸들러
  const handleEdit = () => {
    if (onEdit) {
      onEdit(news);
      onClose();
    }
  };

  // 현재 사용자가 작성자인지 확인
  const isAuthor = currentUser && news.author_uid === currentUser.uid;

  const getTypeLabel = (type: NewsItem['type']) => {
    switch (type) {
      case 'new_spot':
        return { label: '신규', icon: '✨', color: 'bg-purple-500' };
      case 'trending':
        return { label: '인기', icon: '🔥', color: 'bg-orange-500' };
      case 'seasonal':
        return { label: '계절', icon: '🌸', color: 'bg-green-500' };
      case 'event':
        return { label: '이벤트', icon: '🎉', color: 'bg-blue-500' };
      default:
        return { label: '소식', icon: '📰', color: 'bg-gray-500' };
    }
  };

  const typeInfo = getTypeLabel(news.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <span className={`${typeInfo.color} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
              {typeInfo.icon} {typeInfo.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {/* 이미지 갤러리 */}
          {news.images.length > 0 && (
            <div className="relative bg-gray-100">
              <img
                src={news.images[currentImageIndex]}
                alt={`${news.title} - ${currentImageIndex + 1}`}
                className="w-full h-96 object-cover"
              />

              {/* 이미지 네비게이션 */}
              {news.images.length > 1 && (
                <>
                  {/* 이전 버튼 */}
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* 다음 버튼 */}
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* 이미지 인디케이터 */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {news.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? 'bg-white w-6'
                            : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                        }`}
                      />
                    ))}
                  </div>

                  {/* 이미지 카운터 */}
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {news.images.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 썸네일 그리드 (이미지가 2개 이상일 때) */}
          {news.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 p-4 bg-gray-50 border-b">
              {news.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden ${
                    index === currentImageIndex ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover hover:opacity-75 transition-opacity"
                  />
                </button>
              ))}
            </div>
          )}

          {/* 텍스트 컨텐츠 */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{news.title}</h2>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-6">
              {news.content}
            </div>

            {/* 관련 스팟 */}
            {relatedSpots.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📍 관련 장소</h3>
                <div className="space-y-2">
                  {relatedSpots.map((spot) => (
                    <div
                      key={spot.place_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {spot.thumbnail_url && (
                        <img
                          src={spot.thumbnail_url}
                          alt={spot.place_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{spot.place_name}</p>
                        {spot.address && (
                          <p className="text-sm text-gray-500">{spot.address}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 작성일 */}
            {news.created_at && (
              <div className="mt-6 pt-4 border-t text-sm text-gray-500">
                {new Date(news.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          {/* 작성자 정보 */}
          <div className="text-sm text-gray-500">
            {news.author_email && (
              <span>작성자: {news.author_email.split('@')[0]}</span>
            )}
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            {isAuthor && (
              <>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  ✏️ 수정
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? '삭제 중...' : '🗑️ 삭제'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsDetailModal;
