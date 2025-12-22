import React, { useState, useEffect } from 'react';
import type { WeatherSource, Place, OroomData, NewsItem, Doodle, DoodleCreateData } from '../types';
import CCTVList from './CCTVList';
import YouTubePlayer from './YouTubePlayer';
import LiveChatRoom from './LiveChatRoom';
import Feed from './Feed';
import MyPage from './MyPage';
import Navigation from './Navigation';
import DoodleInputModal from './DoodleInputModal';
import DoodleOverlay from './DoodleOverlay';
import TripPlannerModal from './TripPlannerModal';
import Chatbot from './Chatbot';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Paintbrush } from 'lucide-react';

interface CCTVViewerProps {
  spots: Place[];
  orooms: OroomData[];
  news: NewsItem[];
}

// 다국어 텍스트
const translations = {
  KOR: {
    title: '제주 라이브 CCTV',
    subtitle: '실시간 영상과 함께 제주를 느껴보세요',
    live: '개 라이브',
    noCCTV: '등록된 CCTV가 없습니다',
    noCCTVDesc: '관리자에게 CCTV 스트림을 등록해달라고 요청하세요.',
    loading: 'CCTV 목록을 불러오는 중...',
  },
  ENG: {
    title: 'Jeju Live CCTV',
    subtitle: 'Experience Jeju through real-time footage',
    live: ' Live',
    noCCTV: 'No CCTV registered',
    noCCTVDesc: 'Please request the administrator to register CCTV streams.',
    loading: 'Loading CCTV list...',
  },
  CHN: {
    title: '济州实时监控',
    subtitle: '通过实时影像感受济州',
    live: '个直播',
    noCCTV: '没有注册的监控',
    noCCTVDesc: '请要求管理员注册监控流。',
    loading: '正在加载监控列表...',
  }
};

// 영상 타입 구분 함수
const getVideoType = (url: string): 'youtube' | 'newWindow' => {
  try {
    const urlObj = new URL(url);
    // 유튜브면 플레이어에서 재생
    if (urlObj.hostname === 'www.youtube.com' ||
      urlObj.hostname === 'youtube.com' ||
      urlObj.hostname === 'youtu.be') {
      return 'youtube';
    }
    // 나머지는 모두 새창
    return 'newWindow';
  } catch (error) {
    return 'newWindow';
  }
};

const CCTVViewer: React.FC<CCTVViewerProps> = ({ spots, orooms, news }) => {
  const { user } = useAuth();
  const [cctvs, setCCTVs] = useState<WeatherSource[]>([]);
  const [selectedCCTV, setSelectedCCTV] = useState<WeatherSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'KOR' | 'ENG' | 'CHN'>('KOR');
  const [currentPage, setCurrentPage] = useState<'feed' | 'cam' | 'tips' | 'mypage'>('feed');
  const [doodlesByVideo, setDoodlesByVideo] = useState<Record<string, Doodle[]>>({});
  const [isDoodleModalOpen, setIsDoodleModalOpen] = useState(false);
  const [isTripPlannerOpen, setIsTripPlannerOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [sessionId] = useState(() => {
    // 세션 ID 생성 또는 불러오기
    let id = sessionStorage.getItem('doodleSessionId');
    if (!id) {
      id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('doodleSessionId', id);
    }
    return id;
  });

  const t = translations[language];

  // 현재 선택된 영상의 낙서 목록 (로그인 사용자가 이미 받은 쿠폰은 제외)
  const currentDoodles = selectedCCTV
    ? (doodlesByVideo[selectedCCTV.id] || []).filter(doodle => {
      // 쿠폰이 아니면 표시
      if (doodle.type !== 'coupon') return true;

      // 로그인하지 않았으면 모든 쿠폰 표시
      if (!user) return true;

      // 로그인한 사용자가 이미 받은 쿠폰은 숨김
      const alreadyClaimed = doodle.claimedBy?.includes(user.uid);
      return !alreadyClaimed;
    })
    : [];

  // 디버깅: 현재 상태 로그
  useEffect(() => {
    if (selectedCCTV) {
      console.log('🎬 [CURRENT VIDEO]', selectedCCTV.id, '-', selectedCCTV.title);
      console.log('📊 [CURRENT DOODLES]', currentDoodles.length, '개');
      console.log('🗂️ [ALL VIDEOS]', Object.keys(doodlesByVideo));
    }
  }, [selectedCCTV, doodlesByVideo]);

  // 낙서 추가 핸들러 - Firestore에 저장
  const handleAddDoodle = async (data: DoodleCreateData) => {
    if (!selectedCCTV) return;

    try {
      console.log('📝 [DOODLE CREATE] 낙서 생성 시작:', data);
      console.log('🎥 [DOODLE CREATE] videoId:', selectedCCTV.id);
      console.log('🔑 [DOODLE CREATE] sessionId:', sessionId);
      const now = Date.now();
      const expiresAt = now + data.duration;

      const doodleData: any = {
        videoId: selectedCCTV.id,
        text: data.text || '',
        type: data.type,
        color: data.color,
        imageData: data.imageData || '',
        createdAt: now,
        duration: data.duration,
        expiresAt: expiresAt,
        sessionId: sessionId,
        position: {
          left: Math.random() * 60 + 10, // 10% ~ 70%
          top: Math.random() * 60 + 20, // 20% ~ 80%
        },
        widthPercent: 15, // 초기 크기 (화면 너비의 15%)
      };

      // 쿠폰인 경우 추가 필드 및 Firebase Auth 정보
      if (data.type === 'coupon') {
        // Firebase Auth 가져오기
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;

        doodleData.couponTitle = data.couponTitle || '';
        doodleData.couponDescription = data.couponDescription || '';
        doodleData.storeName = data.storeName || '';
        doodleData.storeAddress = data.storeAddress || '';
        doodleData.maxClaims = data.maxClaims || 1;
        doodleData.claimedBy = []; // 빈 배열로 초기화

        // Firebase Auth 사용자 정보 추가
        if (currentUser) {
          doodleData.issuedBy = currentUser.uid;
          doodleData.issuerName = currentUser.displayName || currentUser.email || '익명';
        } else {
          // 비로그인 사용자는 쿠폰 생성 불가
          alert('쿠폰을 생성하려면 로그인이 필요합니다.');
          return;
        }
      }

      // Firestore에 저장
      const docRef = await addDoc(collection(db, 'doodles'), doodleData);
      console.log('✅ [DOODLE CREATE] Firestore 저장 완료! docId:', docRef.id);
      console.log('✅ [DOODLE CREATE] 저장된 데이터:', doodleData);
    } catch (error) {
      console.error('Failed to save doodle:', error);
      alert('낙서 저장에 실패했습니다.');
    }
  };

  // 낙서 제거 핸들러 - Firestore에서 삭제
  const handleRemoveDoodle = async (id: string) => {
    if (!selectedCCTV) return;

    try {
      console.log('Deleting doodle from Firestore:', id);
      await deleteDoc(doc(db, 'doodles', id));
      console.log('Doodle deleted from Firestore');
    } catch (error) {
      console.error('Failed to delete doodle:', error);
      alert('낙서 삭제에 실패했습니다.');
    }
  };

  // 저장된 언어 설정 불러오기
  useEffect(() => {
    const storedLanguage = localStorage.getItem('chatLanguage') as 'KOR' | 'ENG' | 'CHN' | null;
    if (storedLanguage) {
      setLanguage(storedLanguage);
    }
  }, []);


  // Firestore에서 weatherSources 실시간 로드 - 'cam' 페이지 진입 시에만
  useEffect(() => {
    // 'cam' 페이지가 아니면 CCTV 목록 불러오지 않음
    if (currentPage !== 'cam') {
      setIsLoading(false);
      return;
    }

    console.log('WeatherSources Firestore 리스너 설정 중...');
    const q = query(collection(db, 'weatherSources'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cctvArray: WeatherSource[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // YouTube URL이거나, showInCamChat이 true인 항목만 추가
          const isYouTube = data.youtubeUrl && data.youtubeUrl.trim() !== '' &&
            (data.youtubeUrl.includes('youtube.com') || data.youtubeUrl.includes('youtu.be'));
          const showInCamChat = data.showInCamChat === true;

          if (data.youtubeUrl && data.youtubeUrl.trim() !== '' && (isYouTube || showInCamChat)) {
            cctvArray.push({
              id: doc.id,
              youtubeUrl: data.youtubeUrl,
              title: data.title,
              titleEng: data.titleEng,
              titleChn: data.titleChn,
              shortTitle: data.shortTitle,
              apiKey: data.apiKey || '',
              direction: data.direction,
              keywords: data.keywords || [],
              latitude: data.latitude,
              longitude: data.longitude,
              showInCamChat: data.showInCamChat,
            } as WeatherSource);
          }
        });
        setCCTVs(cctvArray);
        setIsLoading(false);

        // 랜덤 CCTV 선택 (CCTV 목록이 있고, 아직 선택된 CCTV가 없을 때만)
        if (cctvArray.length > 0 && !selectedCCTV) {
          const randomIndex = Math.floor(Math.random() * cctvArray.length);
          setSelectedCCTV(cctvArray[randomIndex]);
          console.log(`랜덤 CCTV 선택: ${cctvArray[randomIndex].title}`);
        }

        console.log(`Firestore에서 ${cctvArray.length}개의 날씨 CCTV를 불러왔습니다.`);
        console.log('CCTV 데이터 샘플:', cctvArray[0]); // 첫 번째 CCTV 데이터 확인
      },
      (error) => {
        console.error('WeatherSources 로딩 실패:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentPage]);

  // Firestore에서 낙서 실시간 로드 및 만료된 낙서 자동 삭제
  useEffect(() => {
    console.log('🔔 [DOODLE LISTENER] Firestore 리스너 설정 중...');
    const q = query(collection(db, 'doodles'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`🔔 [DOODLE LISTENER] 스냅샷 수신! 총 ${snapshot.size}개 문서`);
        const now = Date.now();
        const doodlesByVideoTemp: Record<string, Doodle[]> = {};

        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const expiresAt = data.expiresAt || 0;

          console.log(`📄 [DOODLE LISTENER] 문서 ${docSnapshot.id}:`, {
            videoId: data.videoId,
            type: data.type,
            expiresAt: new Date(expiresAt).toISOString(),
            now: new Date(now).toISOString(),
            expired: expiresAt < now
          });

          // 만료된 낙서는 Firestore에서 삭제
          if (expiresAt < now) {
            console.log(`❌ [DOODLE LISTENER] 만료된 낙서 삭제: ${docSnapshot.id}`);
            deleteDoc(doc(db, 'doodles', docSnapshot.id)).catch((error) => {
              console.error('만료된 낙서 삭제 실패:', error);
            });
            return;
          }

          // 아직 유효한 낙서만 state에 추가
          const doodle: Doodle = {
            id: docSnapshot.id,
            text: data.text || '',
            type: data.type,
            color: data.color,
            imageData: data.imageData || '',
            createdAt: data.createdAt,
            duration: data.duration,
            sessionId: data.sessionId,
            position: data.position, // 저장된 위치
            widthPercent: data.widthPercent, // 저장된 크기 (화면 너비 대비 %)
            // 쿠폰 필드
            couponTitle: data.couponTitle,
            couponDescription: data.couponDescription,
            storeName: data.storeName,
            storeAddress: data.storeAddress,
            maxClaims: data.maxClaims,
            claimedBy: data.claimedBy || [],
          };

          const videoId = data.videoId;
          if (!doodlesByVideoTemp[videoId]) {
            doodlesByVideoTemp[videoId] = [];
          }
          doodlesByVideoTemp[videoId].push(doodle);
          console.log(`✅ [DOODLE LISTENER] videoId ${videoId}에 낙서 추가`);
        });

        setDoodlesByVideo(doodlesByVideoTemp);
        console.log('✅ [DOODLE LISTENER] 최종 state:', doodlesByVideoTemp);
        console.log('✅ [DOODLE LISTENER] videoId별 개수:', Object.keys(doodlesByVideoTemp).map(vid => `${vid}: ${doodlesByVideoTemp[vid].length}개`));
      },
      (error) => {
        console.error('❌ [DOODLE LISTENER] Doodles 로딩 실패:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // 만료된 낙서 정기 체크 (10초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDoodlesByVideo((prev) => {
        const updated: Record<string, Doodle[]> = {};
        let hasChanges = false;

        Object.entries(prev).forEach(([videoId, doodles]) => {
          const validDoodles = doodles.filter((doodle) => {
            const isExpired = now - doodle.createdAt >= doodle.duration;
            if (isExpired) {
              hasChanges = true;
              console.log(`만료된 낙서 제거 (클라이언트): ${doodle.id}`);
            }
            return !isExpired;
          });

          if (validDoodles.length > 0) {
            updated[videoId] = validDoodles;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 10000); // 10초마다 체크

    return () => clearInterval(interval);
  }, []);

  const handleSelectCCTV = (cctv: WeatherSource) => {
    setSelectedCCTV(cctv);
  };

  // CCTV 페이지에서만 로딩/에러 화면 표시
  if (currentPage === 'cam' && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-blue-700 font-semibold text-lg">{t.loading}</p>
        </div>
      </div>
    );
  }

  // 네비게이션 아이콘들
  const navIcons = {
    feed: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
    cam: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    tips: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    mypage: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  };

  const navLabels = { feed: 'Feed', cam: 'Cam & Chat', tips: 'AI', mypage: 'My Page' };

  return (
    <div className="relative min-h-screen bg-blue-50">
      {/* Navigation Component */}
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        language={language}
      />

      <div className="p-2 pb-20 lg:p-4 lg:pb-4">
        <div className="max-w-7xl mx-auto space-y-2 lg:space-y-4">

          {/* Cam & Chat 페이지 */}
          {currentPage === 'cam' && (
            <>
              {/* CCTV 목록이 없을 때 */}
              {cctvs.length === 0 ? (
                <div className="flex items-center justify-center min-h-[70vh]">
                  <div className="text-center max-w-md bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-300">
                    <svg className="w-20 h-20 text-orange-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-blue-700 mb-2">{t.noCCTV}</h2>
                    <p className="text-orange-600">{t.noCCTVDesc}</p>
                  </div>
                </div>
              ) : (
                <>
              {/* 헤더 */}
              <header className="bg-blue-500 shadow-xl rounded-xl p-3 sm:p-5 text-white">
                {/* 최상단: 제목 + 로고 + 라이브 카운트 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* 로고 */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {/* 제목 */}
                    <h1 className="text-xl sm:text-2xl font-bold text-white">{t.title}</h1>
                  </div>
                  {/* 라이브 카운트 */}
                  <div className="flex items-center gap-2 text-sm sm:text-base text-white">
                    <span className="flex items-center bg-white/20 px-3 py-1.5 rounded-full">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="font-semibold">{cctvs.length}{t.live}</span>
                    </span>
                  </div>
                </div>

                {/* 두 번째 줄: 부제목 + 언어 버튼 */}
                <div className="flex items-center justify-between">
                  <p className="text-sm sm:text-base text-white/90 font-medium">{t.subtitle}</p>
                  {/* 언어 선택 버튼 */}
                  <div className="flex gap-2">
                    {(['KOR', 'ENG', 'CHN'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang);
                          localStorage.setItem('chatLanguage', lang);
                        }}
                        className={`text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-all font-semibold ${
                          language === lang
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </header>

              {/* CCTV 목록 (상단) */}
              <CCTVList cctvs={cctvs} selectedCCTV={selectedCCTV} onSelect={handleSelectCCTV} language={language} />

              {/* 메인 콘텐츠 영역 */}
              {selectedCCTV && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 영상 플레이어 (왼쪽 2/3) */}
                    <div className="lg:col-span-2">
                      <div className="bg-white shadow-xl rounded-xl overflow-hidden border-2 border-blue-300">
                        {getVideoType(selectedCCTV.youtubeUrl) === 'youtube' ? (
                          // YouTube 영상은 플레이어에서 재생
                          <div className="relative w-full aspect-video overflow-visible">
                            <YouTubePlayer
                              videoUrl={selectedCCTV.youtubeUrl}
                              title={selectedCCTV.title}
                            />
                            {/* 낙서 오버레이 */}
                            <DoodleOverlay doodles={currentDoodles} onRemove={handleRemoveDoodle} currentSessionId={sessionId} />
                          </div>
                        ) : (
                          // m3u8 등 기타 영상은 새창으로 열기 버튼
                          <div className="relative w-full aspect-video lg:aspect-auto lg:h-[600px] flex items-center justify-center bg-gray-900">
                            <div className="text-center">
                              <h3 className="text-white text-xl font-bold mb-4">{selectedCCTV.title}</h3>
                              <button
                                onClick={() => window.open(selectedCCTV.youtubeUrl, '_blank')}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 mx-auto"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                영상보기 (새창)
                              </button>
                              <p className="text-gray-400 text-sm mt-3">클릭하여 새 창에서 영상을 시청하세요</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 채팅 영역 (오른쪽 1/3) */}
                    <div className="lg:col-span-1 space-y-3">
                      {/* 버튼 그룹 */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* 영상에 낙서하기 버튼 */}
                        <button
                          onClick={() => setIsDoodleModalOpen(true)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <Paintbrush size={20} />
                          <span className="hidden sm:inline">낙서하기</span>
                        </button>

                        {/* 공유하기 버튼 */}
                        <button
                          onClick={async () => {
                            const shareUrl = `${window.location.origin}?cctv=${selectedCCTV.id}`;
                            const shareTitle = selectedCCTV.title;
                            const shareText = `${selectedCCTV.title} 실시간 CCTV를 확인해보세요!`;

                            if (navigator.share) {
                              try {
                                await navigator.share({
                                  title: shareTitle,
                                  text: shareText,
                                  url: shareUrl,
                                });
                              } catch (error) {
                                if ((error as Error).name !== 'AbortError') {
                                  console.error('공유 실패:', error);
                                }
                              }
                            } else {
                              try {
                                await navigator.clipboard.writeText(shareUrl);
                                alert('링크가 복사되었습니다!');
                              } catch (error) {
                                console.error('클립보드 복사 실패:', error);
                                alert('링크 복사에 실패했습니다.');
                              }
                            }
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          <span className="hidden sm:inline">공유하기</span>
                        </button>
                      </div>

                      <LiveChatRoom
                        cctv={selectedCCTV}
                        spots={spots}
                        orooms={orooms}
                        news={news}
                        language={language}
                      />
                    </div>
                  </div>
                  {/* PC 하단 여백 */}
                  <div className="hidden lg:block h-32"></div>
                </>
              )}
                </>
              )}
            </>
          )}

          {/* Feed 페이지 */}
          {currentPage === 'feed' && (
            <Feed spots={spots} language={language} />
          )}

          {/* AI 페이지 */}
          {currentPage === 'tips' && (
            <div className="space-y-4">
              {/* AI 여행일정 버튼 */}
              <button
                className="w-full bg-blue-500 shadow-xl rounded-xl p-6 hover:bg-blue-600 hover:shadow-2xl transition-all hover:scale-[1.02] border-2 border-blue-300"
                onClick={() => setIsTripPlannerOpen(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left text-white">
                    <h3 className="text-xl font-bold mb-1">AI 여행일정</h3>
                    <p className="text-sm text-white/90">AI가 맞춤형 제주 여행 일정을 추천해드립니다</p>
                  </div>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* AI 여행가이드 버튼 */}
              <button
                className="w-full bg-orange-500 shadow-xl rounded-xl p-6 hover:bg-orange-600 hover:shadow-2xl transition-all hover:scale-[1.02] border-2 border-orange-300"
                onClick={() => setIsChatbotOpen(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left text-white">
                    <h3 className="text-xl font-bold mb-1">AI 여행가이드</h3>
                    <p className="text-sm text-white/90">AI가 제주 여행지를 자세히 안내해드립니다</p>
                  </div>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* My Page */}
          {currentPage === 'mypage' && (
            <MyPage spots={spots} language={language} />
          )}
        </div>
      </div>

      {/* 낙서 입력 모달 */}
      <DoodleInputModal
        isOpen={isDoodleModalOpen}
        onClose={() => setIsDoodleModalOpen(false)}
        onSubmit={handleAddDoodle}
      />

      {/* AI 여행일정 모달 */}
      <TripPlannerModal
        isOpen={isTripPlannerOpen}
        onClose={() => setIsTripPlannerOpen(false)}
        spots={spots}
        orooms={orooms}
      />

      {/* AI 여행가이드 챗봇 */}
      <Chatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        spots={spots}
        orooms={orooms}
        news={news}
        onNavigateToSpot={(placeId) => {
          // 스팟 상세 페이지로 이동하는 로직 (필요시 구현)
          console.log('Navigate to spot:', placeId);
        }}
        onOpenNews={(newsId) => {
          // 뉴스 열기 로직 (필요시 구현)
          console.log('Open news:', newsId);
        }}
      />
    </div>
  );
};

export default CCTVViewer;
