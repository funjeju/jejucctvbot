import React, { useEffect, useRef, useState } from 'react';

interface VideoJSPlayerProps {
  src: string;
  title: string;
  onClose?: () => void;
  autoPlay?: boolean;
}

const VideoJSPlayer: React.FC<VideoJSPlayerProps> = ({
  src,
  title,
  onClose,
  autoPlay = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initVideoJSPlayer = async () => {
      if (!videoRef.current) return;

      try {
        console.log(`Video.js 플레이어 초기화 시작: ${title} - ${src}`);

        // Video.js 동적 로드
        const videojs = (await import('video.js')).default;

        // CSS 동적 로드
        if (!document.querySelector('link[href*="video-js.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://vjs.zencdn.net/8.8.0/video.min.css';
          document.head.appendChild(link);
        }

        // 프록시 URL 설정
        let finalSrc = src;
        if (src.startsWith('http://') && window.location.protocol === 'https:') {
          finalSrc = `/api/proxy/hls?url=${encodeURIComponent(src)}`;
          console.log('HTTPS 환경에서 HTTP 스트림 프록시 적용:', finalSrc);
        }

        // Video.js 플레이어 생성
        const player = videojs(videoRef.current, {
          controls: true,
          autoplay: 'muted',
          preload: 'auto',
          fluid: true,
          responsive: true,
          html5: {
            hls: {
              overrideNative: true,
              enableLowInitialPlaylist: true,
              smoothQualityChange: true,
            }
          }
        });

        playerRef.current = player;

        // 소스 설정
        player.src({
          src: finalSrc,
          type: 'application/x-mpegURL'
        });

        // 이벤트 리스너
        player.ready(() => {
          console.log(`Video.js 플레이어 준비 완료: ${title}`);
          setIsLoading(false);
        });

        player.on('error', () => {
          const error = player.error();
          console.log('Video.js 오류:', error);
          setError('재생 중 오류가 발생했습니다');
          setIsLoading(false);
        });

        player.on('loadstart', () => {
          console.log(`스트림 로딩 시작: ${title}`);
          setIsLoading(true);
        });

        player.on('canplay', () => {
          console.log(`재생 준비 완료: ${title}`);
          setIsLoading(false);
          if (autoPlay) {
            player.play().catch((error: any) => {
              console.log('자동 재생 실패:', error);
            });
          }
        });

      } catch (error) {
        console.error('Video.js 초기화 실패:', error);
        setError('플레이어 초기화에 실패했습니다');
        setIsLoading(false);
      }
    };

    initVideoJSPlayer();

    // 정리 함수
    return () => {
      console.log(`Video.js 플레이어 정리 중: ${title}`);
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, title, autoPlay]);

  if (error) {
    return (
      <div className="w-full h-full bg-black flex flex-col">
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
          <h2 className="text-lg font-semibold truncate">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-gray-700 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-white">
          <div className="text-center">
            <p className="text-xl mb-2">⚠️</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <h2 className="text-lg font-semibold truncate">{title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-700 rounded-full transition-colors"
            title="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 비디오 플레이어 */}
      <div className="flex-1 bg-black relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Video.js 스트림 로딩 중...</p>
            </div>
          </div>
        )}

        <div data-vjs-player className="h-full">
          <video
            ref={videoRef}
            className="video-js vjs-default-skin w-full h-full"
            playsInline
            data-setup="{}"
          />
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="p-2 bg-gray-900 text-gray-300 text-xs">
        <div className="flex items-center justify-between">
          <span>실시간 스트리밍 (Video.js)</span>
          <span className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoJSPlayer;