import React, { useState, useEffect, useRef } from 'react';
import type { WeatherSource } from '../types';
import Modal from './common/Modal';
import HLSVideoPlayer from './HLSVideoPlayer';
import VideoJSPlayer from './VideoJSPlayer';

// Helper to detect video type
const getVideoType = (url: string, title: string): 'youtube' | 'hls' | 'newWindow' => {
  try {
    const urlObj = new URL(url);

    // 유튜브는 모달에서 재생
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com' || urlObj.hostname === 'youtu.be') {
      return 'youtube';
    }

    // play.m3u8로 끝나는 것은 새창에서 플레이어 페이지로 재생
    if (url.endsWith('play.m3u8')) {
      return 'newWindow';
    }

    // playlist.m3u8로 끝나는 것은 새창으로 띄우기
    if (url.endsWith('playlist.m3u8')) {
      return 'newWindow';
    }

    // 나머지는 모두 새창
    return 'newWindow';
  } catch (error) {
    return 'newWindow';
  }
};

// Helper to convert YouTube watch URL to embed URL
const getYouTubeEmbedUrl = (url: string): string | null => {
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.substring(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
};

// Helper to truncate text
const truncate = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.substring(0, length);
};

// Helper to convert URLs to use HLS proxy for HTTPS compatibility
const convertToProxyUrl = (url: string): string => {
  // 모든 m3u8 URL을 자체 프록시로 처리
  if (url.includes('.m3u8')) {
    return `/api/proxy/hls?url=${encodeURIComponent(url)}`;
  }
  return url;
};

// Helper to classify regions
const getRegion = (title: string): '동쪽' | '서쪽' | '남쪽' | '북쪽' => {
  const eastKeywords = ['성산', '구좌', '우도', '세화', '하도', '종달'];
  const westKeywords = ['고산', '한림', '애월', '한경', '협재', '금릉'];
  const southKeywords = ['서귀포', '중문', '색달', '남원', '표선', '대정', '모슬포', '마라도'];
  const northKeywords = ['제주시', '조천', '노형', '연동', '이도', '삼도', '용담', '도두'];

  const titleLower = title.toLowerCase();

  if (eastKeywords.some(keyword => titleLower.includes(keyword))) return '동쪽';
  if (westKeywords.some(keyword => titleLower.includes(keyword))) return '서쪽';
  if (southKeywords.some(keyword => titleLower.includes(keyword))) return '남쪽';
  if (northKeywords.some(keyword => titleLower.includes(keyword))) return '북쪽';

  // 기본값: 제주시 관련이면 북쪽, 서귀포 관련이면 남쪽
  if (titleLower.includes('제주')) return '북쪽';
  if (titleLower.includes('서귀포')) return '남쪽';

  return '북쪽'; // 기본값
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
      const proxyUrl = convertToProxyUrl(src);
      hls.loadSource(proxyUrl);
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
      const proxyUrl = convertToProxyUrl(src);
      video.src = proxyUrl;
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

interface LiveWeatherViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: WeatherSource[];
}

const LiveWeatherViewModal: React.FC<LiveWeatherViewModalProps> = ({ isOpen, onClose, sources }) => {
  const [activeSource, setActiveSource] = useState<WeatherSource | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<'전체' | '동쪽' | '서쪽' | '남쪽' | '북쪽'>('전체');

  // Filter sources by region
  const filteredSources = selectedRegion === '전체'
    ? sources
    : sources.filter(source => getRegion(source.title) === selectedRegion);

  useEffect(() => {
    // Set the first source as active when the modal opens or if sources change
    if (isOpen && sources.length > 0) {
      if (!activeSource || !sources.find(s => s.id === activeSource.id)) {
        setActiveSource(sources[0]);
      }
    } else if (!isOpen) {
      setActiveSource(null); // Reset when closed
    }
  }, [isOpen, sources]); // activeSource 제거

  // Update active source when region filter changes
  useEffect(() => {
    if (filteredSources.length > 0) {
      // If current active source is not in filtered list, select first from filtered list
      if (!activeSource || !filteredSources.find(s => s.id === activeSource.id)) {
        setActiveSource(filteredSources[0]);
      }
    } else {
      setActiveSource(null);
    }
  }, [selectedRegion]); // filteredSources와 activeSource 제거

  const videoType = activeSource ? getVideoType(activeSource.youtubeUrl, activeSource.title) : 'newWindow';
  const embedUrl = activeSource && videoType === 'youtube' ? getYouTubeEmbedUrl(activeSource.youtubeUrl) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="실시간 날씨 영상">
      <div className="flex flex-col h-[80vh] max-h-[700px]">
        {sources.length > 0 ? (
          <>
            {/* Region Filter Bar */}
            <nav className="flex items-center space-x-2 border-b pb-3 mb-4">
              {['전체', '동쪽', '서쪽', '남쪽', '북쪽'].map(region => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region as typeof selectedRegion)}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    selectedRegion === region
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {region}
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-auto">
                {filteredSources.length}개 지역
              </span>
            </nav>

            {/* Current Video Player */}
            {activeSource && (
              <div className="mb-4">
                <div className="bg-black rounded-lg overflow-hidden aspect-video">
                  {videoType === 'youtube' && embedUrl ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={embedUrl}
                      title={activeSource?.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : videoType === 'hls' && activeSource ? (
                    <VideoJSPlayer
                      src={activeSource.youtubeUrl}
                      title={activeSource.title}
                      autoPlay={true}
                    />
                  ) : videoType === 'newWindow' && activeSource ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold mb-2">{activeSource.title}</h3>
                        <p className="text-sm text-gray-300 mb-4">
                          실시간 영상을 새창에서 확인하세요
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const videoType = getVideoType(activeSource.youtubeUrl, activeSource.title);
                          if (videoType === 'newWindow' && activeSource.youtubeUrl.endsWith('play.m3u8')) {
                            // HLS 스트림은 플레이어 페이지에서 열기
                            const playerUrl = `/player.html?url=${encodeURIComponent(activeSource.youtubeUrl)}&title=${encodeURIComponent(activeSource.title)}`;
                            window.open(playerUrl, '_blank', 'width=1320,height=800');
                          } else {
                            // 기존 방식으로 직접 열기
                            window.open(activeSource.youtubeUrl, '_blank');
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        🎬 영상 보기
                      </button>
                    </div>
                  ) : (
                    <p className="text-white flex items-center justify-center h-full">영상 소스를 선택해주세요.</p>
                  )}
                </div>
                <p className="text-center text-sm text-gray-600 mt-2 font-semibold">{activeSource.title}</p>
              </div>
            )}

            {/* Grid Layout - 7 items per row */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-7 gap-2">
                {filteredSources.map(source => (
                  <button
                    key={source.id}
                    onClick={() => setActiveSource(source)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors text-center ${
                      activeSource?.id === source.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={source.title}
                  >
                    {truncate(source.title, 7)}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>표시할 날씨 정보 소스가 없습니다.</p>
            <p className="text-xs mt-1">먼저 날씨 정보 소스를 추가해주세요.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default LiveWeatherViewModal;