import React, { useRef, useState, useEffect } from 'react';
import { extractYouTubeId, toEmbedUrl, getThumbnailUrl } from '../utils/youtube';

interface YouTubePlayerProps {
  videoUrl: string;
  title: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoUrl, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderStart] = useState(performance.now());

  // videoUrl 바뀌면 재생 상태 초기화
  useEffect(() => {
    setIsPlaying(false);
  }, [videoUrl]);

  // 5. URL 생성 시간 측정
  const urlGenStart = performance.now();
  const videoId = extractYouTubeId(videoUrl);
  const embedUrl = toEmbedUrl(videoUrl, {
    autoplay: true,
    mute: true,
    playsinline: true,
    modestbranding: true,
    rel: false,
    controls: true,
  });
  const thumbnailUrl = getThumbnailUrl(videoUrl);
  const urlGenEnd = performance.now();

  useEffect(() => {
    console.log(`⏱️ [Cam&Chat][5] URL 생성 완료: ${(urlGenEnd - urlGenStart).toFixed(2)}ms`);
  }, [embedUrl]);

  // 재생 버튼 클릭 시
  const handlePlay = () => {
    setIsPlaying(true);
  };

  return (
    <div className="absolute inset-0 bg-black">
      {/* YouTube iframe - 최고 우선순위로 즉시 로드 */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title={title}
        style={{ border: 'none' }}
        loading="eager"
        fetchpriority="high"
        importance="high"
        referrerPolicy="origin"
        onLoad={() => {
          // 6. iframe 로드 완료
          const loadEnd = performance.now();
          const totalTime = loadEnd - renderStart;
          console.log(`⏱️ [Cam&Chat][6] iframe 로드 완료: ${totalTime.toFixed(2)}ms`);
          console.log(`📊 [Cam&Chat] === 전체 로딩 시간 ===`);
          console.log(`   총 소요 시간: ${totalTime.toFixed(2)}ms`);
        }}
      />
    </div>
  );
};

export default YouTubePlayer;
