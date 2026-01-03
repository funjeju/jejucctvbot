/**
 * 유튜브 URL에서 videoId를 추출하는 통합 함수
 * 지원 형식:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export const extractYouTubeId = (url: string): string => {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').replace('m.', '');

    // youtu.be 형식
    if (hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }

    // youtube.com 형식
    if (hostname === 'youtube.com') {
      // watch?v= 형식
      const vParam = urlObj.searchParams.get('v');
      if (vParam) {
        return vParam;
      }

      // /embed/VIDEO_ID 형식
      const embedMatch = urlObj.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) {
        return embedMatch[1];
      }

      // /live/VIDEO_ID 형식
      const liveMatch = urlObj.pathname.match(/\/live\/([^/?]+)/);
      if (liveMatch) {
        return liveMatch[1];
      }

      // /shorts/VIDEO_ID 형식
      const shortsMatch = urlObj.pathname.match(/\/shorts\/([^/?]+)/);
      if (shortsMatch) {
        return shortsMatch[1];
      }

      // /v/VIDEO_ID 형식 (구형)
      const vMatch = urlObj.pathname.match(/\/v\/([^/?]+)/);
      if (vMatch) {
        return vMatch[1];
      }
    }

    return '';
  } catch (error) {
    console.error('YouTube URL 파싱 실패:', error, url);
    return '';
  }
};

/**
 * 유튜브 URL을 임베드 URL로 변환
 * @param url 원본 유튜브 URL
 * @param options 임베드 옵션 (autoplay, mute 등)
 */
export const toEmbedUrl = (url: string, options?: {
  autoplay?: boolean;
  mute?: boolean;
  controls?: boolean;
  modestbranding?: boolean;
  rel?: boolean;
  playsinline?: boolean;
}): string => {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    console.warn('유효한 YouTube videoId를 찾을 수 없습니다:', url);
    return url;
  }

  const params = new URLSearchParams({
    autoplay: options?.autoplay ? '1' : '0',
    mute: options?.mute ? '1' : '0',
    playsinline: options?.playsinline ? '1' : '0',
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
};

/**
 * 유튜브 썸네일 URL 생성
 * @param url 원본 유튜브 URL
 * @param quality 썸네일 품질 (default, mqdefault, hqdefault, sddefault, maxresdefault)
 */
export const getThumbnailUrl = (url: string, quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'maxresdefault'): string => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
};

/**
 * 유튜브 URL 유효성 검증
 */
export const isValidYouTubeUrl = (url: string): boolean => {
  return extractYouTubeId(url) !== '';
};
