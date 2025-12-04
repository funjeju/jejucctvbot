import React, { useState } from 'react';
import type { NewsItem, Place } from '../../types';
import NewsCard from './NewsCard';
import NewsDetailModal from './NewsDetailModal';

interface NewsFeedProps {
  news: NewsItem[];
  spots: Place[];
  onNewsClick: (news: NewsItem) => void;
  onAddNewsClick: () => void;
  onEditNews: (news: NewsItem) => void;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news, spots, onNewsClick, onAddNewsClick, onEditNews }) => {
  const [filterType, setFilterType] = useState<NewsItem['type'] | 'all'>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // 필터링된 뉴스
  const filteredNews = filterType === 'all'
    ? news
    : news.filter(n => n.type === filterType);

  // 뉴스 타입별 필터 버튼
  const filterButtons = [
    { type: 'all' as const, label: '전체', icon: '🌟' },
    { type: 'new_spot' as const, label: '신규', icon: '✨' },
    { type: 'trending' as const, label: '인기', icon: '🔥' },
    { type: 'seasonal' as const, label: '계절', icon: '🌸' },
    { type: 'event' as const, label: '이벤트', icon: '🎉' },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
          📰 최신 소식
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {filteredNews.length}개의 소식
          </span>
          <button
            onClick={onAddNewsClick}
            className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center ring-2 ring-blue-200"
            title="최신 소식 등록"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* 필터 버튼 */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filterButtons.map((button) => (
          <button
            key={button.type}
            onClick={() => setFilterType(button.type)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-all duration-200
              ${filterType === button.type
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md scale-105'
                : 'bg-white text-gray-700 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300'
              }
            `}
          >
            <span className="mr-1.5">{button.icon}</span>
            {button.label}
          </button>
        ))}
      </div>

      {/* 뉴스 리스트 */}
      {filteredNews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 text-lg font-medium">아직 소식이 없습니다</p>
          <p className="text-gray-400 text-sm mt-2">새로운 소식이 곧 올라올 예정입니다!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((newsItem) => {
            // 관련 스팟 찾기
            const relatedSpots = spots.filter(s =>
              newsItem.related_spot_ids.includes(s.place_id)
            );

            return (
              <NewsCard
                key={newsItem.id}
                news={newsItem}
                relatedSpots={relatedSpots}
                onClick={(news) => setSelectedNews(news)}
              />
            );
          })}
        </div>
      )}

      {/* 무한 스크롤 로딩 표시 (향후 추가 가능) */}
      {/* {isLoadingMore && (
        <div className="text-center py-4">
          <Spinner />
        </div>
      )} */}

      {/* 뉴스 상세 모달 */}
      {selectedNews && (
        <NewsDetailModal
          news={selectedNews}
          relatedSpots={spots.filter(s =>
            selectedNews.related_spot_ids.includes(s.place_id)
          )}
          onClose={() => setSelectedNews(null)}
          onEdit={onEditNews}
        />
      )}
    </div>
  );
};

export default NewsFeed;
