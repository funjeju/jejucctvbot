import React, { useState } from 'react';
import type { NewsItem, Place } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import Input from './common/Input';
import CheckboxGroup from './common/CheckboxGroup';

interface NewsFormProps {
  onSubmit: (news: NewsItem, thumbnailFile?: File) => void;
  onBack: () => void;
  spots: Place[]; // 스팟 선택을 위해
  initialValues?: Partial<NewsItem>;
}

const NEWS_TYPES: NewsItem['type'][] = [
  'new_spot', 'update', 'closure', 'seasonal', 'event', 'trending', 'menu_change', 'price_change'
];

const NEWS_TYPE_LABELS: Record<NewsItem['type'], string> = {
  'new_spot': '🆕 새로운 스팟',
  'update': '📝 일반 업데이트',
  'closure': '🚫 폐업/휴업',
  'seasonal': '🌸 계절 정보',
  'event': '🎉 이벤트/축제',
  'trending': '🔥 트렌드/핫플',
  'menu_change': '🍽️ 메뉴 변경',
  'price_change': '💰 가격 변경'
};

const BADGE_OPTIONS: NewsItem['badge'][] = [
  '신규', '인기', '계절한정', '마감임박', '핫플', '개화중', '폐업', '휴업'
];

const SEASONS = ['봄', '여름', '가을', '겨울'];
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

const NewsForm: React.FC<NewsFormProps> = ({ onSubmit, onBack, spots, initialValues }) => {
  const [newsType, setNewsType] = useState<NewsItem['type']>(initialValues?.type || 'update');
  const [title, setTitle] = useState(initialValues?.title || '');
  const [content, setContent] = useState(initialValues?.content || '');
  const [selectedSpotIds, setSelectedSpotIds] = useState<string[]>(initialValues?.related_spot_ids || []);
  const [autoApply, setAutoApply] = useState(initialValues?.auto_apply_to_spot ?? true);
  const [badge, setBadge] = useState<NewsItem['badge'] | ''>(initialValues?.badge || '');
  const [priority, setPriority] = useState(initialValues?.priority || 5);
  const [isPinned, setIsPinned] = useState(initialValues?.is_pinned || false);
  const [keywords, setKeywords] = useState(initialValues?.keywords?.join(', ') || '');
  const [season, setSeason] = useState(initialValues?.season || '');
  const [month, setMonth] = useState(initialValues?.month || '');
  const [region, setRegion] = useState(initialValues?.region || '');
  const [tags, setTags] = useState(initialValues?.tags?.join(', ') || '');
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialValues?.thumbnail_url || '');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    const now = Date.now() / 1000;
    const timestamp = { seconds: now, nanoseconds: 0 };

    let expiresAt = undefined;
    if (expiresInDays && expiresInDays > 0) {
      const expiryTime = now + (expiresInDays * 24 * 60 * 60);
      expiresAt = { seconds: expiryTime, nanoseconds: 0 };
    }

    const newsItem: NewsItem = {
      id: initialValues?.id || `news_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: newsType,
      title: title.trim(),
      content: content.trim(),
      published_at: initialValues?.published_at || timestamp,
      expires_at: expiresAt,
      related_spot_ids: selectedSpotIds,
      auto_apply_to_spot: autoApply,
      thumbnail_url: thumbnailFile ? undefined : (thumbnailUrl || undefined), // 파일이 있으면 나중에 업로드 URL로 대체
      badge: badge || undefined,
      priority,
      is_pinned: isPinned,
      keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
      season: season || undefined,
      month: month || undefined,
      region: region || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      author: 'Admin',
      created_at: initialValues?.created_at || timestamp,
      updated_at: timestamp,
    };

    onSubmit(newsItem, thumbnailFile || undefined);
  };

  const handleSpotToggle = (spotId: string) => {
    setSelectedSpotIds(prev =>
      prev.includes(spotId)
        ? prev.filter(id => id !== spotId)
        : [...prev, spotId]
    );
  };

  const handleRemoveSpot = (spotId: string) => {
    setSelectedSpotIds(prev => prev.filter(id => id !== spotId));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      // 미리보기 URL 생성
      const previewUrl = URL.createObjectURL(file);
      setThumbnailUrl(previewUrl);
    }
  };

  // 스팟 검색 필터링
  const filteredSpots = searchTerm
    ? spots.filter(spot =>
        spot.place_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spot.region?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // 선택된 스팟 정보
  const selectedSpots = spots.filter(spot => selectedSpotIds.includes(spot.place_id));

  return (
    <Card>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">📰 최신 소식 작성</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-700 mb-3">기본 정보</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              소식 유형 *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newsType}
              onChange={(e) => setNewsType(e.target.value as NewsItem['type'])}
            >
              {NEWS_TYPES.map(type => (
                <option key={type} value={type}>{NEWS_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>

          <Input
            label="제목 *"
            placeholder="예: 새별오름 유채꽃 현재 만개!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용 *
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={5}
              placeholder="상세 내용을 입력해주세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              썸네일 이미지
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {thumbnailUrl && (
              <div className="mt-3">
                <img
                  src={thumbnailUrl}
                  alt="미리보기"
                  className="h-32 w-auto object-cover rounded-lg border border-gray-300"
                />
              </div>
            )}
          </div>
        </div>

        {/* 관련 스팟 선택 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-700 mb-3">관련 스팟 연결</h3>

          <div className="flex items-center space-x-2 mb-3">
            <input
              type="checkbox"
              id="autoApply"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="autoApply" className="text-sm font-medium text-gray-700">
              스팟 상세 페이지에 자동 표시
            </label>
          </div>

          {/* 스팟 검색 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              스팟 검색
            </label>
            <input
              type="text"
              placeholder="스팟 이름 또는 지역으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 검색 결과 */}
          {searchTerm && (
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2 bg-white">
              {filteredSpots.length === 0 ? (
                <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
              ) : (
                filteredSpots.map(spot => (
                  <button
                    key={spot.place_id}
                    type="button"
                    onClick={() => {
                      handleSpotToggle(spot.place_id);
                      setSearchTerm(''); // 선택 후 검색어 초기화
                    }}
                    disabled={selectedSpotIds.includes(spot.place_id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedSpotIds.includes(spot.place_id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'hover:bg-indigo-50 text-gray-700'
                    }`}
                  >
                    <span className="font-medium">{spot.place_name}</span>
                    {spot.region && <span className="text-gray-500 ml-2">[{spot.region}]</span>}
                    {selectedSpotIds.includes(spot.place_id) && (
                      <span className="ml-2 text-xs text-green-600">✓ 선택됨</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* 선택된 스팟 목록 */}
          {selectedSpots.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                선택된 스팟 ({selectedSpots.length}개)
              </p>
              <div className="space-y-2">
                {selectedSpots.map(spot => (
                  <div
                    key={spot.place_id}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{spot.place_name}</span>
                      {spot.region && <span className="text-gray-500 ml-2">[{spot.region}]</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpot(spot.place_id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 노출 설정 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-700 mb-3">노출 설정</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              뱃지
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={badge}
              onChange={(e) => setBadge(e.target.value as NewsItem['badge'])}
            >
              <option value="">뱃지 없음</option>
              {BADGE_OPTIONS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위: {priority} (높을수록 상단 노출)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isPinned" className="text-sm font-medium text-gray-700">
              📌 상단 고정
            </label>
          </div>

          <Input
            label="만료 기간 (일)"
            type="number"
            placeholder="예: 7 (7일 후 자동 숨김)"
            value={expiresInDays || ''}
            onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>

        {/* 챗봇용 메타데이터 */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-3">🤖 챗봇 검색 최적화</h3>
          <p className="text-xs text-blue-600 mb-3">
            챗봇이 사용자 질문에 이 소식을 자동으로 연결할 수 있도록 키워드를 입력하세요.
          </p>

          <Input
            label="키워드 (쉼표로 구분)"
            placeholder="예: 벚꽃, 개화, 새별오름, 유채꽃"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                계절
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                <option value="">선택 안함</option>
                {SEASONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                월
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">선택 안함</option>
                {MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <Input
              label="지역"
              placeholder="예: 제주시"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>

          <Input
            label="태그 (쉼표로 구분)"
            placeholder="예: 포토존, 가족여행, 데이트"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button type="button" onClick={onBack} variant="secondary">
            취소
          </Button>
          <Button type="submit">
            {initialValues ? '수정 완료' : '소식 등록'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default NewsForm;
