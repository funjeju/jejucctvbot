// 하버사인 공식을 사용한 두 지점 간 거리 계산 (km)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // 소수점 첫째자리까지
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// 방향 계산 (북동남서)
export function getDirection(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);

  if (angle >= -22.5 && angle < 22.5) return '북쪽';
  if (angle >= 22.5 && angle < 67.5) return '북동쪽';
  if (angle >= 67.5 && angle < 112.5) return '동쪽';
  if (angle >= 112.5 && angle < 157.5) return '남동쪽';
  if (angle >= 157.5 || angle < -157.5) return '남쪽';
  if (angle >= -157.5 && angle < -112.5) return '남서쪽';
  if (angle >= -112.5 && angle < -67.5) return '서쪽';
  if (angle >= -67.5 && angle < -22.5) return '북서쪽';

  return '북쪽';
}

export interface NearbySource {
  source: any;
  distance: number;
  direction: string;
}

// 가까운 소스들 찾기
export function findNearbySources(
  targetLat: number,
  targetLon: number,
  sources: any[],
  maxResults: number = 3
): NearbySource[] {
  return sources
    .filter(source => source.latitude && source.longitude)
    .map(source => ({
      source,
      distance: calculateDistance(targetLat, targetLon, source.latitude!, source.longitude!),
      direction: getDirection(targetLat, targetLon, source.latitude!, source.longitude!)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults);
}