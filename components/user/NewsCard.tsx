import React from 'react';
import type { NewsItem, Place } from '../../types';

interface NewsCardProps {
  news: NewsItem;
  relatedSpots: Place[];
  onClick: (news: NewsItem) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ news, relatedSpots, onClick }) => {
  // 시간 포맷팅
  const formatTimeAgo = (timestamp?: { seconds: number } | null) => {
    if (!timestamp || !timestamp.seconds) {
      return '방금 전';
    }

    const now = Date.now() / 1000;
    const diff = now - timestamp.seconds;

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return new Date(timestamp.seconds * 1000).toLocaleDateString('ko-KR');
  };

  // 뉴스 타입별 아이콘
  const getTypeIcon = (type: NewsItem['type']) => {
    const icons = {
      new_spot: '✨',
      update: '🔄',
      closure: '🚫',
      seasonal: '🌸',
      event: '🎉',
      trending: '🔥',
      menu_change: '🍽️',
      price_change: '💰',
    };
    return icons[type] || '📰';
  };

  // 배지 색상
  const getBadgeColor = (badge?: NewsItem['badge']) => {
    const colors = {
      '신규': 'bg-blue-100 text-blue-800',
      '인기': 'bg-red-100 text-red-800',
      '계절한정': 'bg-green-100 text-green-800',
      '마감임박': 'bg-orange-100 text-orange-800',
      '핫플': 'bg-pink-100 text-pink-800',
      '개화중': 'bg-purple-100 text-purple-800',
      '폐업': 'bg-gray-100 text-gray-800',
      '휴업': 'bg-yellow-100 text-yellow-800',
    };
    return badge ? colors[badge] : '';
  };

  // 내용 20자로 제한
  const truncatedContent = news.content.length > 20
    ? news.content.substring(0, 20) + '...'
    : news.content;

  return (
    <div
      onClick={() => onClick(news)}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden cursor-pointer transform hover:scale-[1.02]"
    >
      {/* 썸네일 이미지 + 오버레이 텍스트 */}
      <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
        {/* 썸네일 이미지 (첫 번째 이미지 또는 thumbnail) */}
        {(news.thumbnail || news.images?.[0] || news.thumbnail_url) && (
          <img
            src={news.thumbnail || news.images?.[0] || news.thumbnail_url}
            alt={news.title}
            className="w-full h-full object-cover"
          />
        )}

        {/* 어두운 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* 타입 배지 */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold text-gray-800 shadow-lg">
            {getTypeIcon(news.type)} {news.type === 'new_spot' ? '신규' : news.type === 'trending' ? '인기' : news.type === 'seasonal' ? '계절' : news.type === 'event' ? '이벤트' : '소식'}
          </span>
        </div>

        {/* 이미지 개수 표시 (2개 이상일 때) */}
        {news.images && news.images.length > 1 && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg">
              📷 {news.images.length}
            </span>
          </div>
        )}

        {/* 텍스트 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          {/* 제목 */}
          <h3 className="font-bold text-xl mb-2 line-clamp-2 drop-shadow-lg">
            {news.title}
          </h3>

          {/* 내용 (20자) */}
          <p className="text-sm text-gray-100 drop-shadow-md">
            {truncatedContent}
          </p>

          {/* 메타 정보 */}
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-200">
            {news.created_at && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(news.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {relatedSpots.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {relatedSpots[0].place_name}
                  {relatedSpots.length > 1 && ` 외 ${relatedSpots.length - 1}`}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;
