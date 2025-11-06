import React, { useEffect, useRef } from 'react';
import type { Place } from '../types';

interface KakaoMapViewProps {
  spots: Place[];
  onSpotClick?: (spot: Place) => void;
  height?: string;
}

// 카테고리별 마커 색상 매핑
const getCategoryColor = (category?: string): string => {
  const colorMap: { [key: string]: string } = {
    '관광지': '#ff6b6b',
    '맛집': '#4ecdc4',
    '카페': '#45b7d1',
    '숙소': '#96ceb4',
    '쇼핑': '#ffeaa7',
    '액티비티': '#dda0dd',
    '자연': '#98d8c8',
    '문화': '#f7dc6f',
    '해변': '#74b9ff',
    '산': '#55a3ff'
  };
  return colorMap[category || '기타'] || '#95a5a6';
};

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoMapView: React.FC<KakaoMapViewProps> = ({ spots, onSpotClick, height = '400px' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
    console.log('환경변수에서 가져온 API 키:', apiKey);

    if (!apiKey) {
      console.error('VITE_KAKAO_API_KEY가 정의되지 않았습니다');
      renderStaticMap();
      return;
    }

    // 이미 카카오맵 스크립트가 로드되어 있는지 확인
    if (window.kakao?.maps) {
      console.log('카카오맵 API가 이미 로드되어 있음');
      window.kakao.maps.load(() => {
        initializeMap();
      });
      return;
    }

    // 스크립트가 이미 존재하는지 확인
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      console.log('카카오맵 스크립트가 이미 DOM에 있음');
      // 스크립트가 로드될 때까지 기다림
      const checkInterval = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(checkInterval);
          window.kakao.maps.load(() => {
            initializeMap();
          });
        }
      }, 100);

      // 10초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.kakao?.maps) {
          console.error('카카오맵 로드 타임아웃');
          renderStaticMap();
        }
      }, 10000);
      return;
    }

    // 새 스크립트 생성 및 로드
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    console.log('카카오맵 스크립트 URL:', script.src);

    script.onload = () => {
      console.log('카카오맵 스크립트 로드 완료');
      if (window.kakao?.maps) {
        console.log('카카오맵 API 사용 가능, 지도 초기화 시작');
        window.kakao.maps.load(() => {
          console.log('카카오맵 라이브러리 로드 완료');
          initializeMap();
        });
      } else {
        console.error('카카오맵 API를 사용할 수 없습니다. 폴백 지도 표시');
        renderStaticMap();
      }
    };

    script.onerror = (error) => {
      console.error('카카오맵 스크립트 로드 실패:', error);
      renderStaticMap();
    };

    document.head.appendChild(script);

    return () => {
      // cleanup 시에는 스크립트를 제거하지 않음 (다른 컴포넌트에서도 사용할 수 있음)
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    } else {
      // 폴백 지도 업데이트
      renderStaticMap();
    }
  }, [spots]);

  const renderStaticMap = () => {
    if (!mapContainer.current) return;

    // GPS 좌표가 있는 스팟들만 필터링
    const spotsWithLocation = spots.filter(spot => spot.location?.latitude && spot.location?.longitude);

    mapContainer.current.innerHTML = `
      <div class="relative w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden border-2 border-gray-200">
        <!-- 제주도 지도 배경 -->
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <!-- 바다 배경 -->
          <rect width="400" height="300" fill="#e0f2fe"/>

          <!-- 제주도 본섬 -->
          <ellipse cx="200" cy="150" rx="120" ry="60" fill="#22c55e" stroke="#16a34a" stroke-width="2"/>

          <!-- 한라산 -->
          <circle cx="200" cy="140" r="15" fill="#94a3b8" stroke="#64748b" stroke-width="1"/>
          <text x="200" y="145" text-anchor="middle" class="text-xs font-semibold fill-white">한라산</text>

          <!-- 실제 GPS 좌표를 지도에 변환하여 마커 표시 -->
          ${spotsWithLocation.map((spot, index) => {
            const x = convertLngToX(spot.location!.longitude);
            const y = convertLatToY(spot.location!.latitude);
            const color = getCategoryColor(spot.categories?.[0]);

            return `
              <g class="cursor-pointer" data-spot-id="${spot.place_id}">
                <circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="white" stroke-width="2"/>
                <text x="${x}" y="${y - 12}" text-anchor="middle" class="text-xs font-semibold fill-gray-800">${spot.place_name}</text>
              </g>
            `;
          }).join('')}
        </svg>

        <!-- 범례 -->
        <div class="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg">
          <h4 class="text-sm font-semibold text-gray-800 mb-2">등록된 관광지</h4>
          <div class="text-lg font-bold text-indigo-600 mb-3">${spots.length}개</div>
          <div class="text-xs space-y-1">
            <div class="text-gray-600 mb-2">GPS 좌표 있음: ${spotsWithLocation.length}개</div>
            ${['관광지', '맛집', '카페', '숙소'].map(category => `
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background-color: ${getCategoryColor(category)}"></div>
                <span class="text-gray-700">${category}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- GPS 좌표 없는 스팟 알림 -->
        ${spots.length > spotsWithLocation.length ? `
          <div class="absolute bottom-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 shadow-lg">
            <div class="text-sm text-yellow-800">
              ⚠️ ${spots.length - spotsWithLocation.length}개 관광지는 GPS 좌표가 없어 표시되지 않습니다.
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // 마커 클릭 이벤트 추가
    const markers = mapContainer.current.querySelectorAll('[data-spot-id]');
    markers.forEach(marker => {
      marker.addEventListener('click', (e) => {
        const spotId = (e.currentTarget as HTMLElement).getAttribute('data-spot-id');
        const spot = spots.find(s => s.place_id === spotId);
        if (spot && onSpotClick) {
          onSpotClick(spot);
        }
      });
    });
  };

  // 경도를 SVG X좌표로 변환 (제주도 범위: 126.15 ~ 126.95)
  const convertLngToX = (lng: number): number => {
    const minLng = 126.15;
    const maxLng = 126.95;
    const svgWidth = 240; // 실제 섬 너비
    const svgStartX = 80; // 섬 시작 X 좌표

    const ratio = (lng - minLng) / (maxLng - minLng);
    return svgStartX + (ratio * svgWidth);
  };

  // 위도를 SVG Y좌표로 변환 (제주도 범위: 33.1 ~ 33.6)
  const convertLatToY = (lat: number): number => {
    const minLat = 33.1;
    const maxLat = 33.6;
    const svgHeight = 120; // 실제 섬 높이
    const svgStartY = 90; // 섬 시작 Y 좌표

    const ratio = (maxLat - lat) / (maxLat - minLat); // Y축은 뒤집어야 함
    return svgStartY + (ratio * svgHeight);
  };

  const initializeMap = () => {
    if (!mapContainer.current || !window.kakao?.maps) return;

    const centerLat = spots.length > 0 && spots[0].location?.latitude ? spots[0].location.latitude : 33.499621;
    const centerLng = spots.length > 0 && spots[0].location?.longitude ? spots[0].location.longitude : 126.531188;

    const mapOptions = {
      center: new window.kakao.maps.LatLng(centerLat, centerLng),
      level: 9
    };

    const newMap = new window.kakao.maps.Map(mapContainer.current, mapOptions);
    mapRef.current = newMap;

    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapRef.current || !window.kakao?.maps) return;

    // 기존 마커들 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 새 마커들 추가
    spots.forEach(spot => {
      if (!spot.location?.latitude || !spot.location?.longitude) return;

      const position = new window.kakao.maps.LatLng(spot.location.latitude, spot.location.longitude);
      const marker = new window.kakao.maps.Marker({
        position: position,
        title: spot.place_name
      });

      marker.setMap(mapRef.current);
      markersRef.current.push(marker);

      // 마커 클릭 이벤트
      if (onSpotClick) {
        window.kakao.maps.event.addListener(marker, 'click', () => {
          onSpotClick(spot);
        });
      }
    });
  };


  return (
    <div className="w-full" style={{ height }}>
      <div ref={mapContainer} className="w-full rounded-lg shadow-lg" style={{ height }} />
    </div>
  );
};

export default KakaoMapView;