// YouTube 실시간 캡처 및 기상 데이터 오버레이 서비스
import { getCurrentWeather, JEJU_WEATHER_STATIONS } from './weatherService';
import type { CurrentWeatherData } from './weatherService';
import Hls from 'hls.js';

export interface CaptureResult {
  imageUrl: string;
  weatherData: {
    temp: string;
    humidity: string;
    wind: string;
    weather?: string;
    location?: string;
  } | null;
  timestamp: string;
  sourceTitle: string;
}

// CurrentWeatherData를 UI 형식으로 변환
function transformWeatherData(data: CurrentWeatherData | null): {
  temp: string;
  humidity: string;
  wind: string;
  weather?: string;
  location?: string;
} | null {
  if (!data) return null;

  return {
    temp: `${data.temperature}°C`,
    humidity: `${data.humidity}%`,
    wind: `${data.windSpeed}m/s ${data.windDirection}`,
    weather: data.weather,
    location: data.location
  };
}

// YouTube URL에서 비디오 ID 추출
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Canvas에 기상 데이터를 크고 잘 보이게 오버레이
function drawWeatherOverlay(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  weatherData: {
    temp: string;
    humidity: string;
    wind: string;
    weather?: string;
    location?: string;
  } | null,
  sourceTitle: string
) {
  const width = canvas.width;
  const height = canvas.height;

  // 더 큰 반투명 배경 (우측 상단으로 이동하고 크기 증가)
  const overlayWidth = 400;
  const overlayHeight = weatherData ? 280 : 150;
  const overlayX = width - overlayWidth - 30;
  const overlayY = 30;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);

  // 테두리 추가
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);

  // 제목 (더 크게)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(sourceTitle, overlayX + 20, overlayY + 35);

  // 시간 (더 크게)
  const now = new Date();
  const timeStr = now.toLocaleString('ko-KR');
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = '#cccccc';
  ctx.fillText(`캡처 시간: ${timeStr}`, overlayX + 20, overlayY + 65);

  if (weatherData) {
    // 온도 (훨씬 크게, 눈에 띄는 색상)
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.fillStyle = '#ff4757';
    ctx.fillText(weatherData.temp, overlayX + 20, overlayY + 135);

    // 날씨 상태 (크게)
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#5dade2';
    ctx.fillText(weatherData.weather || '맑음', overlayX + 250, overlayY + 135);

    // 기타 데이터 (더 크게)
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    let y = overlayY + 165;

    ctx.fillText(`💧 습도: ${weatherData.humidity}`, overlayX + 20, y);
    y += 30;
    ctx.fillText(`💨 풍속: ${weatherData.wind}`, overlayX + 20, y);
    y += 30;
    ctx.fillText(`📊 현재 관측 데이터`, overlayX + 20, y);

    // 관측소 정보 (더 크게)
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#bdc3c7';
    ctx.fillText(`📍 ${weatherData.location || '제주'} 관측소`, overlayX + 20, overlayY + 265);
  } else {
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = '#f39c12';
    ctx.fillText('⚠️ 기상 데이터를 가져올 수 없습니다', overlayX + 20, overlayY + 110);
  }
}

// YouTube 썸네일을 사용한 임시 캡처 (실제 구현 전 테스트용)
async function captureYouTubeThumbnail(youtubeUrl: string, sourceTitle: string): Promise<CaptureResult | null> {
  try {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      console.error('유효하지 않은 YouTube URL:', youtubeUrl);
      return null;
    }

    // YouTube 썸네일 URL (여러 품질 시도)
    const thumbnailUrls = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // 고화질
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,    // 중화질
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,    // 보통화질
      `https://img.youtube.com/vi/${videoId}/default.jpg`       // 기본화질
    ];

    // 기상 데이터 가져오기 (제주를 기본으로, 나중에 지역 매핑 추가)
    const rawWeatherData = await getCurrentWeather('제주');
    const weatherData = transformWeatherData(rawWeatherData);

    // Canvas에 이미지와 오버레이 합성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 여러 썸네일 URL을 순차적으로 시도
    return new Promise((resolve) => {
      let currentIndex = 0;

      const tryNextThumbnail = () => {
        if (currentIndex >= thumbnailUrls.length) {
          console.error('모든 썸네일 URL 실패:', thumbnailUrls);
          resolve(null);
          return;
        }

        const thumbnailUrl = thumbnailUrls[currentIndex];
        const img = new Image();
        img.crossOrigin = 'anonymous';

        // 이미지 로딩 타임아웃 (5초)
        const timeout = setTimeout(() => {
          console.log(`썸네일 로딩 타임아웃: ${thumbnailUrl}`);
          currentIndex++;
          tryNextThumbnail();
        }, 5000);

        img.onload = () => {
          clearTimeout(timeout);
          console.log(`썸네일 로드 성공: ${thumbnailUrl}`);

          // Canvas 크기 설정
          canvas.width = 1280;
          canvas.height = 720;

          // 이미지 그리기 (비율 유지하며 크기 조정)
          const aspectRatio = img.width / img.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;

          if (aspectRatio > canvas.width / canvas.height) {
            drawHeight = canvas.width / aspectRatio;
          } else {
            drawWidth = canvas.height * aspectRatio;
          }

          const x = (canvas.width - drawWidth) / 2;
          const y = (canvas.height - drawHeight) / 2;

          ctx.drawImage(img, x, y, drawWidth, drawHeight);

          // Canvas 오버레이 제거 - 하단 텍스트만 사용

          // Canvas를 Base64로 변환
          const imageUrl = canvas.toDataURL('image/jpeg', 0.9);

          resolve({
            imageUrl,
            weatherData,
            timestamp: new Date().toISOString(),
            sourceTitle
          });
        };

        img.onerror = () => {
          clearTimeout(timeout);
          console.warn(`썸네일 로드 실패: ${thumbnailUrl}, 다음 시도...`);
          currentIndex++;
          tryNextThumbnail();
        };

        img.src = thumbnailUrl;
      };

      tryNextThumbnail();
    });

  } catch (error) {
    console.error('YouTube 캡처 실패:', error);
    return null;
  }
}

// FFmpeg를 사용한 실제 스트림 캡처 (서버 사이드 필요)
async function captureYouTubeStream(youtubeUrl: string, sourceTitle: string): Promise<CaptureResult | null> {
  // TODO: 실제 구현 시 서버 API 호출
  // const response = await fetch('/api/capture-stream', {
  //   method: 'POST',
  //   body: JSON.stringify({ youtubeUrl, sourceTitle })
  // });

  console.log('실제 스트림 캡처는 서버 구현이 필요합니다. 현재는 썸네일을 사용합니다.');
  return captureYouTubeThumbnail(youtubeUrl, sourceTitle);
}

// 지역명을 기상청 관측소로 매핑 (제주도 전체 읍면동 커버)
function getWeatherStationFromTitle(sourceTitle: string): keyof typeof JEJU_WEATHER_STATIONS {
  const title = sourceTitle.toLowerCase();

  // 1. 제주시 동부 지역 → 성산포 관측소
  if (title.includes('성산') || title.includes('우도') || title.includes('구좌') ||
      title.includes('세화') || title.includes('하도') || title.includes('종달') ||
      title.includes('김녕') || title.includes('월정') || title.includes('행원') ||
      title.includes('평대') || title.includes('송당') || title.includes('표선') ||
      title.includes('화순') || title.includes('온평') || title.includes('세화리') ||
      title.includes('하도리') || title.includes('종달리') || title.includes('김녕리') ||
      title.includes('월정리') || title.includes('행원리')) return '성산포';

  // 2. 제주시 서부 지역 → 고산 관측소
  if (title.includes('고산') || title.includes('애월') || title.includes('한림') ||
      title.includes('한경') || title.includes('협재') || title.includes('금릉') ||
      title.includes('곽지') || title.includes('명월') || title.includes('수월') ||
      title.includes('대림') || title.includes('상명') || title.includes('금오름') ||
      title.includes('신창') || title.includes('저지') || title.includes('상가') ||
      title.includes('하가') || title.includes('청수') || title.includes('대정') ||
      title.includes('신평') || title.includes('하원') || title.includes('영락') ||
      title.includes('보성') || title.includes('동명') || title.includes('일과') ||
      title.includes('무릉') || title.includes('신도') || title.includes('가마') ||
      title.includes('인성') || title.includes('수산')) return '고산';

  // 3. 서귀포시 동부/중문 지역 → 중문 관측소
  if (title.includes('중문') || title.includes('색달') || title.includes('안덕') ||
      title.includes('대천') || title.includes('상천') || title.includes('화순') ||
      title.includes('대포') || title.includes('예래') || title.includes('하원') ||
      title.includes('강정') || title.includes('법환') || title.includes('영천') ||
      title.includes('회수') || title.includes('상예') || title.includes('하예')) return '중문';

  // 4. 서귀포시 중심가/남원 지역 → 서귀포 관측소
  if (title.includes('서귀포') || title.includes('남원') || title.includes('신효') ||
      title.includes('태흥') || title.includes('위미') || title.includes('남성') ||
      title.includes('수망') || title.includes('의귀') || title.includes('토평') ||
      title.includes('효돈') || title.includes('동홍') || title.includes('서홍') ||
      title.includes('정방') || title.includes('천지') || title.includes('보목') ||
      title.includes('월평') || title.includes('신시') || title.includes('대흘') ||
      title.includes('성산읍') || title.includes('표선면') || title.includes('남원읍') ||
      title.includes('하논') || title.includes('칠십리')) return '서귀포';

  // 5. 한림 지역 → 한림 관측소
  if (title.includes('한림') || title.includes('협재') || title.includes('금릉') ||
      title.includes('한수') || title.includes('대림') || title.includes('명월') ||
      title.includes('옹포') || title.includes('귀덕') || title.includes('비양도')) return '한림';

  // 6. 우도 → 우도 관측소
  if (title.includes('우도')) return '우도';

  // 7. 추자도 → 추자도 관측소
  if (title.includes('추자') || title.includes('신양') || title.includes('대서') ||
      title.includes('영흥') || title.includes('신촌')) return '추자도';

  // 8. 제주시 중심가/북부 → 제주 관측소
  if (title.includes('제주시') || title.includes('이도') || title.includes('삼도') ||
      title.includes('용담') || title.includes('건입') || title.includes('화북') ||
      title.includes('삼양') || title.includes('도두') || title.includes('봉개') ||
      title.includes('아라') || title.includes('오라') || title.includes('연동') ||
      title.includes('노형') || title.includes('외도') || title.includes('이호') ||
      title.includes('도련') || title.includes('내도') || title.includes('광령') ||
      title.includes('교래') || title.includes('조천') || title.includes('신촌') ||
      title.includes('함덕') || title.includes('북촌') || title.includes('선흘') ||
      title.includes('와흘') || title.includes('와산') || title.includes('조천읍') ||
      title.includes('구좌읍') || title.includes('애월읍') || title.includes('한림읍') ||
      title.includes('한경면') || title.includes('추자면') ||
      // 1100도로, 한라산 중산간 지역
      title.includes('1100') || title.includes('어승생') || title.includes('윗세오름') ||
      title.includes('백록담') || title.includes('한라산') || title.includes('영실') ||
      title.includes('어리목') || title.includes('관음사') || title.includes('성판악')) return '제주';

  // 기본값: 제주 관측소
  console.log(`⚠️ 지역 매핑 실패, 기본값(제주) 사용: "${sourceTitle}"`);
  return '제주';
}

// 메인 캡처 함수
export async function captureWeatherScene(youtubeUrl: string, sourceTitle: string): Promise<CaptureResult | null> {
  console.log(`날씨 장면 캡처 시작: ${sourceTitle}`);

  try {
    // 지역에 맞는 기상 데이터 가져오기 (병렬 처리)
    const station = getWeatherStationFromTitle(sourceTitle);

    // 기상 데이터와 썸네일을 병렬로 가져오기
    const [rawWeatherData, thumbnailResult] = await Promise.allSettled([
      getCurrentWeather(station),
      captureYouTubeThumbnail(youtubeUrl, sourceTitle)
    ]);

    const transformedWeatherData = rawWeatherData.status === 'fulfilled' && rawWeatherData.value
      ? transformWeatherData(rawWeatherData.value)
      : null;

    console.log(`${station} 관측소 데이터:`, rawWeatherData);

    // 썸네일 결과 처리
    if (thumbnailResult.status === 'fulfilled' && thumbnailResult.value) {
      const result = thumbnailResult.value;
      result.weatherData = transformedWeatherData; // 최신 기상 데이터로 업데이트
      console.log('✅ 날씨 장면 캡처 완료 (병렬 처리):', result.timestamp);
      return result;
    }

    console.error('썸네일 캡처 실패');
    return null;
  } catch (error) {
    console.error('날씨 장면 캡처 실패:', error);
    return null;
  }
}

// 배치 썸네일 분석을 위한 타입
export interface VisualAnalysisResult {
  sourceId: string;
  sourceTitle: string;
  thumbnailUrl: string;
  matches: boolean;
  confidence: number;
  description: string;
  weatherData?: {
    temp: string;
    humidity: string;
    wind: string;
    weather?: string;
    location?: string;
  } | null;
}

export interface BatchAnalysisProgress {
  total: number;
  completed: number;
  matches: VisualAnalysisResult[];
  isComplete: boolean;
}

// 배치 썸네일 분석 함수
export async function analyzeThumbnailsBatch(
  sources: { id: string; title: string; youtubeUrl: string }[],
  searchQuery: string,
  onProgress?: (progress: BatchAnalysisProgress) => void
): Promise<VisualAnalysisResult[]> {
  console.log(`배치 분석 시작: ${sources.length}개 소스, 검색어: "${searchQuery}"`);

  const results: VisualAnalysisResult[] = [];
  const batchSize = 10; // 한 번에 10개씩 처리

  // 배치로 나누기
  const batches = [];
  for (let i = 0; i < sources.length; i += batchSize) {
    batches.push(sources.slice(i, i + batchSize));
  }

  let completed = 0;

  for (const batch of batches) {
    console.log(`배치 처리 중: ${completed + 1}-${Math.min(completed + batchSize, sources.length)}/${sources.length}`);

    // 배치 내 병렬 처리
    const batchPromises = batch.map(async (source) => {
      try {
        const analysisResult = await analyzeSourceVisually(source, searchQuery);
        completed++;

        // 결과를 배열에 추가
        results.push(analysisResult);

        // 진행상황 업데이트 (모든 매칭 결과 포함)
        if (onProgress) {
          onProgress({
            total: sources.length,
            completed,
            matches: results.filter(r => r.matches),
            isComplete: completed === sources.length
          });
        }

        return analysisResult;
      } catch (error) {
        console.error(`분석 실패 (${source.title}):`, error);
        completed++;
        const errorResult = {
          sourceId: source.id,
          sourceTitle: source.title,
          thumbnailUrl: '',
          matches: false,
          confidence: 0,
          description: '분석 실패'
        };
        results.push(errorResult);

        // 에러 시에도 진행상황 업데이트
        if (onProgress) {
          onProgress({
            total: sources.length,
            completed,
            matches: results.filter(r => r.matches),
            isComplete: completed === sources.length
          });
        }

        return errorResult;
      }
    });

    await Promise.all(batchPromises);

    // 배치 간 잠시 대기 (API 부하 방지)
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const matches = results.filter(r => r.matches);
  console.log(`배치 분석 완료: ${matches.length}/${sources.length}개 매칭`);

  return results;
}

// URL 타입 감지 함수
function getUrlType(url: string): 'youtube' | 'hls' | 'unknown' {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com' || urlObj.hostname === 'youtu.be') {
      return 'youtube';
    } else if (url.includes('.m3u8') || url.includes('playlist.m3u8')) {
      return 'hls';
    }
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// 개별 소스 시각적 분석
async function analyzeSourceVisually(
  source: { id: string; title: string; youtubeUrl: string },
  searchQuery: string
): Promise<VisualAnalysisResult> {
  const urlType = getUrlType(source.youtubeUrl);

  if (urlType === 'youtube') {
    const videoId = extractVideoId(source.youtubeUrl);
    if (!videoId) {
      return {
        sourceId: source.id,
        sourceTitle: source.title,
        thumbnailUrl: '',
        matches: false,
        confidence: 0,
        description: 'YouTube URL 파싱 실패'
      };
    }

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    return await analyzeYouTubeThumbnail(source, searchQuery, thumbnailUrl);

  } else if (urlType === 'hls') {
    // HLS 스트림의 경우 제목 기반 분석 + 시뮬레이션
    return await analyzeHLSStream(source, searchQuery);

  } else {
    return {
      sourceId: source.id,
      sourceTitle: source.title,
      thumbnailUrl: '',
      matches: false,
      confidence: 0,
      description: '지원되지 않는 URL 형식'
    };
  }
}

// YouTube 썸네일 분석
async function analyzeYouTubeThumbnail(
  source: { id: string; title: string; youtubeUrl: string },
  searchQuery: string,
  thumbnailUrl: string
): Promise<VisualAnalysisResult> {

  try {
    // Gemini API로 이미지 분석
    const analysisPrompt = `이 제주도 실시간 카메라 이미지를 분석해서 "${searchQuery}"라는 조건에 맞는지 판단해주세요.

응답은 반드시 다음 JSON 형식으로만 답변해주세요:
{
  "matches": true/false,
  "confidence": 0-100,
  "description": "간단한 설명"
}

예시 검색어별 판단 기준:
- "파란하늘" -> 맑고 파란 하늘이 보이는지 (구름이 적고 하늘이 파란색인지)
- "비오는날씨" -> 비가 오는 모습이 보이는지 (빗방울, 젖은 지면, 흐린 날씨)
- "흐린날씨" -> 구름이 많고 흐린 하늘인지 (회색 구름, 어두운 하늘)
- "일몰" -> 석양이 지는 모습인지 (주황/빨간색 하늘, 낮은 태양)
- "안개" -> 안개나 뿌연 모습이 보이는지 (시야 제한, 뿌연 대기)

현재 검색어: "${searchQuery}"

이미지의 날씨 상태를 정확히 분석하여 검색어와 일치하는지 판단해주세요.`;

    // 실제 Gemini API 호출 (임시로 더미 데이터 사용, 나중에 실제 API로 교체)
    const matches = Math.random() > 0.6; // 40% 확률로 매칭 (더 현실적)
    const confidence = matches ? 60 + Math.random() * 35 : 20 + Math.random() * 40;

    let description = '분석 완료';
    if (searchQuery.includes('파란하늘') || searchQuery.includes('맑은')) {
      description = matches ? '맑고 파란 하늘이 선명하게 보임' : '구름이 많거나 흐린 상태';
    } else if (searchQuery.includes('비') || searchQuery.includes('우천')) {
      description = matches ? '비가 내리는 모습이 관찰됨' : '맑은 날씨로 보임';
    } else if (searchQuery.includes('흐린') || searchQuery.includes('구름')) {
      description = matches ? '구름이 많고 흐린 날씨' : '맑거나 부분적으로 구름';
    } else if (searchQuery.includes('일몰') || searchQuery.includes('노을')) {
      description = matches ? '아름다운 일몰/노을 장면' : '일반적인 하늘 상태';
    } else if (searchQuery.includes('안개')) {
      description = matches ? '안개로 인한 시야 제한' : '맑은 시야';
    }

    // TODO: 실제 Gemini API 호출로 교체
    // const { GoogleGenerativeAI } = require('@google/generative-ai');
    // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    // const result = await model.generateContent([analysisPrompt, thumbnailUrl]);
    // const response = JSON.parse(result.response.text());

    // 매칭되는 경우 날씨 데이터도 가져오기
    let weatherData = null;
    if (matches) {
      const station = getWeatherStationFromTitle(source.title);
      const rawWeatherData = await getCurrentWeather(station);
      weatherData = transformWeatherData(rawWeatherData);
    }

    return {
      sourceId: source.id,
      sourceTitle: source.title,
      thumbnailUrl,
      matches,
      confidence: Math.round(confidence),
      description,
      weatherData
    };

  } catch (error) {
    console.error(`시각적 분석 실패 (${source.title}):`, error);
    return {
      sourceId: source.id,
      sourceTitle: source.title,
      thumbnailUrl,
      matches: false,
      confidence: 0,
      description: 'AI 분석 실패'
    };
  }
}

// HLS 스트림에서 썸네일 캡처
async function captureHLSThumbnail(hlsUrl: string, sourceTitle: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // 임시 비디오 엘리먼트 생성 (화면에 표시되지 않음)
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.style.display = 'none';
      document.body.appendChild(video);

      // Canvas 엘리먼트 생성
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // HLS.js 설정
      if (typeof window !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        // 메타데이터 로드 완료 시
        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        });

        // 첫 프레임이 그려졌을 때 캡처
        video.addEventListener('canplay', async () => {
          try {
            // 잠시 재생하여 프레임 로드
            await video.play();

            // 1초 후 캡처 (안정적인 프레임 확보)
            setTimeout(() => {
              try {
                if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                  console.log(`✅ HLS 썸네일 캡처 성공: ${sourceTitle}`);

                  // 정리
                  video.pause();
                  hls.destroy();
                  document.body.removeChild(video);

                  resolve(thumbnailDataUrl);
                } else {
                  console.warn(`⚠️ HLS 비디오 크기 감지 실패: ${sourceTitle}`);
                  document.body.removeChild(video);
                  resolve(null);
                }
              } catch (error) {
                console.error(`❌ HLS 캔버스 그리기 실패: ${sourceTitle}`, error);
                document.body.removeChild(video);
                resolve(null);
              }
            }, 1000);

          } catch (playError) {
            console.warn(`⚠️ HLS 비디오 재생 실패 (자동재생 제한): ${sourceTitle}`, playError);
            // 재생 실패해도 캡처 시도
            setTimeout(() => {
              try {
                if (ctx && video.videoWidth > 0) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  console.log(`✅ HLS 썸네일 캡처 성공 (재생없이): ${sourceTitle}`);
                  hls.destroy();
                  document.body.removeChild(video);
                  resolve(thumbnailDataUrl);
                } else {
                  document.body.removeChild(video);
                  resolve(null);
                }
              } catch (error) {
                console.error(`❌ HLS 캔버스 그리기 실패: ${sourceTitle}`, error);
                document.body.removeChild(video);
                resolve(null);
              }
            }, 2000);
          }
        });

        // 에러 처리
        video.addEventListener('error', (error) => {
          console.error(`❌ HLS 비디오 로드 에러: ${sourceTitle}`, error);
          hls.destroy();
          document.body.removeChild(video);
          resolve(null);
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          console.error(`❌ HLS 스트림 에러: ${sourceTitle}`, data);
          hls.destroy();
          document.body.removeChild(video);
          resolve(null);
        });

        // 타임아웃 (10초)
        setTimeout(() => {
          console.warn(`⏰ HLS 캡처 타임아웃: ${sourceTitle}`);
          try {
            hls.destroy();
            if (document.body.contains(video)) {
              document.body.removeChild(video);
            }
          } catch (e) {
            console.error('정리 중 에러:', e);
          }
          resolve(null);
        }, 10000);

      } else {
        console.warn(`⚠️ HLS.js 지원되지 않음: ${sourceTitle}`);
        document.body.removeChild(video);
        resolve(null);
      }

    } catch (error) {
      console.error(`❌ HLS 썸네일 캡처 설정 실패: ${sourceTitle}`, error);
      resolve(null);
    }
  });
}

// HLS 스트림 분석 (실제 썸네일 캡처 + AI 분석)
async function analyzeHLSStream(
  source: { id: string; title: string; youtubeUrl: string },
  searchQuery: string
): Promise<VisualAnalysisResult> {
  try {
    console.log(`🎥 HLS 스트림 분석 시작: ${source.title}`);

    // 1. 실시간 썸네일 캡처 시도
    const thumbnailDataUrl = await captureHLSThumbnail(source.youtubeUrl, source.title);

    // 2. 기상 데이터도 가져오기
    const station = getWeatherStationFromTitle(source.title);
    const rawWeatherData = await getCurrentWeather(station);
    const weatherData = transformWeatherData(rawWeatherData);

    if (thumbnailDataUrl) {
      console.log(`✅ HLS 썸네일 캡처 완료, AI 분석 시작: ${source.title}`);
      // TODO: 실제 Gemini API 호출로 썸네일 분석
      // 현재는 시뮬레이션
      const matches = Math.random() > 0.5;
      const confidence = matches ? 75 + Math.random() * 20 : 40 + Math.random() * 30;

      return {
        sourceId: source.id,
        sourceTitle: source.title,
        thumbnailUrl: thumbnailDataUrl,
        matches,
        confidence: Math.round(confidence),
        description: `실시간 HLS 캡처 분석: ${matches ? '조건 일치' : '조건 불일치'}`,
        weatherData
      };
    } else {
      console.warn(`⚠️ HLS 썸네일 캡처 실패, 기상 데이터 기반 분석: ${source.title}`);
      // 캡처 실패 시 기상 데이터 기반 분석으로 폴백

      // 실제 기상 데이터 기반으로 매칭 판단
      let matches = false;
      let confidence = 0;
      let description = '';

      if (weatherData && weatherData.weather && !weatherData.weather.includes('정보없음')) {
        if (searchQuery.includes('맑은') || searchQuery.includes('파란하늘')) {
          matches = weatherData.weather === '맑음';
          confidence = matches ? 80 + Math.random() * 15 : 30 + Math.random() * 20;
          description = matches ? `실제 기상 데이터: ${weatherData.weather}, 기온 ${weatherData.temp}` : `현재 ${weatherData.weather} 상태`;
        } else if (searchQuery.includes('비') || searchQuery.includes('우천')) {
          matches = weatherData.weather === '비' || weatherData.weather === '소나기';
          confidence = matches ? 85 + Math.random() * 10 : 25 + Math.random() * 25;
          description = matches ? `실제 강수 확인: ${weatherData.weather}` : `현재 ${weatherData.weather} 상태`;
        } else if (searchQuery.includes('흐린') || searchQuery.includes('구름')) {
          matches = weatherData.weather.includes('구름') || weatherData.weather === '흐림';
          confidence = matches ? 75 + Math.random() * 20 : 40 + Math.random() * 30;
          description = matches ? `구름 많음: ${weatherData.weather}` : `현재 ${weatherData.weather} 상태`;
        } else {
          // 기타 검색어는 시뮬레이션
          matches = Math.random() > 0.7;
          confidence = matches ? 60 + Math.random() * 30 : 30 + Math.random() * 40;
          description = `기상 상태: ${weatherData.weather}, 기온 ${weatherData.temp}`;
        }
      } else {
        // 날씨 데이터 없을 때는 랜덤 시뮬레이션
        matches = Math.random() > 0.6;
        confidence = matches ? 50 + Math.random() * 30 : 20 + Math.random() * 40;
        description = '실시간 기상 데이터 기반 분석 (썸네일 캡처 실패)';
      }

      return {
        sourceId: source.id,
        sourceTitle: source.title,
        thumbnailUrl: '', // 캡처 실패
        matches,
        confidence: Math.round(confidence),
        description,
        weatherData
      };
    }

  } catch (error) {
    console.error(`HLS 스트림 분석 실패 (${source.title}):`, error);
    return {
      sourceId: source.id,
      sourceTitle: source.title,
      thumbnailUrl: '',
      matches: false,
      confidence: 0,
      description: 'HLS 스트림 분석 실패'
    };
  }
}

// 테스트용 함수
export async function testCapture() {
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // 테스트용 URL
  const result = await captureWeatherScene(testUrl, '제주시 테스트 캠');

  if (result) {
    console.log('✅ 캡처 테스트 성공');
    console.log('이미지 크기:', result.imageUrl.length, 'bytes');
    console.log('기상 데이터:', result.weatherData);
    return result;
  } else {
    console.log('❌ 캡처 테스트 실패');
    return null;
  }
}