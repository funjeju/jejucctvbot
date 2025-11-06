import React, { useState } from 'react';
import type { Place, Suggestion, EditLog, NewsItem } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import SuggestionIcon from './SuggestionIcon';
import SuggestionPopover from './SuggestionPopover';
import { getValueByPath } from '../utils';


// --- SVG Icons (self-contained for simplicity) ---
const IconPin: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconClock: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconPhone: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const IconLink: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
const IconCalendarOff: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM9 14l6-6" /></svg>;

interface SpotDetailViewProps {
  spot: Place;
  relatedNews?: NewsItem[];
  onBack: () => void;
  onEdit: (spot: Place) => void;
  onAddSuggestion: (placeId: string, fieldPath: string, content: string) => void;
  onResolveSuggestion: (placeId: string, fieldPath: string, suggestionId: string, resolution: 'accepted' | 'rejected') => void;
}

const CommentableWrapper: React.FC<{
    children: React.ReactNode;
    spot: Place;
    fieldPath: string;
    onAddSuggestion: SpotDetailViewProps['onAddSuggestion'];
    onResolveSuggestion: SpotDetailViewProps['onResolveSuggestion'];
}> = ({ children, spot, fieldPath, onAddSuggestion, onResolveSuggestion }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const suggestions = spot.suggestions?.[fieldPath] || [];
    const hasPending = suggestions.some(s => s.status === 'pending');

    return (
        <div className="relative group">
            {children}
            <div className="absolute top-0 -right-8 opacity-40 group-hover:opacity-100 transition-opacity">
                <SuggestionIcon onClick={() => setPopoverOpen(true)} hasPending={hasPending} />
            </div>
            {popoverOpen && (
                 <SuggestionPopover
                    suggestions={suggestions}
                    onAdd={(content) => onAddSuggestion(spot.place_id, fieldPath, content)}
                    onResolve={(id, res) => onResolveSuggestion(spot.place_id, fieldPath, id, res)}
                    onClose={() => setPopoverOpen(false)}
                 />
            )}
        </div>
    );
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start text-sm text-gray-700">
      <span className="text-gray-400 mr-2 mt-0.5">{icon}</span>
      <span className="font-semibold mr-2">{label}:</span>
      <span className="flex-1">{value}</span>
    </div>
  );
};

const AttributeItem: React.FC<{ label: string; value: string | string[]; baseOption?: string }> = ({ label, value, baseOption }) => {
    const formatDisplayValue = () => {
        if (!Array.isArray(value) || value.length === 0) {
            return Array.isArray(value) ? '' : value;
        }

        if (baseOption) {
            const hasBase = value.includes(baseOption);
            const specialValues = value.filter(v => v !== baseOption);

            if (hasBase) {
                if (specialValues.length > 0) {
                    return `${baseOption} (특히 ${specialValues.join(', ')})`;
                }
                return baseOption;
            }
        }
        
        return value.join(', ');
    };
    
    const displayValue = formatDisplayValue();

    if (!displayValue) return null;
    
    return (
        <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-sm font-semibold text-gray-800">{displayValue}</p>
        </div>
    );
}

const SpotDetailView: React.FC<SpotDetailViewProps> = ({ spot, relatedNews = [], onBack, onEdit, onAddSuggestion, onResolveSuggestion }) => {
  const [currentImagePage, setCurrentImagePage] = useState(0);
  const commonCommentableProps = { spot, onAddSuggestion, onResolveSuggestion };

  // 이미지를 최신순으로 정렬 (uploaded_at이 있는 것 우선, 최신순)
  const sortedImages = spot.images ? [...spot.images].sort((a: any, b: any) => {
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <Button onClick={onBack} variant="secondary">&larr; 라이브러리로 돌아가기</Button>
        <Button onClick={() => onEdit(spot)}>수정하기</Button>
      </div>

      <Card className="space-y-8">
        {/* --- Image Gallery --- */}
        {sortedImages.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-gray-800">이미지 갤러리</h2>
              <span className="text-sm text-gray-500">총 {sortedImages.length}개</span>
            </div>
            <div className={`grid gap-4 ${currentPageImages.length > 1 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
              {currentPageImages.map((image: any, index) => (
                <figure key={index} className="space-y-2">
                  <img src={image.url} alt={image.caption || `Image ${index + 1}`} className="w-full h-48 object-cover rounded-lg shadow-md" />
                  {image.caption && <figcaption className="text-center text-sm text-gray-500">{image.caption}</figcaption>}
                  {image.uploaded_at && (
                    <p className="text-xs text-gray-400 text-center">
                      📅 {new Date(image.uploaded_at).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </figure>
              ))}
            </div>

            {/* 페이지네이션 버튼 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentImagePage(prev => Math.max(0, prev - 1))}
                  disabled={currentImagePage === 0}
                  className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ←
                </button>
                <span className="text-sm text-gray-600">
                  {currentImagePage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentImagePage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentImagePage === totalPages - 1}
                  className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- Header --- */}
        <header>
          <CommentableWrapper fieldPath="place_name" {...commonCommentableProps}>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{spot.place_name}</h1>
          </CommentableWrapper>
          <div className="mt-2 flex flex-wrap gap-2">
            {(spot.categories || []).map(cat => (
              <span key={cat} className="px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full">{cat}</span>
            ))}
          </div>
        </header>

        {/* --- Latest Updates Section --- */}
        {spot.latest_updates && spot.latest_updates.length > 0 && (
          <section className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📢 최신 업데이트</h2>
            <div className="space-y-3">
              {spot.latest_updates.slice(0, 3).map((update, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-600">
                        {update.updated_at && update.updated_at.seconds
                          ? new Date(update.updated_at.seconds * 1000).toLocaleDateString('ko-KR')
                          : '최근'}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{update.title}</h3>
                  <p className="text-sm text-gray-700">{update.content}</p>
                  {update.images && update.images.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {update.images.slice(0, 3).map((imgUrl, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={imgUrl}
                          alt={`Update ${index + 1} image ${imgIndex + 1}`}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- Latest News Section --- */}
        {relatedNews.length > 0 && (
          <section className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📰 최신 소식</h2>
            <div className="space-y-3">
              {relatedNews.map((newsItem) => (
                <div
                  key={newsItem.id}
                  className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {newsItem.badge && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(newsItem.badge)}`}>
                          {newsItem.badge}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(newsItem.published_at)}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{newsItem.title}</h3>
                  <p className="text-sm text-gray-700">{newsItem.content}</p>
                  {newsItem.keywords && newsItem.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {newsItem.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- Basic Info Section --- */}
        <section className="border-t pt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">기본 정보</h2>
          <div className="space-y-3">
            <CommentableWrapper fieldPath="address" {...commonCommentableProps}><InfoItem icon={<IconPin />} label="주소" value={spot.address} /></CommentableWrapper>
            <CommentableWrapper fieldPath="region" {...commonCommentableProps}><InfoItem icon={<IconPin />} label="지역" value={spot.region} /></CommentableWrapper>
            <CommentableWrapper fieldPath="public_info.operating_hours" {...commonCommentableProps}><InfoItem icon={<IconClock />} label="운영 시간" value={spot.public_info?.operating_hours} /></CommentableWrapper>
            <CommentableWrapper fieldPath="public_info.closed_days" {...commonCommentableProps}><InfoItem icon={<IconCalendarOff />} label="정기 휴무" value={spot.public_info?.closed_days?.join(', ')} /></CommentableWrapper>
            <CommentableWrapper fieldPath="average_duration_minutes" {...commonCommentableProps}><InfoItem icon={<IconClock />} label="평균 체류 시간" value={spot.average_duration_minutes ? `${spot.average_duration_minutes}분` : null} /></CommentableWrapper>
            <CommentableWrapper fieldPath="public_info.phone_number" {...commonCommentableProps}><InfoItem icon={<IconPhone />} label="연락처" value={spot.public_info?.phone_number} /></CommentableWrapper>
            <CommentableWrapper fieldPath="public_info.website_url" {...commonCommentableProps}><InfoItem icon={<IconLink />} label="웹사이트" value={spot.public_info?.website_url} /></CommentableWrapper>
          </div>
        </section>

        {/* --- Tags Section --- */}
        {spot.tags && spot.tags.length > 0 && (
          <section className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">태그</h2>
            <CommentableWrapper fieldPath="tags" {...commonCommentableProps}>
                <div className="flex flex-wrap gap-2">
                {spot.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-md">#{tag}</span>
                ))}
                </div>
            </CommentableWrapper>
          </section>
        )}

        {/* --- Expert's Tip Section --- */}
        {spot.expert_tip_final && (
          <section className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">전문가 TIP</h2>
             <CommentableWrapper fieldPath="expert_tip_final" {...commonCommentableProps}>
                <blockquote className="p-4 bg-indigo-50 border-l-4 border-indigo-500 text-gray-800 rounded-r-lg">
                <p className="italic leading-relaxed">{spot.expert_tip_final}</p>
                </blockquote>
            </CommentableWrapper>
          </section>
        )}

        {/* --- Attributes Section --- */}
        {spot.attributes && (
            <section className="border-t pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">핵심 속성</h2>
                <CommentableWrapper fieldPath="attributes" {...commonCommentableProps}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <AttributeItem label="추천 대상" value={spot.attributes.targetAudience} baseOption="누구나" />
                        <AttributeItem label="추천 시즌" value={spot.attributes.recommendedSeasons} baseOption="아무때나" />
                        <AttributeItem label="추천 시간대" value={spot.attributes.recommended_time_of_day || []} />
                        <AttributeItem label="아이와 함께" value={spot.attributes.withKids} />
                        <AttributeItem label="반려동물" value={spot.attributes.withPets} />
                        <AttributeItem label="주차" value={spot.attributes.parkingDifficulty} />
                        <AttributeItem label="입장료" value={spot.attributes.admissionFee} />
                    </div>
                </CommentableWrapper>
            </section>
        )}

        {/* --- Detailed Comments Section --- */}
        {spot.comments && spot.comments.length > 0 && (
          <section className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">상세 코멘트</h2>
            <div className="space-y-4">
              {spot.comments.map((comment, index) => (
                <CommentableWrapper key={index} fieldPath={`comments[${index}].content`} {...commonCommentableProps}>
                    <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <p className="font-semibold text-indigo-700">{comment.type}</p>
                    <p className="mt-1 text-gray-700">{comment.content}</p>
                    </div>
                </CommentableWrapper>
              ))}
            </div>
          </section>
        )}

        {/* --- Linked Spots Section --- */}
        {spot.linked_spots && spot.linked_spots.length > 0 && (
          <section className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">연계 장소</h2>
            <ul className="space-y-2">
              {spot.linked_spots.map((linked, index) => (
                <li key={index} className="p-3 bg-gray-50 rounded-md flex items-center">
                  <span className="font-semibold text-sm text-gray-600 mr-3">{linked.link_type}</span>
                  <span className="text-gray-800">{linked.place_name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* --- Edit History Section --- */}
        {spot.edit_history && spot.edit_history.length > 0 && (
            <section className="border-t pt-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">수정 내역</h2>
                <div className="space-y-3">
                    {spot.edit_history.slice().reverse().map((log, index) => (
                        <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                            <p className="font-semibold text-gray-700">
                                <span className="text-indigo-600">{log.acceptedBy}</span>님이 <span className="font-bold">{log.fieldPath}</span> 항목을 수정했습니다.
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(log.acceptedAt.seconds * 1000).toLocaleString()}
                            </p>
                            <div className="mt-2 text-xs space-y-1">
                                <p><span className="font-semibold text-red-600">이전:</span> {String(log.previousValue ?? '없음')}</p>
                                <p><span className="font-semibold text-green-600">현재:</span> {String(log.newValue ?? '없음')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}

      </Card>
    </div>
  );
};

export default SpotDetailView;