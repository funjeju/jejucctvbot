/**
 * Google Maps API 서비스
 * Distance Matrix API 및 Directions API 호출
 */

import type { SpotLocation, RouteSegment, RouteStep } from '../types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
}

/**
 * Phase 2: Distance Matrix API
 * 현재 위치에서 여러 목적지까지의 실제 이동 시간을 일괄 계산
 * 제주도 여행은 렌터카 전용으로 설정
 */
export interface DistanceMatrixRequest {
  origins: SpotLocation[]; // 출발지들 (보통 1개)
  destinations: SpotLocation[]; // 목적지들 (여러 개)
  departureTime?: Date; // 출발 시간 (교통 상황 반영)
}

export interface DistanceMatrixResult {
  origin: SpotLocation;
  destination: SpotLocation;
  durationMinutes: number; // 이동 시간 (분)
  distanceKm: number; // 거리 (km)
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS';
}

/**
 * Distance Matrix API 호출 (렌터카 전용)
 */
export async function getDistanceMatrix(
  request: DistanceMatrixRequest
): Promise<DistanceMatrixResult[]> {
  const { origins, destinations, departureTime } = request;

  // Origins 좌표 문자열
  const originsStr = origins
    .map((o) => `${o.latitude},${o.longitude}`)
    .join('|');

  // Destinations 좌표 문자열
  const destinationsStr = destinations
    .map((d) => `${d.latitude},${d.longitude}`)
    .join('|');

  // API URL 구성
  const url = new URL(
    'https://maps.googleapis.com/maps/api/distancematrix/json'
  );
  url.searchParams.append('origins', originsStr);
  url.searchParams.append('destinations', destinationsStr);
  url.searchParams.append('mode', 'driving'); // 렌터카 고정
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
  url.searchParams.append('language', 'ko');

  if (departureTime) {
    // Unix timestamp (초 단위)
    const timestamp = Math.floor(departureTime.getTime() / 1000);
    url.searchParams.append('departure_time', timestamp.toString());
  }

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Distance Matrix API 오류:', data);
      throw new Error(`Distance Matrix API 실패: ${data.status}`);
    }

    // 결과 파싱
    const results: DistanceMatrixResult[] = [];

    data.rows.forEach((row: any, originIndex: number) => {
      row.elements.forEach((element: any, destIndex: number) => {
        const result: DistanceMatrixResult = {
          origin: origins[originIndex],
          destination: destinations[destIndex],
          durationMinutes:
            element.status === 'OK'
              ? Math.ceil(element.duration.value / 60)
              : 9999,
          distanceKm:
            element.status === 'OK'
              ? parseFloat((element.distance.value / 1000).toFixed(2))
              : 9999,
          status: element.status,
        };
        results.push(result);
      });
    });

    return results;
  } catch (error) {
    console.error('Distance Matrix API 호출 오류:', error);
    throw error;
  }
}

/**
 * Phase 3: Directions API
 * 확정된 경로의 상세 길 안내 생성 (렌터카 전용)
 */
export interface DirectionsRequest {
  waypoints: SpotLocation[]; // 전체 경로 (시작 -> 경유지들 -> 도착)
  departureTime?: Date;
}

/**
 * Directions API 호출 (렌터카 전용)
 */
export async function getDirections(
  request: DirectionsRequest
): Promise<RouteSegment[]> {
  const { waypoints, departureTime } = request;

  if (waypoints.length < 2) {
    throw new Error('최소 2개 이상의 지점이 필요합니다.');
  }

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const intermediateWaypoints = waypoints.slice(1, -1);

  // API URL 구성
  const url = new URL(
    'https://maps.googleapis.com/maps/api/directions/json'
  );
  url.searchParams.append('origin', `${origin.latitude},${origin.longitude}`);
  url.searchParams.append(
    'destination',
    `${destination.latitude},${destination.longitude}`
  );

  if (intermediateWaypoints.length > 0) {
    const waypointsStr = intermediateWaypoints
      .map((w) => `${w.latitude},${w.longitude}`)
      .join('|');
    url.searchParams.append('waypoints', waypointsStr);
  }

  url.searchParams.append('mode', 'driving'); // 렌터카 고정
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
  url.searchParams.append('language', 'ko');

  if (departureTime) {
    const timestamp = Math.floor(departureTime.getTime() / 1000);
    url.searchParams.append('departure_time', timestamp.toString());
  }

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Directions API 오류:', data);
      throw new Error(`Directions API 실패: ${data.status}`);
    }

    // 경로 파싱
    const route = data.routes[0];
    const segments: RouteSegment[] = [];

    // 각 leg를 RouteSegment로 변환
    route.legs.forEach((leg: any, index: number) => {
      const steps: RouteStep[] = leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // HTML 태그 제거
        distanceMeters: step.distance.value,
        durationSeconds: step.duration.value,
      }));

      const segment: RouteSegment = {
        origin: waypoints[index],
        destination: waypoints[index + 1],
        durationMinutes: Math.ceil(leg.duration.value / 60),
        distanceKm: parseFloat((leg.distance.value / 1000).toFixed(2)),
        steps,
        polyline: route.overview_polyline.points, // 전체 경로 폴리라인
      };

      segments.push(segment);
    });

    return segments;
  } catch (error) {
    console.error('Directions API 호출 오류:', error);
    throw error;
  }
}

/**
 * 여러 구간을 순차적으로 Directions API 호출
 * (Google API는 waypoint 수 제한이 있으므로 큰 경로는 여러 번 나누어 호출)
 */
export async function getDirectionsBySegments(
  waypoints: SpotLocation[],
  maxWaypointsPerRequest: number = 23 // Google 제한: 최대 25개 (시작+끝 포함)
): Promise<RouteSegment[]> {
  const allSegments: RouteSegment[] = [];

  for (let i = 0; i < waypoints.length - 1; i += maxWaypointsPerRequest) {
    const chunk = waypoints.slice(i, i + maxWaypointsPerRequest + 1);
    const segments = await getDirections({ waypoints: chunk });
    allSegments.push(...segments);
  }

  return allSegments;
}