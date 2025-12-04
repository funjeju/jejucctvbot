import React, { useState, useEffect } from 'react';
import type { Place, NewsItem, OroomData, WeatherSource } from './types';
import UserHeader from './components/user/UserHeader';
import QuickMenuBar from './components/user/QuickMenuBar';
import NewsFeed from './components/user/NewsFeed';
import SpotDetailModal from './components/user/SpotDetailModal';
import NewsDetailModal from './components/user/NewsDetailModal';
import Chatbot from './components/Chatbot';
import WeatherChatModal from './components/WeatherChatModal';
import TripPlannerModal from './components/TripPlannerModal';
import AuthModal from './components/user/AuthModal';
import NewsWriteModal from './components/user/NewsWriteModal';
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from './services/firebase';
import { parsePlaceFromFirestore } from './services/placeFirestore';
import { subscribeToNews } from './services/newsFirestore';
import Spinner from './components/common/Spinner';
import { useAuth } from './contexts/AuthContext';

type ModalType = 'weather' | 'guide' | 'tripPlanner' | 'newsFeed' | null;

const UserApp: React.FC = () => {
  const { user } = useAuth();

  // 데이터 상태
  const [spots, setSpots] = useState<Place[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [orooms, setOrooms] = useState<OroomData[]>([]);
  const [weatherSources, setWeatherSources] = useState<WeatherSource[]>([]);

  // UI 상태
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedSpot, setSelectedSpot] = useState<Place | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNewsWriteModal, setShowNewsWriteModal] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);

  // 스팟 데이터 실시간 리스너
  useEffect(() => {
    console.log('🔄 Firestore 스팟 리스너 설정 중...');
    const q = query(collection(db, "spots"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const spotsArray: Place[] = querySnapshot.docs.map((docSnap) =>
        parsePlaceFromFirestore(docSnap.data(), docSnap.id)
      );
      setSpots(spotsArray);
      console.log(`✅ ${spotsArray.length}개의 스팟 로드 완료`);

      // 디버깅: 첫 5개 스팟의 location 구조 확인
      console.log('=== 스팟 location 구조 디버깅 ===');
      spotsArray.slice(0, 5).forEach(spot => {
        console.log(`${spot.place_name}:`, {
          location: spot.location,
          categories: spot.categories,
          hasLatitude: !!spot.location?.latitude,
          hasLongitude: !!spot.location?.longitude
        });
      });
    }, (error) => {
      console.error('❌ 스팟 로드 실패:', error);
      setSpots([]);
    });

    return () => unsubscribe();
  }, []);

  // 뉴스 데이터 실시간 리스너
  useEffect(() => {
    console.log('🔄 Firestore 뉴스 리스너 설정 중...');
    const unsubscribe = subscribeToNews((newsArray) => {
      setNews(newsArray);
      setIsLoading(false);
      console.log(`✅ ${newsArray.length}개의 뉴스 로드 완료`);
    });

    return () => unsubscribe();
  }, []);

  // 오름 데이터 실시간 리스너
  useEffect(() => {
    console.log('🔄 Firestore 오름 리스너 설정 중...');
    const q = query(collection(db, "orooms"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const oroomsArray: OroomData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Firestore Timestamp를 Date로 변환
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate();
        }
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
          data.updatedAt = data.updatedAt.toDate();
        }
        oroomsArray.push({ id: doc.id, ...data } as OroomData);
      });
      setOrooms(oroomsArray);
      console.log(`✅ ${oroomsArray.length}개의 오름 로드 완료`);
    }, (error) => {
      console.error('❌ 오름 로드 실패:', error);
      setOrooms([]);
    });

    return () => unsubscribe();
  }, []);

  // 날씨 소스 데이터 실시간 리스너
  useEffect(() => {
    console.log('🔄 Firestore 날씨 소스 리스너 설정 중...');
    const q = query(collection(db, "weatherSources"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sourcesArray: WeatherSource[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as WeatherSource;
        sourcesArray.push(data);
      });
      setWeatherSources(sourcesArray);
      console.log(`✅ ${sourcesArray.length}개의 날씨 소스 로드 완료`);
    }, (error) => {
      console.error('❌ 날씨 소스 로드 실패:', error);
      setWeatherSources([]);
    });

    return () => unsubscribe();
  }, []);

  // 뉴스 카드 클릭 시 관련 스팟 보기
  const handleNewsClick = (newsItem: NewsItem) => {
    if (newsItem.related_spot_ids.length > 0) {
      const relatedSpot = spots.find(s => s.place_id === newsItem.related_spot_ids[0]);
      if (relatedSpot) {
        setSelectedSpot(relatedSpot);
      }
    }
  };

  // 챗봇에서 스팟 네비게이션
  const handleNavigateToSpot = (placeId: string) => {
    const spot = spots.find(s => s.place_id === placeId);
    if (spot) {
      setSelectedSpot(spot);
      setActiveModal(null); // 모달 닫기
    }
  };

  // 챗봇에서 뉴스 상세 열기
  const handleOpenNews = (newsId: string) => {
    const newsItem = news.find(n => n.id === newsId);
    if (newsItem) {
      setSelectedNews(newsItem);
      setActiveModal(null); // 챗봇 모달 닫기
    }
  };

  // 뉴스 추가 버튼 클릭 핸들러
  const handleAddNewsClick = () => {
    if (user) {
      setShowNewsWriteModal(true);
    } else {
      setShowLoginModal(true);
    }
  };

  // 로그인 성공 시 뉴스 작성 모달 열기
  const handleAuthSuccess = () => {
    setShowNewsWriteModal(true);
  };

  // 뉴스 등록 성공 시
  const handleNewsSuccess = () => {
    // 뉴스 리스너가 자동으로 업데이트됨
    console.log('✅ 새로운 소식이 등록되었습니다');
    setEditingNews(null); // 수정 모드 종료
  };

  // 뉴스 수정 핸들러
  const handleEditNews = (newsItem: NewsItem) => {
    if (user) {
      setEditingNews(newsItem);
      setShowNewsWriteModal(true);
    } else {
      setShowLoginModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-lg text-gray-600 mt-4">제주 최신 소식을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <UserHeader onLoginClick={() => setShowLoginModal(true)} />

      {/* 메인 컨텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* 빠른 메뉴 바 */}
        <QuickMenuBar onMenuClick={setActiveModal} />

        {/* 뉴스 피드 */}
        <NewsFeed
          news={news}
          spots={spots}
          onNewsClick={handleNewsClick}
          onAddNewsClick={handleAddNewsClick}
          onEditNews={handleEditNews}
        />
      </main>

      {/* 모달들 */}
      <WeatherChatModal
        isOpen={activeModal === 'weather'}
        onClose={() => setActiveModal(null)}
        weatherSources={weatherSources}
        onSaveSource={() => { }} // 읽기 전용
        onDeleteSource={() => { }} // 읽기 전용
      />

      <Chatbot
        isOpen={activeModal === 'guide'}
        onClose={() => setActiveModal(null)}
        spots={spots}
        orooms={orooms}
        news={news}
        onNavigateToSpot={handleNavigateToSpot}
        onOpenNews={handleOpenNews}
      />

      <TripPlannerModal
        isOpen={activeModal === 'tripPlanner'}
        onClose={() => setActiveModal(null)}
        spots={spots}
        orooms={orooms}
      />

      {/* 스팟 상세 모달 */}
      {selectedSpot && (
        <SpotDetailModal
          spot={selectedSpot}
          relatedNews={news.filter(n =>
            n.auto_apply_to_spot && n.related_spot_ids.includes(selectedSpot.place_id)
          )}
          onClose={() => setSelectedSpot(null)}
        />
      )}

      {/* 뉴스 상세 모달 */}
      {selectedNews && (
        <NewsDetailModal
          news={selectedNews}
          relatedSpots={spots.filter(s =>
            selectedNews.related_spot_ids.includes(s.place_id)
          )}
          onClose={() => setSelectedNews(null)}
          onEdit={handleEditNews}
        />
      )}

      {/* 로그인/회원가입 모달 */}
      <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* 뉴스 작성/수정 모달 */}
      <NewsWriteModal
        isOpen={showNewsWriteModal}
        onClose={() => {
          setShowNewsWriteModal(false);
          setEditingNews(null);
        }}
        onSuccess={handleNewsSuccess}
        spots={spots}
        editingNews={editingNews}
      />
    </div>
  );
};

export default UserApp;
