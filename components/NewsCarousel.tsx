import React, { useState } from 'react';
import type { NewsItem } from '../types';

interface NewsCarouselProps {
  news: NewsItem[];
  onNewsClick?: (newsItem: NewsItem) => void;
  onViewAll?: () => void;
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({ news, onNewsClick, onViewAll }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (news.length === 0) {
    return null;
  }

  // 최대 5개만 표시
  const displayNews = news.slice(0, 5);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayNews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === displayNews.length - 1 ? 0 : prev + 1));
  };

  const formatTimeAgo = (timestamp?: { seconds: number } | null) => {
    if (!timestamp || !timestamp.seconds) {
      return '방금 전';
    }

    const now = Date.now() / 1000;
    const diff = now - timestamp.seconds;

    if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes}분 전`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}시간 전`;
    } else {
      const days = Math.floor(diff / 86400);
      return `${days}일 전`;
    }
  };

  const getBadgeColor = (badge?: NewsItem['badge']) => {
    const colorMap: Record<string, string> = {
      '신규': 'bg-blue-100 text-blue-800',
      '인기': 'bg-red-100 text-red-800',
      '계절한정': 'bg-green-100 text-green-800',
      '마감임박': 'bg-orange-100 text-orange-800',
      '핫플': 'bg-pink-100 text-pink-800',
      '개화중': 'bg-purple-100 text-purple-800',
      '폐업': 'bg-gray-100 text-gray-800',
      '휴업': 'bg-yellow-100 text-yellow-800',
    };
    return badge ? colorMap[badge] || 'bg-gray-100 text-gray-800' : '';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">🔥 최신 소식</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            전체보기 →
          </button>
        )}
      </div>

      <div className="relative">
        {/* 캐러셀 */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {displayNews.map((item) => (
              <div
                key={item.id}
                className="min-w-full px-2"
              >
                <div
                  onClick={() => onNewsClick && onNewsClick(item)}
                  className={`bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-lg p-4 ${
                    onNewsClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* 썸네일 */}
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">📰</span>
                      </div>
                    )}

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.badge && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getBadgeColor(item.badge)}`}>
                            {item.badge}
                          </span>
                        )}
                        {item.is_pinned && (
                          <span className="text-xs">📌</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(item.published_at)}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1 line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {item.content}
                      </p>
                      {item.keywords && item.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.keywords.slice(0, 3).map((keyword, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded"
                            >
                              #{keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 네비게이션 버튼 */}
        {displayNews.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="이전"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="다음"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* 인디케이터 */}
        {displayNews.length > 1 && (
          <div className="flex justify-center mt-3 space-x-2">
            {displayNews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-indigo-600 w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`${idx + 1}번째 소식으로 이동`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsCarousel;
