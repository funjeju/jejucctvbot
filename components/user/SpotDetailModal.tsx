import React, { useState } from 'react';
import type { Place, NewsItem } from '../../types';

interface SpotDetailModalProps {
  spot: Place;
  relatedNews: NewsItem[];
  onClose: () => void;
}

const SpotDetailModal: React.FC<SpotDetailModalProps> = ({ spot, relatedNews, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllNews, setShowAllNews] = useState(false);
  const [currentImagePage, setCurrentImagePage] = useState(0);

  // 이미지를 최신순으로 정렬 (uploaded_at이 있는 것 우선, 최신순)
  const sortedImages = spot.images ? [...spot.images].sort((a, b) => {
    if (!a.uploaded_at && !b.uploaded_at) return 0;
    if (!a.uploaded_at) return 1;
    if (!b.uploaded_at) return -1;
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  }) : [];

  const imagesPerPage = 6;
  const totalPages = Math.ceil(sortedImages.length / imagesPerPage);
  const currentPageImages = sortedImages.slice(
    currentImagePage * imagesPerPage,
    (currentImagePage + 1) * imagesPerPage
  );
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 모달 콘텐츠 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="sticky top-4 right-4 float-right z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 이미지 갤러리 */}
          {sortedImages.length > 0 && (
            <div>
              <div className="relative h-80 bg-gray-200">
                <img
                  src={sortedImages[currentImageIndex].url}
                  alt={spot.place_name}
                  className="w-full h-full object-cover"
                />

                {/* 이미지 네비게이션 */}
                {sortedImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? sortedImages.length - 1 : prev - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev === sortedImages.length - 1 ? 0 : prev + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* 이미지 날짜 표시 */}
                {sortedImages[currentImageIndex].uploaded_at && (
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1.5 rounded-lg text-sm">
                    📅 {new Date(sortedImages[currentImageIndex].uploaded_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} 추가
                  </div>
                )}

                {/* 이미지 카운터 */}
                {sortedImages.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {sortedImages.length}
                  </div>
                )}
              </div>

              {/* 썸네일 그리드 (페이지네이션 포함) */}
              {sortedImages.length > 1 && (
                <div className="bg-gray-50 p-3">
                  <div className="grid grid-cols-6 gap-2">
                    {currentPageImages.map((image, relativeIndex) => {
                      const absoluteIndex = currentImagePage * imagesPerPage + relativeIndex;
                      return (
                        <button
                          key={absoluteIndex}
                          onClick={() => setCurrentImageIndex(absoluteIndex)}
                          className={`relative aspect-square rounded-lg overflow-hidden ${
                            absoluteIndex === currentImageIndex ? 'ring-2 ring-indigo-500' : ''
                          }`}
                        >
                          <img
                            src={image.url}
                            alt={`${spot.place_name} ${absoluteIndex + 1}`}
                            className="w-full h-full object-cover hover:opacity-75 transition-opacity"
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* 페이지네이션 버튼 */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-3">
                      <button
                        onClick={() => setCurrentImagePage(prev => Math.max(0, prev - 1))}
                        disabled={currentImagePage === 0}
                        className="px-3 py-1 bg-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ←
                      </button>
                      <span className="text-sm text-gray-600">
                        {currentImagePage + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentImagePage(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={currentImagePage === totalPages - 1}
                        className="px-3 py-1 bg-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-6">
            {/* 카테고리 태그 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {spot.categories.map((category) => (
                <span
                  key={category}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-full"
                >
                  {category}
                </span>
              ))}
            </div>

            {/* 스팟 이름 */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {spot.place_name}
            </h2>

            {/* 위치 정보 */}
            {(spot.region || spot.address) && (
              <div className="flex items-center space-x-2 text-gray-600 mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{spot.region}</span>
                {spot.address && <span className="text-sm">• {spot.address}</span>}
              </div>
            )}

            {/* 최신 업데이트 */}
            {spot.latest_updates && spot.latest_updates.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">📢</span>
                    최신 업데이트
                  </h3>
                  <span className="text-sm text-gray-500">{spot.latest_updates.length}개</span>
                </div>
                <div className="space-y-3">
                  {spot.latest_updates.slice(0, 3).map((update, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-500 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg">
                          {update.category === 'new_spot' ? '✨' :
                           update.category === 'trending' ? '🔥' :
                           update.category === 'seasonal' ? '🌸' :
                           update.category === 'event' ? '🎉' : '📢'}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-indigo-900">{update.title}</p>
                            <span className="text-xs text-indigo-600">
                              {update.updated_at && update.updated_at.seconds
                                ? new Date(update.updated_at.seconds * 1000).toLocaleDateString('ko-KR')
                                : '최근'}
                            </span>
                          </div>
                          <p className="text-sm text-indigo-800 leading-relaxed">{update.content}</p>
                        </div>
                      </div>

                      {/* 업데이트 이미지들 */}
                      {update.images && update.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {update.images.slice(0, 4).map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`${update.title} ${idx + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 최신 소식 */}
            {relatedNews.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">📰</span>
                    최신 소식
                  </h3>
                  <span className="text-sm text-gray-500">{relatedNews.length}개</span>
                </div>
                <div className="space-y-3">
                  {(showAllNews ? relatedNews : relatedNews.slice(0, 3)).map((news) => (
                    <div
                      key={news.id}
                      className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-400 rounded-lg hover:shadow-md transition-shadow"
                    >
                      {/* 뉴스 이미지 (있으면) */}
                      {news.thumbnail && (
                        <img
                          src={news.thumbnail}
                          alt={news.title}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}

                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg">
                          {news.type === 'new_spot' ? '✨' :
                           news.type === 'trending' ? '🔥' :
                           news.type === 'seasonal' ? '🌸' :
                           news.type === 'event' ? '🎉' : '📰'}
                        </span>
                        <div className="flex-1">
                          <p className="font-bold text-orange-900 mb-1">{news.title}</p>
                          <p className="text-sm text-orange-800 leading-relaxed">{news.content}</p>
                          {news.created_at && (
                            <p className="text-xs text-orange-600 mt-2">
                              {new Date(news.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 뉴스 이미지들 (여러 개인 경우) */}
                      {news.images && news.images.length > 1 && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {news.images.slice(0, 4).map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`${news.title} ${idx + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 더보기/접기 버튼 */}
                {relatedNews.length > 3 && (
                  <button
                    onClick={() => setShowAllNews(!showAllNews)}
                    className="mt-3 w-full py-2 text-sm text-orange-700 hover:text-orange-800 font-semibold"
                  >
                    {showAllNews ? '접기 ▲' : `${relatedNews.length - 3}개 더보기 ▼`}
                  </button>
                )}
              </div>
            )}

            {/* 전문가 팁 */}
            {spot.expert_tip_final && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">💡</span>
                  전문가 팁
                </h3>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {spot.expert_tip_final}
                </p>
              </div>
            )}

            {/* AI 생성 설명 */}
            {spot.ai_generated_description && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-3">소개</h3>
                <p className="text-gray-700 leading-relaxed">
                  {spot.ai_generated_description}
                </p>
              </div>
            )}

            {/* 공공 정보 */}
            {spot.public_info && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-3">정보</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {spot.public_info.hours && (
                    <div className="flex items-start">
                      <span className="font-semibold text-gray-600 w-20">운영시간:</span>
                      <span className="text-gray-800">{spot.public_info.hours}</span>
                    </div>
                  )}
                  {spot.public_info.phone && (
                    <div className="flex items-start">
                      <span className="font-semibold text-gray-600 w-20">전화:</span>
                      <a href={`tel:${spot.public_info.phone}`} className="text-blue-600 hover:underline">
                        {spot.public_info.phone}
                      </a>
                    </div>
                  )}
                  {spot.public_info.website && (
                    <div className="flex items-start col-span-2">
                      <span className="font-semibold text-gray-600 w-20">웹사이트:</span>
                      <a
                        href={spot.public_info.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {spot.public_info.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 태그 */}
            {spot.tags && spot.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-3">태그</h3>
                <div className="flex flex-wrap gap-2">
                  {spot.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="mt-8 pt-6 border-t">
              <button
                onClick={onClose}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpotDetailModal;
