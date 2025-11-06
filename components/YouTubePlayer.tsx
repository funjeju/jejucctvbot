import React, { useRef } from 'react';

interface YouTubePlayerProps {
  videoUrl: string;
  title: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoUrl, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // YouTube URL을 embed URL로 변환
  const getEmbedUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);

      // youtu.be 형식
      if (urlObj.hostname === 'youtu.be') {
        const videoId = urlObj.pathname.slice(1);
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`;
      }

      // youtube.com/watch?v= 형식
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`;
        }
      }

      // 이미 embed URL인 경우
      if (url.includes('/embed/')) {
        return url;
      }

      // 그 외의 경우 그대로 반환
      return url;
    } catch (error) {
      console.error('URL 파싱 실패:', error);
      return url;
    }
  };

  const embedUrl = getEmbedUrl(videoUrl);

  // 화면 캡처 함수
  const handleCapture = async () => {
    try {
      // 현재 탭 캡처
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' as any }
      });

      // 비디오 트랙 가져오기
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);

      // 프레임 캡처
      const bitmap = await imageCapture.grabFrame();

      // Canvas에 그리기
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(bitmap, 0, 0);

      // 이미지로 변환 및 다운로드
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `제주CCTV_${title}_${new Date().getTime()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });

      // 스트림 정리
      track.stop();
    } catch (error) {
      console.error('캡처 실패:', error);
      alert('화면 캡처를 실패했습니다. 브라우저에서 화면 공유 권한을 허용해주세요.');
    }
  };

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <h2 className="text-lg font-semibold truncate">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="flex items-center text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            LIVE
          </span>
        </div>
      </div>

      {/* YouTube iframe */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
          style={{ border: 'none' }}
        />
      </div>

      {/* 하단 정보 및 캡처 버튼 */}
      <div className="p-3 bg-gray-900 text-gray-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs">YouTube 라이브 스트리밍</span>
          <span className="text-xs">제주 실시간 날씨 CCTV</span>
        </div>
        <button
          onClick={handleCapture}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          화면 캡처
        </button>
      </div>
    </div>
  );
};

export default YouTubePlayer;
