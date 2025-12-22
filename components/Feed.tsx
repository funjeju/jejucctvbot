import React, { useState, useEffect } from 'react';
import type { FeedPost, Place, BusinessCategory } from '../types';
import FeedCreateModal from './FeedCreateModal';
import FeedCard from './FeedCard';
import FeedDetailModal from './FeedDetailModal';
import SpotDetailView from './SpotDetailView';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

interface FeedProps {
  spots: Place[];
  language: 'KOR' | 'ENG' | 'CHN';
}

const translations = {
  KOR: {
    title: '제주 피드',
    subtitle: '제주의 지금을 공유하세요',
    createPost: '피드 작성',
    noFeeds: '아직 등록된 피드가 없습니다',
    nofeedsDesc: '첫 번째 피드를 작성해보세요!',
    loading: '피드를 불러오는 중...',
    sortBy: '정렬',
    sortByUploadRecent: '최근 업로드순',
    sortByPhotoRecent: '최근 촬영순',
    sortByDistance: '가까운 거리순',
    filterByRegion: '지역 필터',
    allRegions: '전체 지역',
    locationPermissionNeeded: '위치 권한이 필요합니다',
    gettingLocation: '위치 정보를 가져오는 중...',
  },
  ENG: {
    title: 'Jeju Feed',
    subtitle: 'Share your Jeju now',
    createPost: 'Create Post',
    noFeeds: 'No feeds yet',
    nofeedsDesc: 'Be the first to create a feed!',
    loading: 'Loading feeds...',
    sortBy: 'Sort',
    sortByUploadRecent: 'Recent Upload',
    sortByPhotoRecent: 'Recent Photo',
    sortByDistance: 'Nearest',
    filterByRegion: 'Region',
    allRegions: 'All Regions',
    locationPermissionNeeded: 'Location permission needed',
    gettingLocation: 'Getting location...',
  },
  CHN: {
    title: '济州动态',
    subtitle: '分享您的济州现在',
    createPost: '创建帖子',
    noFeeds: '还没有动态',
    nofeedsDesc: '成为第一个创建动态的人！',
    loading: '正在加载动态...',
    sortBy: '排序',
    sortByUploadRecent: '最近上传',
    sortByPhotoRecent: '最近拍摄',
    sortByDistance: '最近距离',
    filterByRegion: '地区',
    allRegions: '所有地区',
    locationPermissionNeeded: '需要位置权限',
    gettingLocation: '获取位置中...',
  },
};

const Feed: React.FC<FeedProps> = ({ spots, language }) => {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<FeedPost | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Place | null>(null);

  // 정렬 및 필터링 상태
  const [sortBy, setSortBy] = useState<'upload' | 'photo' | 'distance'>('upload');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | 'all'>('all');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const t = translations[language];

  // 스팟 클릭 핸들러
  const handleSpotClick = (spotId: string) => {
    const spot = spots.find(s => s.place_id === spotId);
    if (spot) {
      setSelectedSpot(spot);
    }
  };

  const handleCreatePostClick = () => {
    if (!user) {
      setIsLoginModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  // Haversine 거리 계산 (미터 단위)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 사용자 위치 가져오기
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert(t.locationPermissionNeeded);
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsGettingLocation(false);
        setSortBy('distance');
      },
      (error) => {
        console.error('위치 정보 가져오기 실패:', error);
        alert(t.locationPermissionNeeded);
        setIsGettingLocation(false);
      }
    );
  };

  // 피드에서 GPS 좌표 추출
  const getFeedLocation = (feed: FeedPost): { latitude: number; longitude: number } | null => {
    if (feed.media && feed.media.length > 0) {
      const firstMedia = feed.media[0];
      if (firstMedia.exif?.latitude && firstMedia.exif?.longitude) {
        return {
          latitude: firstMedia.exif.latitude,
          longitude: firstMedia.exif.longitude,
        };
      }
    }
    return null;
  };

  // 피드의 지역 정보 가져오기 (nearbySpots에서 추출)
  const getFeedRegion = React.useCallback((feed: FeedPost): string | null => {
    console.log('getFeedRegion 호출:', {
      feedId: feed.id,
      hasNearbySpots: !!feed.nearbySpots,
      nearbySpots: feed.nearbySpots,
      spotsCount: spots.length
    });

    if (feed.nearbySpots && feed.nearbySpots.length > 0) {
      // nearbySpots의 첫 번째 spot의 region 정보 사용
      const nearestSpotId = feed.nearbySpots[0].id;
      const spot = spots.find((s: Place) => s.place_id === nearestSpotId);

      console.log('nearbySpot 찾기:', {
        nearestSpotId,
        foundSpot: !!spot,
        spotRegion: spot?.region,
        spotTitle: spot?.place_name
      });

      return spot?.region || null;
    }
    return null;
  }, [spots]);

  // 중문권역에 포함되는 동들
  const JUNGMUN_AREAS = ['중문동', '대포동', '월평동', '법환동'];

  // 지역 목록 생성 (spots 데이터에서 추출 + 중문권역 추가)
  const availableRegions = React.useMemo(() => {
    const regions = new Set<string>();
    spots.forEach(spot => {
      if (spot.region) {
        regions.add(spot.region);
      }
    });

    // 중문권역 포함 동이 하나라도 있으면 중문권역 추가
    const hasJungmunArea = spots.some((spot: Place) =>
      spot.region && JUNGMUN_AREAS.includes(spot.region)
    );

    if (hasJungmunArea) {
      regions.add('중문권역');
    }

    const sortedRegions = Array.from(regions).sort();
    console.log('사용 가능한 지역 목록:', sortedRegions);
    return sortedRegions;
  }, [spots]);

  // Firestore에서 피드 실시간 로드 - 초기 10개만
  useEffect(() => {
    console.log('Feed: Firestore 피드 리스너 설정 중... (초기 10개)');
    const q = query(
      collection(db, 'feeds'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const feedsArray: FeedPost[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          feedsArray.push({
            id: doc.id,
            ...data,
          } as FeedPost);
        });
        setFeeds(feedsArray);
        setIsLoading(false);
        console.log(`Feed: ${feedsArray.length}개의 피드 로드됨 (초기)`);
      },
      (error) => {
        console.error('Feed 로딩 실패:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // selectedFeedId가 변경되면 해당 피드를 feeds에서 찾아 selectedFeed 업데이트
  useEffect(() => {
    if (selectedFeedId) {
      const updatedFeed = feeds.find((f: FeedPost) => f.id === selectedFeedId);
      if (updatedFeed) {
        setSelectedFeed(updatedFeed);
      }
    }
  }, [feeds, selectedFeedId]);

  // 정렬 및 필터링된 피드 목록
  const sortedAndFilteredFeeds = React.useMemo(() => {
    let result = [...feeds];

    console.log('=== 정렬/필터링 시작 ===');
    console.log('전체 피드 수:', feeds.length);
    console.log('선택된 지역:', selectedRegion);

    // 지역 필터링
    if (selectedRegion !== 'all') {
      result = result.filter((feed: FeedPost) => {
        const feedRegion = getFeedRegion(feed);

        // 중문권역 선택 시 중문동/대포동/월평동/법환동 모두 포함
        let match = false;
        if (selectedRegion === '중문권역') {
          match = feedRegion ? JUNGMUN_AREAS.includes(feedRegion) : false;
        } else {
          match = feedRegion === selectedRegion;
        }

        console.log(`피드 ${feed.id} - 지역: ${feedRegion}, 매칭: ${match}`);
        return match;
      });
      console.log('필터링 후 피드 수:', result.length);
    }

    // 업종 필터링
    if (selectedCategory !== 'all') {
      result = result.filter((feed: FeedPost) =>
        feed.userRole === 'store' && feed.businessCategory === selectedCategory
      );
      console.log(`업종 필터링 (${selectedCategory}) 후 피드 수:`, result.length);
    }

    // 정렬
    if (sortBy === 'upload') {
      // 최근 업로드순 (기본값, createdAt 기준)
      result.sort((a: FeedPost, b: FeedPost) => b.createdAt.seconds - a.createdAt.seconds);
    } else if (sortBy === 'photo') {
      // 최근 촬영순 (EXIF rawDateTime 기준)
      result.sort((a: FeedPost, b: FeedPost) => {
        const aTime = a.media?.[0]?.exif?.rawDateTime;
        const bTime = b.media?.[0]?.exif?.rawDateTime;

        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;

        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    } else if (sortBy === 'distance' && userLocation) {
      // 가까운 거리순
      result.sort((a: FeedPost, b: FeedPost) => {
        const aLoc = getFeedLocation(a);
        const bLoc = getFeedLocation(b);

        if (!aLoc && !bLoc) return 0;
        if (!aLoc) return 1;
        if (!bLoc) return -1;

        const aDist = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          aLoc.latitude,
          aLoc.longitude
        );
        const bDist = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          bLoc.latitude,
          bLoc.longitude
        );

        return aDist - bDist;
      });
    }

    return result;
  }, [feeds, sortBy, selectedRegion, selectedCategory, userLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 lg:pb-0">
      {/* 헤더 - PC에서만 표시 */}
      <div className="hidden lg:block bg-white shadow-md rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
            <p className="text-xs text-gray-600">{t.subtitle}</p>
          </div>
          {/* 피드 작성 버튼 - PC */}
          <button
            onClick={handleCreatePostClick}
            className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">{t.createPost}</span>
          </button>
        </div>
      </div>

      {/* 정렬 및 필터링 컨트롤 */}
      <div className="bg-white shadow-md rounded-lg p-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {/* 정렬 드롭다운 */}
          <div className="flex-1 min-w-[140px]">
            <select
              value={sortBy}
              onChange={(e) => {
                const value = e.target.value as 'upload' | 'photo' | 'distance';
                if (value === 'distance' && !userLocation) {
                  getUserLocation();
                } else {
                  setSortBy(value);
                }
              }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              disabled={isGettingLocation}
            >
              <option value="upload">{t.sortByUploadRecent}</option>
              <option value="photo">{t.sortByPhotoRecent}</option>
              <option value="distance">
                {isGettingLocation ? t.gettingLocation : t.sortByDistance}
              </option>
            </select>
          </div>

          {/* 지역 필터 드롭다운 */}
          <div className="flex-1 min-w-[140px]">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            >
              <option value="all">{t.allRegions}</option>
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* 업종 필터 드롭다운 */}
          <div className="flex-1 min-w-[140px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as BusinessCategory | 'all')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
            >
              <option value="all">{language === 'KOR' ? '전체 업종' : language === 'ENG' ? 'All Categories' : '全部类别'}</option>
              <option value="서핑">🏄 {language === 'KOR' ? '서핑' : language === 'ENG' ? 'Surfing' : '冲浪'}</option>
              <option value="스냅">📸 {language === 'KOR' ? '스냅' : language === 'ENG' ? 'Snap Photo' : '快拍'}</option>
              <option value="낚시">🎣 {language === 'KOR' ? '낚시' : language === 'ENG' ? 'Fishing' : '钓鱼'}</option>
              <option value="공예">🎨 {language === 'KOR' ? '공예' : language === 'ENG' ? 'Craft' : '工艺'}</option>
              <option value="박물관">🏛️ {language === 'KOR' ? '박물관' : language === 'ENG' ? 'Museum' : '博物馆'}</option>
              <option value="꽃관련">🌸 {language === 'KOR' ? '꽃관련' : language === 'ENG' ? 'Flowers' : '花卉'}</option>
              <option value="기타체험">✨ {language === 'KOR' ? '기타체험' : language === 'ENG' ? 'Other Activities' : '其他体验'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 플로팅 버튼 - 모바일에서만 표시 */}
      <button
        onClick={handleCreatePostClick}
        className="lg:hidden fixed right-4 z-40 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
        style={{ bottom: 'calc(4rem + 1rem)' }} // 하단 내비게이션 바로 위
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* 피드 목록 */}
      {sortedAndFilteredFeeds.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t.noFeeds}</h3>
          <p className="text-gray-600 mb-4">{t.nofeedsDesc}</p>
          <button
            onClick={handleCreatePostClick}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t.createPost}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAndFilteredFeeds.map((feed: FeedPost) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              onClick={() => {
                setSelectedFeed(feed);
                setSelectedFeedId(feed.id);
              }}
              language={language}
              onSpotClick={handleSpotClick}
            />
          ))}
        </div>
      )}

      {/* 피드 작성 모달 */}
      {isCreateModalOpen && (
        <FeedCreateModal
          spots={spots}
          language={language}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* 피드 상세보기 모달 */}
      {selectedFeed && (
        <FeedDetailModal
          feed={selectedFeed}
          spots={spots}
          language={language}
          onClose={() => {
            setSelectedFeed(null);
            setSelectedFeedId(null);
          }}
          onSpotClick={handleSpotClick}
        />
      )}

      {/* 스팟 상세보기 모달 */}
      {selectedSpot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <SpotDetailView
              spot={selectedSpot}
              onBack={() => setSelectedSpot(null)}
              onEdit={() => {}}
              onAddSuggestion={() => {}}
              onResolveSuggestion={() => {}}
            />
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <LoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}
    </div>
  );
};

export default Feed;
