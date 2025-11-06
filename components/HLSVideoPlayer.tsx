import React, { useEffect, useRef, useState } from 'react';

interface HLSVideoPlayerProps {
  src: string;
  title: string;
  onClose?: () => void;
  autoPlay?: boolean;
}

const HLSVideoPlayer: React.FC<HLSVideoPlayerProps> = ({
  src,
  title,
  onClose,
  autoPlay = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initHLSPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(`HLS 플레이어 초기화 시작: ${title} - ${src}`);

        // HLS.js 동적 로드
        const { default: Hls } = await import('hls.js');

        if (Hls.isSupported()) {
          // HLS.js 사용
          const hls = new Hls({
            // LL-HLS 최적화 설정
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            // CORS 및 Mixed Content 처리
            xhrSetup: (xhr: any, url: string) => {
              // HTTP -> HTTPS 프록시 처리
              if (url.startsWith('http://') && window.location.protocol === 'https:') {
                const proxyUrl = `/api/proxy/hls?url=${encodeURIComponent(url)}`;
                xhr.open('GET', proxyUrl, true);
                return;
              }
              xhr.open('GET', url, true);
            },
            // CODECS 우선순위 설정
            abrEwmaDefaultEstimate: 500000,
            enableWorker: true,
            // 에러 허용도 높이기
            fragLoadingTimeOut: 20000,
            manifestLoadingTimeOut: 10000,
            fragLoadingMaxRetry: 6,
            // 트랜스먹싱 설정
            forceKeyFrameOnDiscontinuity: true,
            ignoreDevicePixelRatio: true,
          });

          hlsRef.current = hls;

          // 이벤트 리스너 등록
          hls.on(Hls.Events.MANIFEST_LOADED, () => {
            console.log(`마스터 플레이리스트 로드 완료: ${title}`);
            setIsLoading(false);

            // 최적 품질 선택 (avc1 + mp4a 코덱 우선)
            const levels = hls.levels;
            console.log('사용 가능한 품질:', levels.map(l => ({
              width: l.width,
              height: l.height,
              bitrate: l.bitrate,
              codecs: l.videoCodec + ',' + l.audioCodec
            })));
          });

          hls.on(Hls.Events.FRAG_LOADED, () => {
            if (autoPlay && video.paused) {
              video.play().catch(e => console.log('자동 재생 실패:', e));
            }
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS 오류:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('네트워크 오류 - 복구 시도');
                  setError('네트워크 연결을 확인해주세요');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('미디어 오류 - 복구 시도');
                  setError('스트림에 문제가 있습니다');
                  hls.recoverMediaError();
                  break;
                default:
                  console.log('복구 불가능한 오류');
                  setError('재생할 수 없는 스트림입니다');
                  hls.destroy();
                  break;
              }
            }
          });

          // 소스 로드
          let finalSrc = src;
          if (src.startsWith('http://') && window.location.protocol === 'https:') {
            finalSrc = `/api/proxy/hls?url=${encodeURIComponent(src)}`;
          }

          hls.loadSource(finalSrc);
          hls.attachMedia(video);

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari 네이티브 HLS 지원
          console.log('Safari 네이티브 HLS 사용');
          video.src = src;
          video.addEventListener('loadeddata', () => {
            console.log(`비디오 로딩 완료: ${title}`);
            setIsLoading(false);
            if (autoPlay) {
              video.play().catch(e => console.log('자동 재생 실패:', e));
            }
          });
        } else {
          setError('HLS 재생이 지원되지 않는 브라우저입니다');
          setIsLoading(false);
        }

        // 비디오 에러 처리
        video.addEventListener('error', (e) => {
          console.error('비디오 재생 오류:', e);
          setError('비디오 재생 중 오류가 발생했습니다');
          setIsLoading(false);
        });

      } catch (error) {
        console.error('HLS 플레이어 초기화 실패:', error);
        setError('플레이어 초기화에 실패했습니다');
        setIsLoading(false);
      }
    };

    initHLSPlayer();

    // 정리 함수
    return () => {
      console.log(`HLS 플레이어 정리 중: ${title}`);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
    };
  }, [src, title, autoPlay]);

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
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 비디오 플레이어 */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>HLS 스트림 로딩 중...</p>
            </div>
          </div>
        )}


        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          playsInline
          muted={false}
          style={{ maxHeight: '100%' }}
        >
          브라우저가 HLS 스트리밍을 지원하지 않습니다.
        </video>
      </div>

      {/* 하단 정보 */}
      <div className="p-2 bg-gray-900 text-gray-300 text-xs">
        <div className="flex items-center justify-between">
          <span>실시간 스트리밍</span>
          <span className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
};

export default HLSVideoPlayer;