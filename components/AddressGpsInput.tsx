import React, { useState, useEffect, useRef } from 'react';
import type { Geopoint } from '../types';
import Button from './common/Button';
import Input from './common/Input';

interface AddressGpsInputProps {
  address?: string;
  location?: Geopoint | null;
  onAddressChange: (address: string) => void;
  onLocationChange: (location: Geopoint | null) => void;
}

declare global {
  interface Window {
    google: any;
    initGoogleMapsForAddress: () => void;
  }
}

const AddressGpsInput: React.FC<AddressGpsInputProps> = ({
  address = '',
  location,
  onAddressChange,
  onLocationChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('VITE_GOOGLE_MAPS_API_KEY가 정의되지 않았습니다');
      return;
    }

    // 이미 Google Maps API가 로드되어 있는지 확인
    if (window.google?.maps) {
      return;
    }

    // 스크립트가 이미 존재하는지 확인
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      return;
    }

    // 새 스크립트 생성 및 로드
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;

    script.onload = () => {
      console.log('Google Maps API for Address 로드 완료');
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (map && location) {
      updateMapMarker(location);
    }
  }, [map, location]);

  const initializeMap = (container: HTMLDivElement) => {
    if (!window.google?.maps) return;

    const centerLat = location?.latitude || 33.499621;
    const centerLng = location?.longitude || 126.531188;

    const mapOptions = {
      center: { lat: centerLat, lng: centerLng },
      zoom: location ? 15 : 10,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    };

    const newMap = new window.google.maps.Map(container, mapOptions);
    setMap(newMap);

    // 지도 클릭 이벤트
    newMap.addListener('click', (event: any) => {
      const newLocation: Geopoint = {
        latitude: event.latLng.lat(),
        longitude: event.latLng.lng()
      };

      onLocationChange(newLocation);
      updateMapMarker(newLocation);

      // 좌표를 주소로 변환
      convertCoordsToAddress(newLocation);
    });

    if (location) {
      updateMapMarker(location);
    }
  };

  const updateMapMarker = (geopoint: Geopoint) => {
    if (!map || !window.google?.maps) return;

    const position = { lat: geopoint.latitude, lng: geopoint.longitude };

    if (marker) {
      marker.setMap(null);
    }

    const newMarker = new window.google.maps.Marker({
      position: position,
      map: map,
    });

    setMarker(newMarker);
    map.setCenter(position);
  };

  const searchAddressToCoords = async () => {
    if (!address.trim()) {
      alert('주소를 입력해주세요.');
      return;
    }

    if (!window.google?.maps) {
      alert('Google Maps API가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsLoading(true);

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ address: address }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const newLocation: Geopoint = {
          latitude: location.lat(),
          longitude: location.lng()
        };

        onLocationChange(newLocation);

        if (map) {
          updateMapMarker(newLocation);
        }

        alert(`GPS 좌표를 찾았습니다!\n위도: ${newLocation.latitude}\n경도: ${newLocation.longitude}`);
      } else {
        alert('주소를 찾을 수 없습니다. 다시 시도해주세요.');
      }
      setIsLoading(false);
    });
  };

  const convertCoordsToAddress = (geopoint: Geopoint) => {
    if (!window.google?.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    const latlng = { lat: geopoint.latitude, lng: geopoint.longitude };

    geocoder.geocode({ location: latlng }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        onAddressChange(results[0].formatted_address);
      }
    });
  };

  const toggleMap = () => {
    setIsMapVisible(!isMapVisible);

    // 지도를 새로 표시할 때 초기화
    if (!isMapVisible) {
      setTimeout(() => {
        const container = document.getElementById('address-map');
        if (container && window.google?.maps) {
          initializeMap(container as HTMLDivElement);
        }
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="주소를 입력하세요 (예: 제주특별자치도 제주시 첨단로 242)"
          />
        </div>
        <Button
          onClick={searchAddressToCoords}
          disabled={isLoading || !address.trim()}
          className="bg-blue-500 text-white hover:bg-blue-600"
        >
          {isLoading ? '검색 중...' : '🔍 GPS 찾기'}
        </Button>
        <Button
          onClick={toggleMap}
          variant="secondary"
        >
          {isMapVisible ? '🗺️ 지도 숨기기' : '🗺️ 지도 보기'}
        </Button>
      </div>

      {/* GPS 좌표 표시 */}
      {location && location.latitude != null && location.longitude != null && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-800">
            📍 GPS 좌표: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </div>
        </div>
      )}

      {/* 지도 영역 */}
      {isMapVisible && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600">
            💡 지도를 클릭하여 GPS 좌표를 설정할 수 있습니다
          </div>
          <div
            id="address-map"
            className="w-full h-64"
          />
        </div>
      )}

      {/* 사용법 안내 */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>• 주소 입력 후 "GPS 찾기" 버튼으로 자동 좌표 검색</div>
        <div>• "지도 보기"로 직접 위치를 클릭하여 GPS 좌표 설정</div>
        <div>• 정확한 주소일수록 GPS 좌표를 더 정확히 찾을 수 있습니다</div>
      </div>
    </div>
  );
};

export default AddressGpsInput;