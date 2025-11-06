import React, { useState, useEffect } from 'react';
import type { WeatherSource, Place, OroomData, NewsItem } from '../types';
import CCTVList from './CCTVList';
import YouTubePlayer from './YouTubePlayer';
import LiveChatRoom from './LiveChatRoom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface CCTVViewerProps {
  spots: Place[];
  orooms: OroomData[];
  news: NewsItem[];
}

const CCTVViewer: React.FC<CCTVViewerProps> = ({ spots, orooms, news }) => {
  const [cctvs, setCCTVs] = useState<WeatherSource[]>([]);
  const [selectedCCTV, setSelectedCCTV] = useState<WeatherSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Firestore에서 weatherSources 실시간 로드
  useEffect(() => {
    console.log('WeatherSources Firestore 리스너 설정 중...');
    const q = query(collection(db, 'weatherSources'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cctvArray: WeatherSource[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          cctvArray.push({
            id: doc.id,
            youtubeUrl: data.youtubeUrl,
            title: data.title,
            apiKey: data.apiKey || '',
            direction: data.direction,
            keywords: data.keywords || [],
            latitude: data.latitude,
            longitude: data.longitude,
          } as WeatherSource);
        });
        setCCTVs(cctvArray);
        setIsLoading(false);

        // 첫 번째 CCTV 자동 선택
        if (cctvArray.length > 0 && !selectedCCTV) {
          setSelectedCCTV(cctvArray[0]);
        }

        console.log(`Firestore에서 ${cctvArray.length}개의 날씨 CCTV를 불러왔습니다.`);
      },
      (error) => {
        console.error('WeatherSources 로딩 실패:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSelectCCTV = (cctv: WeatherSource) => {
    setSelectedCCTV(cctv);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">CCTV 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (cctvs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">등록된 CCTV가 없습니다</h2>
          <p className="text-gray-600">
            관리자에게 CCTV 스트림을 등록해달라고 요청하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* 헤더 */}
        <header className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">제주 라이브 CCTV</h1>
              <p className="text-gray-600 mt-1">실시간 영상과 함께 제주를 느껴보세요</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                {cctvs.length}개 라이브
              </span>
            </div>
          </div>
        </header>

        {/* CCTV 목록 (상단) */}
        <CCTVList cctvs={cctvs} selectedCCTV={selectedCCTV} onSelect={handleSelectCCTV} />

        {/* 메인 콘텐츠 영역 */}
        {selectedCCTV && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 영상 플레이어 (왼쪽 2/3) */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow-md rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <YouTubePlayer
                  videoUrl={selectedCCTV.youtubeUrl}
                  title={selectedCCTV.title}
                />
              </div>
            </div>

            {/* 채팅 영역 (오른쪽 1/3) */}
            <div className="lg:col-span-1">
              <LiveChatRoom
                cctv={selectedCCTV}
                spots={spots}
                orooms={orooms}
                news={news}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CCTVViewer;
