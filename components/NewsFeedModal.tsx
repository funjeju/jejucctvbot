import React, { useState } from 'react';
import type { NewsItem, Place } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface NewsFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  news: NewsItem[];
  spots: Place[];
  onAddNews: () => void;
  onEditNews: (newsItem: NewsItem) => void;
  onDeleteNews: (newsId: string) => void;
  onNewsClick?: (newsItem: NewsItem) => void;
}

const NewsFeedModal: React.FC<NewsFeedModalProps> = ({
  isOpen,
  onClose,
  news,
  spots,
  onAddNews,
  onEditNews,
  onDeleteNews,
  onNewsClick
}) => {
  const [filterType, setFilterType] = useState<NewsItem['type'] | 'all'>('all');

  const filteredNews = filterType === 'all'
    ? news
    : news.filter(item => item.type === filterType);

  const formatDate = (timestamp?: { seconds: number } | null) => {
    if (!timestamp || !timestamp.seconds) {
      return new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getRelatedSpotNames = (spotIds: string[]) => {
    return spotIds
      .map(id => spots.find(s => s.place_id === id)?.place_name)
      .filter(Boolean)
      .join(', ');
  };

  const handleDelete = (newsId: string, title: string) => {
    if (confirm(`"${title}" 소식을 삭제하시겠습니까?`)) {
      onDeleteNews(newsId);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📰 제주 최신 소식" maxWidth="4xl">
      <div className="space-y-4">
        {/* 상단 버튼 및 필터 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">필터:</label>
            <select
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as NewsItem['type'] | 'all')}
            >
              <option value="all">전체</option>
              <option value="new_spot">🆕 새로운 스팟</option>
              <option value="update">📝 업데이트</option>
              <option value="seasonal">🌸 계절 정보</option>
              <option value="event">🎉 이벤트/축제</option>
              <option value="trending">🔥 트렌드</option>
              <option value="closure">🚫 폐업/휴업</option>
              <option value="menu_change">🍽️ 메뉴 변경</option>
              <option value="price_change">💰 가격 변경</option>
            </select>
          </div>
          <Button onClick={onAddNews} size="normal">
            ➕ 새 소식 작성
          </Button>
        </div>

        {/* 뉴스 피드 */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredNews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">📭</p>
              <p>등록된 소식이 없습니다.</p>
              <Button onClick={onAddNews} className="mt-4" size="normal">
                첫 소식 작성하기
              </Button>
            </div>
          ) : (
            filteredNews.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.badge && (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(item.badge)}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.is_pinned && (
                      <span className="text-sm">📌</span>
                    )}
                    <span className="text-sm text-gray-500">
                      {formatTimeAgo(item.published_at)}
                    </span>
                    {item.expires_at && (
                      <span className="text-xs text-orange-600">
                        ⏰ {formatDate(item.expires_at)} 만료
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditNews(item)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* 내용 */}
                <div
                  onClick={() => onNewsClick && onNewsClick(item)}
                  className={`${onNewsClick ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex gap-4">
                    {item.thumbnail_url && (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {item.content}
                      </p>

                      {/* 관련 스팟 */}
                      {item.related_spot_ids.length > 0 && (
                        <div className="text-xs text-gray-500 mb-2">
                          📍 관련 스팟: {getRelatedSpotNames(item.related_spot_ids)}
                        </div>
                      )}

                      {/* 키워드 및 메타데이터 */}
                      <div className="flex flex-wrap gap-1">
                        {item.keywords?.slice(0, 5).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                          >
                            #{keyword}
                          </span>
                        ))}
                        {item.season && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {item.season}
                          </span>
                        )}
                        {item.month && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {item.month}
                          </span>
                        )}
                        {item.region && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            📍 {item.region}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 푸터 */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <div>
                    우선순위: {item.priority}/10 | 작성자: {item.author || 'Admin'}
                  </div>
                  <div>
                    {formatDate(item.published_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NewsFeedModal;
