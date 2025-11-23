import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Input from './common/Input';
import Button from './common/Button';
import type { WeatherSource } from '../types';
import GpsCoordinateModal from './GpsCoordinateModal';
import { findRegionByName, getAllRegionNames, loadAllRegions, findNearestRegion, type RegionInfo } from '../data/csvRegionLoader';

interface AddWeatherSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<WeatherSource, 'id'> & { id?: string }) => void;
  initialData?: WeatherSource | null;
}

const AddWeatherSourceModal: React.FC<AddWeatherSourceModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [direction, setDirection] = useState<'동부' | '서부' | '남부' | '북부' | ''>('');
  const [keywords, setKeywords] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<RegionInfo[]>([]);  const [autoDetectedRegion, setAutoDetectedRegion] = useState<RegionInfo | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setYoutubeUrl(initialData.youtubeUrl);
      setTitle(initialData.title);
      setShortTitle(initialData.shortTitle || '');
      setApiKey(initialData.apiKey);
      setDirection(initialData.direction || '');
      setKeywords(initialData.keywords?.join(', ') || '');
      setLatitude(initialData.latitude?.toString() || '');
      setLongitude(initialData.longitude?.toString() || '');
      setError('');
    } else if (!isOpen) {
      // Reset when modal is closed, regardless of initialData
      setYoutubeUrl('');
      setTitle('');
      setShortTitle('');
      setApiKey('');
      setDirection('');
      setKeywords('');
      setLatitude('');
      setLongitude('');
      setError('');
      setLocationSearch('');
      setShowLocationSuggestions(false);
    }
  }, [isOpen, initialData]);

  // 지역 검색 로직
  useEffect(() => {
    if (locationSearch.trim()) {
      loadAllRegions().then(regions => {
        const filtered = regions.filter(region =>
          region.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
          region.type.includes(locationSearch) ||
          (region.aliases && region.aliases.some(alias =>
            alias.toLowerCase().includes(locationSearch.toLowerCase())
          ))
        );
        setFilteredLocations(filtered.slice(0, 10)); // 최대 10개까지
        setShowLocationSuggestions(true);
      });
    } else {
      setFilteredLocations([]);
      setShowLocationSuggestions(false);
    }
  }, [locationSearch]);

  // GPS 좌표 변경 시 자동 지역 감지
  useEffect(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      findNearestRegion(lat, lng).then(region => {
        if (region) {
          setAutoDetectedRegion(region);
          // 지역 검색이 비어있으면 자동 채우기
          if (!locationSearch.trim()) {
            setLocationSearch(region.name);
          }
        }
      });
    }
  }, [latitude, longitude, locationSearch]);

  const handleLocationSelect = (location: RegionInfo) => {
    setLatitude(location.lat.toString());
    setLongitude(location.lng.toString());
    setLocationSearch(location.name);
    setAutoDetectedRegion(location);
    setShowLocationSuggestions(false);
  };

  const handleSave = () => {
    alert('저장 버튼 클릭됨!');
    console.log('handleSave 함수 호출됨!');
    if (!youtubeUrl.trim() || !title.trim()) {
      setError('영상 주소와 지역 제목은 필수 항목입니다.');
      return;
    }
    setError('');

    const keywordArray = keywords.trim()
      ? keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : undefined;

    const lat = latitude.trim() ? parseFloat(latitude) : undefined;
    const lng = longitude.trim() ? parseFloat(longitude) : undefined;

    console.log('AddWeatherSourceModal - 저장 데이터:', {
      title,
      latitude: lat,
      longitude: lng
    });

    const saveData = {
      id: initialData?.id,
      youtubeUrl,
      title,
      shortTitle: shortTitle.trim() || undefined,
      apiKey,
      direction: direction || undefined,
      keywords: keywordArray,
      latitude: lat,
      longitude: lng
    };

    console.log('onSave 호출 직전 데이터:', saveData);

    try {
      onSave(saveData);
      console.log('onSave 호출 완료');
    } catch (error) {
      console.error('onSave 호출 실패:', error);
      console.error('onSave 에러:', error);
    }

    onClose();
  };

  // GPS 좌표 모달에서 좌표를 받아오는 함수
  const handleGpsCoordinateConfirm = (latitude: number, longitude: number, newKeywords?: string) => {
    setLatitude(latitude.toString());
    setLongitude(longitude.toString());

    if (newKeywords) {
      const existingKeywords = keywords.trim();
      const combinedKeywords = existingKeywords
        ? `${existingKeywords}, ${newKeywords}`
        : newKeywords;
      setKeywords(combinedKeywords);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "소스 수정" : "새 날씨 정보 소스 추가"}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            실시간 날씨를 스트리밍하는 영상 주소(YouTube 또는 HLS)와 해당 지역, 그리고 필요 시 기상청 API 키를 입력해주세요.
          </p>
          <Input
            label="영상 주소"
            id="youtubeUrl"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="YouTube URL 또는 HLS 스트림 URL"
          />
          <Input
            label="지역 제목"
            id="sourceTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 제주시 조천읍 날씨"
          />
          <Input
            label="모바일용 별칭 (선택)"
            id="shortTitle"
            value={shortTitle}
            onChange={(e) => setShortTitle(e.target.value)}
            placeholder="예: 조천 (모바일에서 짧게 표시될 이름)"
          />
          <div>
            <label htmlFor="direction" className="block text-sm font-medium text-gray-700 mb-1">
              지역 방향
            </label>
            <select
              id="direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value as '동부' | '서부' | '남부' | '북부' | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">방향 선택 안함</option>
              <option value="동부">동부</option>
              <option value="서부">서부</option>
              <option value="남부">남부</option>
              <option value="북부">북부</option>
            </select>
          </div>
          <Input
            label="검색 키워드 (쉼표로 구분)"
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="예: 백록담, 1100고지, 어승생악, 윗세오름"
          />

          {/* 제주 지역 검색 */}
          <div className="relative">
            <label htmlFor="locationSearch" className="block text-sm font-medium text-gray-700 mb-1">
              제주 지역 검색 (GPS 자동 입력)
            </label>
            <input
              id="locationSearch"
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              onFocus={() => setShowLocationSuggestions(locationSearch.trim() !== '')}
              onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)} // 클릭 시간을 위해 지연
              placeholder="지역명을 입력하세요 (예: 제주시, 한라산, 성산읍)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {showLocationSuggestions && filteredLocations.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredLocations.map((location, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-gray-500">
                      {location.city} {location.type} | 위도: {location.latitude}, 경도: {location.longitude}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="위도 (선택)"
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="예: 33.492189"
                type="number"
                step="any"
              />
              <Input
                label="경도 (선택)"
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="예: 126.508607"
                type="number"
                step="any"
              />
            </div>
            <Button
              onClick={() => setIsGpsModalOpen(true)}
              variant="secondary"
              className="mt-2 text-sm"
            >
              🗺️ GPS 좌표 검색
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              💡 GPS 좌표를 입력하면 사용자가 주변 지역을 문의할 때 거리 기반으로 추천됩니다.
            </p>
          </div>
          <Input
            label="기상청 API 키 (선택/지역별)"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="지역별 API 키가 필요한 경우 입력"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={onClose} variant="secondary">취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </div>
        </div>
      </Modal>

      <GpsCoordinateModal
        isOpen={isGpsModalOpen}
        onClose={() => setIsGpsModalOpen(false)}
        onConfirm={handleGpsCoordinateConfirm}
      />
    </>
  );
};

export default AddWeatherSourceModal;
