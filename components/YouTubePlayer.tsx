import React, { useRef, useState, useEffect } from 'react';

interface YouTubePlayerProps {
  videoUrl: string;
  title: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoUrl, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // videoUrl 바뀌면 재생 상태 초기화
  useEffect(() => {
    setIsPlaying(false);
  }, [videoUrl]);

  // YouTube URL에서 videoId 추출
  const getVideoId = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // youtu.be 형식
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
      // youtube.com/watch?v= 형식
      else if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v') || '';
      }
      // embed URL인 경우
      else if (url.includes('/embed/')) {
        const match = url.match(/\/embed\/([^?]+)/);
        return match ? match[1] : '';
      }
      return '';
    } catch (error) {
      console.error('URL 파싱 실패:', error);
      return '';
    }
  };

  // YouTube URL을 embed URL로 변환
  const getEmbedUrl = (url: string): string => {
    const videoId = getVideoId(url);
    if (videoId) {
      // 성능 최적화 파라미터:
      // - autoplay=1: 자동 재생
      // - playsinline=1: 모바일에서 인라인 재생
      // - modestbranding=1: YouTube 로고 최소화
      // - rel=0: 관련 동영상 최소화
      // - preload=auto: 미리 로드
      const params = new URLSearchParams({
        autoplay: '1',
        mute: '1',
        playsinline: '1',
        modestbranding: '1',
        rel: '0',
        controls: '1',
        disablekb: '0',
      });
      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }
    return url;
  };

  const videoId = getVideoId(videoUrl);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

  // 재생 버튼 클릭 시
  const handlePlay = () => {
    setIsPlaying(true);
  };

  return (
    <div className="absolute inset-0 bg-black">
      {/* YouTube iframe - 항상 로드 */}
      <iframe
        ref={iframeRef}
        src={getEmbedUrl(videoUrl)}
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
