// CSV에서 제주도 전체 지역 데이터를 런타임에 로드하는 모듈

export interface RegionInfo {
  name: string;
  lat: number;
  lng: number;
  type: '행정구역' | '오름' | '관광지';
  aliases?: string[];
}

// 캐시된 데이터
let cachedRegions: RegionInfo[] | null = null;

// CSV 데이터 파싱 함수
function parseCSVLine(line: string, lineNumber: number): RegionInfo | null {
  // 빈 줄이나 헤더 건너뛰기
  if (!line.trim() || line.includes('위도,경도') || line === ',,') {
    return null;
  }

  const parts = line.split(',');
  if (parts.length < 3) return null;

  const [name, lat, lng] = parts;

  // 빈 데이터 건너뛰기
  if (!name || !lat || !lng || lat.trim() === '' || lng.trim() === '') {
    return null;
  }

  const regionType = determineType(lineNumber);
  const aliases = generateAliases(name);

  return {
    name: name.replace(/"/g, ''), // 따옴표 제거
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    type: regionType,
    aliases
  };
}

// 라인 번호로 타입 결정
function determineType(lineNumber: number): '행정구역' | '오름' | '관광지' {
  if (lineNumber <= 214) return '행정구역';
  if (lineNumber <= 423) return '오름';
  return '관광지';
}

// 별칭 생성 함수
function generateAliases(name: string): string[] {
  const aliases = [name];

  // 숫자를 한글로 변환
  if (name.includes('1')) aliases.push(name.replace('1', '일'));
  if (name.includes('2')) aliases.push(name.replace('2', '이'));
  if (name.includes('3')) aliases.push(name.replace('3', '삼'));

  // 한글을 숫자로 변환
  if (name.includes('일')) aliases.push(name.replace('일', '1'));
  if (name.includes('이')) aliases.push(name.replace('이', '2'));
  if (name.includes('삼')) aliases.push(name.replace('삼', '3'));

  // 동/리 생략 형태
  if (name.includes('동')) aliases.push(name.replace('동', ''));
  if (name.includes('리')) aliases.push(name.replace('리', ''));
  if (name.includes('읍')) aliases.push(name.replace('읍', ''));
  if (name.includes('면')) aliases.push(name.replace('면', ''));

  return [...new Set(aliases)];
}

// CSV에서 모든 지역 데이터 로드
export async function loadAllRegions(): Promise<RegionInfo[]> {
  if (cachedRegions) {
    return cachedRegions;
  }

  try {
    const response = await fetch('/data/alljeju.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');

    const regions: RegionInfo[] = [];

    lines.forEach((line, index) => {
      const region = parseCSVLine(line, index + 1);
      if (region) {
        regions.push(region);
      }
    });

    cachedRegions = regions;
    console.log(`로드된 지역 데이터: ${regions.length}개`);
    return regions;
  } catch (error) {
    console.error('CSV 파일 로드 실패:', error);
    return [];
  }
}

// 지역 검색 함수 (부분 매칭 지원)
export async function findRegionByName(query: string): Promise<RegionInfo | null> {
  const regions = await loadAllRegions();
  const normalizedQuery = query.toLowerCase().trim();

  // 1. 정확한 이름 매칭 우선
  let match = regions.find(region =>
    region.name.toLowerCase() === normalizedQuery
  );

  if (match) return match;

  // 2. 별칭 매칭
  match = regions.find(region => {
    if (region.aliases) {
      return region.aliases.some(alias =>
        alias.toLowerCase() === normalizedQuery
      );
    }
    return false;
  });

  if (match) return match;

  // 3. 부분 매칭
  match = regions.find(region =>
    region.name.toLowerCase().includes(normalizedQuery) ||
    normalizedQuery.includes(region.name.toLowerCase())
  );

  if (match) return match;

  // 4. 별칭 부분 매칭
  match = regions.find(region => {
    if (region.aliases) {
      return region.aliases.some(alias =>
        alias.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(alias.toLowerCase())
      );
    }
    return false;
  });

  return match || null;
}

// 가장 가까운 지역 찾기
export async function findNearestRegion(lat: number, lng: number): Promise<RegionInfo | null> {
  const regions = await loadAllRegions();

  if (regions.length === 0) return null;

  let nearestRegion = regions[0];
  let minDistance = calculateDistance(lat, lng, nearestRegion.lat, nearestRegion.lng);

  for (const region of regions) {
    const distance = calculateDistance(lat, lng, region.lat, region.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestRegion = region;
    }
  }

  return nearestRegion;
}

// 반경 내 지역 찾기
export async function findRegionsWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): Promise<RegionInfo[]> {
  const regions = await loadAllRegions();

  return regions.filter(region => {
    const distance = calculateDistance(centerLat, centerLng, region.lat, region.lng);
    return distance <= radiusKm;
  });
}

// 하버사인 공식으로 거리 계산 (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// 타입별 지역 목록
export async function getRegionsByType(type: '행정구역' | '오름' | '관광지'): Promise<RegionInfo[]> {
  const regions = await loadAllRegions();
  return regions.filter(region => region.type === type);
}

// 모든 지역명 목록 반환
export async function getAllRegionNames(): Promise<string[]> {
  const regions = await loadAllRegions();
  return regions.map(region => region.name).sort();
}

// 캐시 초기화 (필요시)
export function clearCache(): void {
  cachedRegions = null;
}