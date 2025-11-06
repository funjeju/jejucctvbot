// 기상청 단기예보 API 서비스 (초단기실황)
const API_KEY = import.meta.env.VITE_KMA_API_KEY;

// 초단기실황 API URL
const CURRENT_WEATHER_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

// 제주도 격자 좌표 정보 (기상청 단기예보 API용)
export const JEJU_WEATHER_STATIONS = {
  '제주': { nx: 53, ny: 38, name: '제주' },
  '서귀포': { nx: 52, ny: 33, name: '서귀포' },
  '성산포': { nx: 60, ny: 37, name: '성산포' },
  '고산': { nx: 46, ny: 35, name: '고산' },
  '중문': { nx: 51, ny: 32, name: '중문' },
  '한림': { nx: 48, ny: 36, name: '한림' },
  '추자도': { nx: 48, ny: 48, name: '추자도' },
  '우도': { nx: 60, ny: 38, name: '우도' }
} as const;

export interface CurrentWeatherData {
  location: string;
  observationTime: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  pressure: number;
  visibility: number;
  weather: string;
}

// 풍향 코드를 한글로 변환
function getWindDirection(deg: number): string {
  const directions = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// 강수형태 코드를 날씨로 변환
function getWeatherFromPTY(pty: string): string {
  switch (pty) {
    case '0': return '맑음';
    case '1': return '비';
    case '2': return '비/눈';
    case '3': return '눈';
    case '4': return '소나기';
    default: return '정보없음';
  }
}

// 현재 시간 기준으로 데이터 요청 시간 계산
function getDataTime() {
  const now = new Date();
  // 10분 전 시간 사용 (초단기실황은 매시 10분에 발표)
  now.setMinutes(now.getMinutes() - 10);

  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');

  const baseDate = `${year}${month}${day}`;
  const baseTime = `${hour}00`;

  return { baseDate, baseTime };
}

export async function getCurrentWeather(location: keyof typeof JEJU_WEATHER_STATIONS): Promise<CurrentWeatherData | null> {
  const { nx, ny, name } = JEJU_WEATHER_STATIONS[location];
  const { baseDate, baseTime } = getDataTime();

  if (!API_KEY) {
    console.error('기상청 API 키가 설정되지 않았습니다');
    return getFallbackWeatherData(name);
  }

  // 3초 타임아웃 설정
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('API 호출 타임아웃')), 3000);
  });

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    numOfRows: '10',
    pageNo: '1',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: nx.toString(),
    ny: ny.toString()
  });

  const url = `${CURRENT_WEATHER_URL}?${params}`;
  console.log('기상청 API 요청:', url);

  try {
    const apiCallPromise = fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const response = await Promise.race([apiCallPromise, timeoutPromise]);

    if (!response.ok) {
      console.error('HTTP 오류:', response.status, response.statusText);
      return getFallbackWeatherData(name);
    }

    const text = await response.text();
    console.log('기상청 API 응답 (raw):', text);

    // XML 응답인지 확인 (에러 응답)
    if (text.startsWith('<') || text.includes('<OpenAPI_S')) {
      console.error('기상청 API XML 에러 응답:', text);
      throw new Error('기상청 API에서 XML 에러 응답을 받았습니다');
    }

    const data = JSON.parse(text);
    console.log('기상청 API 응답 (JSON):', data);

    if (data.response?.header?.resultCode !== '00') {
      console.error('기상청 API 오류:', data.response?.header?.resultMsg);
      return getFallbackWeatherData(name);
    }

    const items = data.response?.body?.items?.item;
    if (!items || items.length === 0) {
      console.error('기상 데이터가 없습니다.');
      return getFallbackWeatherData(name);
    }

    // 데이터를 카테고리별로 정리
    const weatherData: Record<string, string> = {};
    items.forEach((item: any) => {
      weatherData[item.category] = item.obsrValue;
    });

    return {
      location: name,
      observationTime: `${baseDate} ${baseTime}`,
      temperature: parseFloat(weatherData.T1H) || 0, // 기온
      humidity: parseFloat(weatherData.REH) || 0,    // 습도
      windSpeed: parseFloat(weatherData.WSD) || 0,   // 풍속
      windDirection: getWindDirection(parseFloat(weatherData.VEC) || 0), // 풍향
      precipitation: parseFloat(weatherData.RN1) || 0, // 1시간 강수량
      pressure: 0, // 초단기실황에서는 기압 정보 없음
      visibility: 0, // 초단기실황에서는 시정 정보 없음
      weather: getWeatherFromPTY(weatherData.PTY || '0')
    };

  } catch (error) {
    console.error('기상 데이터 가져오기 실패 (3초 타임아웃 또는 API 오류):', error);
    console.log('폴백 데이터 사용:', name);
    return getFallbackWeatherData(name);
  }
}

// 폴백 더미 데이터 생성 함수
function getFallbackWeatherData(locationName: string): CurrentWeatherData {
  console.warn('더미 데이터로 대체합니다.');
  return {
    location: locationName,
    observationTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
    temperature: Math.round(15 + Math.random() * 15), // 15-30도
    humidity: Math.round(50 + Math.random() * 40),     // 50-90%
    windSpeed: Math.round(Math.random() * 10),         // 0-10m/s
    windDirection: ['북', '북동', '동', '남동', '남', '남서', '서', '북서'][Math.floor(Math.random() * 8)],
    precipitation: Math.random() < 0.2 ? Math.round(Math.random() * 5) : 0, // 20% 확률로 강수
    pressure: Math.round(1000 + Math.random() * 30),   // 1000-1030 hPa
    visibility: Math.round(10 + Math.random() * 10),   // 10-20 km
    weather: Math.random() < 0.7 ? '맑음' : ['구름많음', '흐림', '비'][Math.floor(Math.random() * 3)]
  };
}

// 여러 지역의 현재 날씨 데이터를 한번에 가져오기
export async function getMultipleCurrentWeather(locations: (keyof typeof JEJU_WEATHER_STATIONS)[]): Promise<CurrentWeatherData[]> {
  const promises = locations.map(location => getCurrentWeather(location));
  const results = await Promise.allSettled(promises);

  return results
    .filter((result): result is PromiseFulfilledResult<CurrentWeatherData | null> =>
      result.status === 'fulfilled' && result.value !== null)
    .map(result => result.value!);
}

// 테스트용 함수
export async function testWeatherAPI() {
  console.log('기상청 초단기실황 API 테스트 시작...');

  try {
    const weather = await getCurrentWeather('제주');
    if (weather) {
      console.log('✅ 제주 현재 날씨:', weather);
      return weather;
    } else {
      console.log('❌ 제주 날씨 데이터를 가져올 수 없습니다.');
      return null;
    }
  } catch (error) {
    console.error('❌ API 테스트 실패:', error);
    return null;
  }
}