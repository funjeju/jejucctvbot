import React, { useRef } from 'react';

interface YouTubePlayerProps {
  videoUrl: string;
  title: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoUrl, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // YouTube URL을 embed URL로 변환 (성능 최적화 파라미터 추가)
  const getEmbedUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      let videoId = '';

      // youtu.be 형식
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      }
      // youtube.com/watch?v= 형식
      else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || '';
      }
      // 이미 embed URL인 경우
      else if (url.includes('/embed/')) {
        return url;
      }

      if (videoId) {
        // 성능 최적화 파라미터:
        // - autoplay=1: 자동 재생
        // - mute=0: 음소거 해제
        // - playsinline=1: 모바일에서 인라인 재생
        // - modestbranding=1: YouTube 로고 최소화
        // - rel=0: 관련 동영상 최소화
        // - enablejsapi=1: JavaScript API 활성화
        const params = new URLSearchParams({
          autoplay: '1',
          mute: '0',
          playsinline: '1',
          modestbranding: '1',
          rel: '0',
          enablejsapi: '1',
        });
        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
      }

      return url;
    } catch (error) {
      console.error('URL 파싱 실패:', error);
      return url;
    }
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div className="absolute inset-0 bg-black">
      {/* YouTube iframe - 즉시 로드 */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title={title}
        style={{ border: 'none' }}
      />
    </div>
  );
};

export default YouTubePlayer;
