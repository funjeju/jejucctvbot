import React, { useState, useEffect } from 'react';
import type { FeedPost, Place } from '../types';
import FeedCreateModal from './FeedCreateModal';
import FeedCard from './FeedCard';
import FeedDetailModal from './FeedDetailModal';
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
  },
  ENG: {
    title: 'Jeju Feed',
    subtitle: 'Share your Jeju now',
    createPost: 'Create Post',
    noFeeds: 'No feeds yet',
    nofeedsDesc: 'Be the first to create a feed!',
    loading: 'Loading feeds...',
  },
  CHN: {
    title: '济州动态',
    subtitle: '分享您的济州现在',
    createPost: '创建帖子',
    noFeeds: '还没有动态',
    nofeedsDesc: '成为第一个创建动态的人！',
    loading: '正在加载动态...',
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

  const t = translations[language];

  const handleCreatePostClick = () => {
    if (!user) {
      setIsLoginModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  // Firestore에서 피드 실시간 로드
  useEffect(() => {
    console.log('Feed: Firestore 피드 리스너 설정 중...');
    const q = query(
      collection(db, 'feeds'),
      orderBy('createdAt', 'desc'),
      limit(50)
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
        console.log(`Feed: ${feedsArray.length}개의 피드 로드됨`);
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
      const updatedFeed = feeds.find(f => f.id === selectedFeedId);
      if (updatedFeed) {
        setSelectedFeed(updatedFeed);
      }
    }
  }, [feeds, selectedFeedId]);

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
      {feeds.length === 0 ? (
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
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              onClick={() => {
                setSelectedFeed(feed);
                setSelectedFeedId(feed.id);
              }}
              language={language}
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
        />
      )}

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <LoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}
    </div>
  );
};

export default Feed;
