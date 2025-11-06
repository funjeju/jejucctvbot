import React, { useState, useRef, useEffect } from 'react';
import type { FixedSpot } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import Input from './common/Input';

interface SpotSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'accommodation' | 'restaurant' | 'attraction';
  onComplete: (spots: FixedSpot[]) => void;
}

interface SearchResult {
  name: string;
  lat: number;
  lng: number;
  address: string;
  placeId: string;
}

const SpotSearchModal: React.FC<SpotSearchModalProps> = ({ isOpen, onClose, type, onComplete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [addedSpots, setAddedSpots] = useState<FixedSpot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const typeLabels = {
    accommodation: '숙소',
    restaurant: '맛집',
    attraction: '관광지'
  };

  // Google Maps API 초기화
  useEffect(() => {
    if (!isOpen) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('VITE_GOOGLE_MAPS_API_KEY가 정의되지 않았습니다');
      return;
    }

    // 이미 Google Maps API가 로드되어 있는지 확인
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    // 스크립트가 이미 존재하는지 확인
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // 스크립트가 로드될 때까지 기다림
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval);
          initializeMap();
        }
      }, 100);

      // 10초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps) {
          console.error('Google Maps 로드 타임아웃');
        }
      }, 10000);
      return;
    }

    // 새 스크립트 생성 및 로드
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

    script.onload = () => {
      console.log('Google Maps API 로드 완료');
      if (window.google?.maps) {
        initializeMap();
      }
    };

    script.onerror = (error) => {
      console.error('Google Maps 스크립트 로드 실패:', error);
    };

    document.head.appendChild(script);

    return () => {
      // cleanup은 하지 않음 (다른 컴포넌트에서도 사용할 수 있음)
    };
  }, [isOpen]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 33.499621, lng: 126.531829 }, // 제주도 중심
      zoom: 11,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    mapRef.current.mapInstance = map;
  };

  // 마커 클리어
  const clearMarkers = () => {
    if (mapRef.current?.markers) {
      mapRef.current.markers.forEach((marker: any) => marker.setMap(null));
      mapRef.current.markers = [];
    }
  };

  // 검색 결과를 지도에 표시
  const showSearchResultsOnMap = (results: SearchResult[]) => {
    if (!mapRef.current?.mapInstance || !window.google) return;

    clearMarkers();

    if (!mapRef.current.markers) {
      mapRef.current.markers = [];
    }

    results.forEach((result, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: result.lat, lng: result.lng },
        map: mapRef.current.mapInstance,
        title: result.name,
        label: (index + 1).toString()
      });

      marker.addListener('click', () => {
        setSelectedResult(result);
        mapRef.current.mapInstance?.setCenter({ lat: result.lat, lng: result.lng });
        mapRef.current.mapInstance?.setZoom(15);
      });

      mapRef.current.markers.push(marker);
    });

    // 첫 번째 결과로 지도 중심 이동
    if (results.length > 0) {
      mapRef.current.mapInstance.setCenter({ lat: results[0].lat, lng: results[0].lng });
      mapRef.current.mapInstance.setZoom(13);
    }
  };

  // Google Places API를 사용한 실제 검색
  const searchPlaces = async (query: string): Promise<SearchResult[]> => {
    if (!window.google?.maps?.places) {
      console.error('Google Places API가 로드되지 않았습니다');
      return [];
    }

    return new Promise((resolve) => {
      const service = new window.google.maps.places.PlacesService(mapRef.current.mapInstance);

      const request = {
        query: `${query} 제주`,
        fields: ['place_id', 'name', 'geometry', 'formatted_address'],
        locationBias: {
          center: { lat: 33.499621, lng: 126.531829 }, // 제주도 중심
          radius: 50000 // 50km 반경
        }
      };

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const searchResults: SearchResult[] = results.map(place => ({
            name: place.name || '',
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0,
            address: place.formatted_address || '',
            placeId: place.place_id || ''
          }));
          resolve(searchResults);
        } else {
          console.error('Places API 검색 실패:', status);
          resolve([]);
        }
      });
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
      showSearchResultsOnMap(results);
      setSelectedResult(null);
    } catch (error) {
      console.error('검색 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSpot = () => {
    if (!selectedResult) return;

    const newSpot: FixedSpot = {
      ...selectedResult,
      type
    };

    setAddedSpots(prev => [...prev, newSpot]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
  };

  const handleRemoveSpot = (index: number) => {
    setAddedSpots(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    onComplete(addedSpots);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setAddedSpots([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🗺️ {typeLabels[type]} 검색
          </h2>
          <p className="text-sm text-gray-600">
            구글 맵에서 정확한 위치를 찾아 추가해주세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌측: 검색 및 결과 */}
          <div className="space-y-4">
            {/* 검색 입력 */}
            <div className="flex space-x-2">
              <Input
                label="장소명 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`예: 제주 ${typeLabels[type]} 이름`}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isLoading}
                className="mt-6 px-4"
              >
                {isLoading ? '검색중...' : '🔍'}
              </Button>
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">검색 결과</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.placeId}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedResult?.placeId === result.placeId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{result.name}</p>
                          <p className="text-xs text-gray-500 truncate">{result.address}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 선택된 장소 확인 */}
            {selectedResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">📍 선택된 장소</h3>
                <p className="font-medium text-gray-900">{selectedResult.name}</p>
                <p className="text-sm text-gray-600 mb-3">{selectedResult.address}</p>
                <Button onClick={handleAddSpot} size="small" className="bg-green-600 hover:bg-green-700">
                  + 이 장소 추가
                </Button>
              </div>
            )}

            {/* 추가된 스팟들 */}
            {addedSpots.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  ✅ 추가된 {typeLabels[type]} ({addedSpots.length}개)
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {addedSpots.map((spot, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{spot.name}</p>
                        <p className="text-xs text-gray-500 truncate">{spot.address}</p>
                      </div>
                      <Button
                        onClick={() => handleRemoveSpot(index)}
                        variant="secondary"
                        size="small"
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 우측: 구글 맵 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">📍 위치 확인</h3>
            <div
              ref={mapRef}
              className="w-full h-96 border border-gray-300 rounded-lg overflow-hidden"
            >
              {/* Google Maps가 여기에 렌더링됩니다 */}
            </div>
            {selectedResult && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800">📍 선택된 위치</p>
                <p className="text-sm text-gray-700">{selectedResult.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedResult.lat.toFixed(6)}, {selectedResult.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼들 */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button onClick={handleClose} variant="secondary">
            취소
          </Button>

          <div className="flex space-x-3">
            <Button
              onClick={handleComplete}
              disabled={addedSpots.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              완료 ({addedSpots.length}개 {typeLabels[type]})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SpotSearchModal;