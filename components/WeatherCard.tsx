import React, { useState, useEffect, useRef } from 'react';
import type { WeatherCardData } from '../types';
import Spinner from './common/Spinner';
import Modal from './common/Modal';
import Hls from 'hls.js';

interface WeatherCardProps {
  initialData: WeatherCardData;
  onComplete: () => void;
  skipAnimation?: boolean; // 애니메이션 스킵 옵션
}

const statusMessages: Record<WeatherCardData['status'], string> = {
  analyzing: '[1/3] 실시간 스트림 주소 분석 중... (yt-dlp)',
  capturing: '[2/3] 최신 영상 프레임 캡처 중... (ffmpeg)',
  overlaying: '[3/3] 기상청 데이터 수신 및 오버레이 중...',
  done: '실시간 날씨 분석 완료',
};

const WeatherCard: React.FC<WeatherCardProps> = ({ initialData, onComplete, skipAnimation = false }) => {
  const [status, setStatus] = useState<WeatherCardData['status']>(skipAnimation ? 'done' : 'analyzing');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // By storing the onComplete callback in a ref, we can avoid including it in the
  // useEffect dependency array. This prevents the effect from re-running (and thus
  // calling onComplete again) when the parent component re-renders.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    // 애니메이션을 스킵하는 경우 즉시 완료 처리
    if (skipAnimation && status === 'done') {
      return;
    }

    const nextStatusMap: Record<string, WeatherCardData['status']> = {
      analyzing: 'capturing',
      capturing: 'overlaying',
      overlaying: 'done',
    };

    // If the process is already done, do nothing.
    if (status === 'done') {
      return;
    }

    const timer = setTimeout(() => {
      const nextStatus = nextStatusMap[status];
      if (nextStatus) {
        setStatus(nextStatus);
        // If the next step is the final one, call the completion handler.
        if (nextStatus === 'done') {
          onCompleteRef.current();
        }
      }
    }, 1500); // Simulate each step taking 1.5 seconds

    return () => clearTimeout(timer);
  }, [status, skipAnimation]); // This effect now only depends on its internal state machine.


  if (status !== 'done') {
    return (
      <div className="p-3 bg-white border rounded-lg shadow-sm">
        <h4 className="font-bold text-gray-800 mb-2">{initialData.sourceTitle} 실시간 날씨</h4>

        {/* 로딩 중에도 재생버튼이 있는 썸네일 표시 */}
        <div className="relative rounded-lg overflow-hidden mb-3">
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <div className="text-center">
              <Spinner />
              <p className="text-sm text-gray-600 mt-2">{statusMessages[status]}</p>
            </div>
          </div>

          {/* 로딩 중에도 재생버튼 표시 */}
          {initialData.youtubeUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => {
                  // play.m3u8는 바로 새창으로, 나머지는 모달로
                  if (initialData.youtubeUrl && initialData.youtubeUrl.endsWith('play.m3u8')) {
                    const playerUrl = `/player.html?url=${encodeURIComponent(initialData.youtubeUrl)}&title=${encodeURIComponent(initialData.title)}`;
                    window.open(playerUrl, '_blank', 'width=1320,height=800');
                  } else {
                    setIsVideoModalOpen(true);
                  }
                }}
                className="bg-red-600 bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-6 shadow-xl transition-all duration-200 transform hover:scale-110"
                title="실시간 영상 재생"
              >
                <svg className="w-12 h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Spinner />
          <p className="text-sm text-gray-600">{statusMessages[status]}</p>
        </div>
      </div>
    );
  }

  // 영상 타입 감지 함수
  const getVideoType = (url: string): 'youtube' | 'hls' | 'unknown' => {
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
  };

  // 유튜브 영상 ID 추출 함수
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // HLS Video Component
  const HLSVideo: React.FC<{ src: string; title: string }> = ({ src, title }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Cleanup previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        // Use HLS.js for browsers that don't support HLS natively
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed, starting playback');
          video.play().catch(console.error);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari which supports HLS natively
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(console.error);
        });
      } else {
        console.error('HLS is not supported in this browser');
      }

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }, [src]);

    return (
      <video
        ref={videoRef}
        controls
        muted
        className="w-full h-full"
        title={title}
      />
    );
  };

  const handlePlayVideo = () => {
    if (initialData.youtubeUrl) {
      setIsVideoModalOpen(true);
    }
  };

  return (
    <>
      <div className="p-3 bg-white border rounded-lg shadow-sm">
          <h4 className="font-bold text-gray-800 mb-2">{initialData.sourceTitle} 실시간 날씨</h4>
          <div className="relative rounded-lg overflow-hidden">
              <img
                  src={initialData.imageUrl}
                  alt={`${initialData.sourceTitle} live camera feed`}
                  className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsImageModalOpen(true)}
                  title="클릭하여 확대"
              />

              {/* 플레이 버튼 오버레이 */}
              {initialData.youtubeUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handlePlayVideo}
                    className="bg-red-600 bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-6 shadow-xl transition-all duration-200 transform hover:scale-110"
                    title="실시간 영상 재생"
                  >
                    <svg className="w-12 h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </div>
              )}

              <div className="absolute bottom-0 left-0 w-full p-2 bg-black bg-opacity-50 text-white">
                  <div className="flex justify-between items-center mb-1">
                      <div className="text-xs">
                          📍 <span className="font-semibold">{initialData.weatherData?.location || '제주'}</span>
                      </div>
                      <div className="text-xs font-semibold">
                          {initialData.weatherData?.weather || '맑음'}
                      </div>
                  </div>
                  <div className="flex justify-around text-center">
                      <div>
                          <p className="text-[10px] opacity-80">현재 기온</p>
                          <p className="font-bold text-sm">{initialData.weatherData?.temp || '분석중...'}</p>
                      </div>
                      <div>
                          <p className="text-[10px] opacity-80">습도</p>
                          <p className="font-bold text-sm">{initialData.weatherData?.humidity || '분석중...'}</p>
                      </div>
                      <div>
                          <p className="text-[10px] opacity-80">풍속</p>
                          <p className="font-bold text-sm">{initialData.weatherData?.wind || '분석중...'}</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 이미지 확대 모달 */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title={`${initialData.sourceTitle} 실시간 영상`}
      >
        <div className="max-w-6xl mx-auto">
          <img
            src={initialData.imageUrl}
            alt={`${initialData.sourceTitle} live camera feed - 확대`}
            className="w-full h-auto object-contain max-h-[80vh]"
          />
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-semibold text-gray-800 mb-3">현재 기상 정보</h5>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">현재 기온</p>
                <p className="text-2xl font-bold text-red-500">{initialData.weatherData?.temp || '정보없음'}</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">습도</p>
                <p className="text-2xl font-bold text-blue-500">{initialData.weatherData?.humidity || '정보없음'}</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">풍속</p>
                <p className="text-2xl font-bold text-green-500">{initialData.weatherData?.wind || '정보없음'}</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 유튜브 영상 재생 모달 */}
      <Modal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        title={`${initialData.sourceTitle} 라이브 영상`}
      >
        <div className="max-w-4xl mx-auto">
          {initialData.youtubeUrl && (() => {
            const videoType = getVideoType(initialData.youtubeUrl);

            if (videoType === 'youtube') {
              const videoId = getYouTubeVideoId(initialData.youtubeUrl);
              return videoId ? (
                <div className="relative aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
                    title={`${initialData.sourceTitle} YouTube Live Stream`}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">유효하지 않은 YouTube URL입니다.</p>
                  <a
                    href={initialData.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline mt-2 inline-block"
                  >
                    원본 영상에서 보기 →
                  </a>
                </div>
              );
            } else if (videoType === 'hls') {
              return (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <HLSVideo
                    src={initialData.youtubeUrl}
                    title={initialData.sourceTitle}
                  />
                </div>
              );
            } else {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-600">지원되지 않는 영상 형식입니다.</p>
                  <a
                    href={initialData.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline mt-2 inline-block"
                  >
                    원본 영상에서 보기 →
                  </a>
                </div>
              );
            }
          })()}

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-semibold text-gray-800 mb-3">현재 기상 정보</h5>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">현재 기온</p>
                <p className="text-2xl font-bold text-red-500">{initialData.weatherData?.temp || '정보없음'}</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">습도</p>
                <p className="text-2xl font-bold text-blue-500">{initialData.weatherData?.humidity || '정보없음'}</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">풍속</p>
                <p className="text-2xl font-bold text-green-500">{initialData.weatherData?.wind || '정보없음'}</p>
              </div>
            </div>

            {/* 원본 영상에서 보기 링크 */}
            <div className="mt-4 text-center">
              <a
                href={initialData.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                원본 영상에서 보기
              </a>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default WeatherCard;
