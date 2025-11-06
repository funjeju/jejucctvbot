import React, { useEffect, useState } from 'react';

const VideoViewer: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    // URL 파라미터에서 비디오 URL과 제목 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get('url');
    const videoTitle = urlParams.get('title');

    if (url) {
      setVideoUrl(decodeURIComponent(url));
    }
    if (videoTitle) {
      setTitle(decodeURIComponent(videoTitle));
    }
  }, []);

  const handleBackClick = () => {
    // 새창이면 창 닫기, 아니면 이전 페이지로
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl">비디오 URL이 제공되지 않았습니다.</p>
          <button
            onClick={handleBackClick}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      {/* 뒤로가기 버튼 - 왼쪽 상단에 floating */}
      <button
        onClick={handleBackClick}
        className="absolute top-4 left-4 z-50 bg-black bg-opacity-70 hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg backdrop-blur-sm"
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
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        돌아가기
      </button>

      {/* 제목 표시 - 오른쪽 상단 */}
      {title && (
        <div className="absolute top-4 right-4 z-40 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      )}

      {/* HTTP 사이트를 iframe으로 표시 */}
      <iframe
        src={videoUrl}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; camera; microphone"
        allowFullScreen
        title={title || "비디오 뷰어"}
      />
    </div>
  );
};

export default VideoViewer;