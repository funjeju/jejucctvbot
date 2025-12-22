import React, { useState, useEffect } from 'react';
import CCTVViewer from '../components/CCTVViewer';
import Spinner from '../components/common/Spinner';
import type { Place, OroomData, NewsItem } from '../types';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { parsePlaceFromFirestore } from '../services/placeFirestore';
import { subscribeToNews } from '../services/newsFirestore';

const CCTVViewerPage: React.FC = () => {
  const [spots, setSpots] = useState<Place[]>([]);
  const [orooms, setOrooms] = useState<OroomData[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 초기 로딩만 빠르게 - Feed만 먼저 표시하기 위해 즉시 완료
  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  // 스팟 데이터는 2초 후 lazy load (Feed 먼저 보이도록)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const timer = setTimeout(() => {
      console.log('CCTVViewerPage: Firestore 스팟 리스너 설정 중... (2초 지연)');
      const q = query(collection(db, 'spots'));

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const spotsArray: Place[] = querySnapshot.docs.map((docSnap) =>
            parsePlaceFromFirestore(docSnap.data(), docSnap.id)
          );
          setSpots(spotsArray);
          console.log(`CCTVViewerPage: ${spotsArray.length}개의 스팟 로드됨 (백그라운드)`);
        },
        (error) => {
          console.error('스팟 리스너 에러:', error);
          setSpots([]);
        }
      );
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 오름 데이터는 3초 후 lazy load
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const timer = setTimeout(() => {
      console.log('CCTVViewerPage: Firestore 오름 리스너 설정 중... (3초 지연)');
      const q = query(collection(db, 'orooms'));

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const oroomsArray: OroomData[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              data.createdAt = data.createdAt.toDate();
            }
            if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
              data.updatedAt = data.updatedAt.toDate();
            }
            oroomsArray.push({ id: doc.id, ...data } as OroomData);
          });
          setOrooms(oroomsArray);
          console.log(`CCTVViewerPage: ${oroomsArray.length}개의 오름 로드됨 (백그라운드)`);
        },
        (error) => {
          console.error('오름 리스너 에러:', error);
          setOrooms([]);
        }
      );
    }, 3000);

    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 뉴스 데이터는 4초 후 lazy load
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const timer = setTimeout(() => {
      console.log('CCTVViewerPage: Firestore 뉴스 리스너 설정 중... (4초 지연)');
      unsubscribe = subscribeToNews((newsArray) => {
        setNews(newsArray);
        console.log(`CCTVViewerPage: ${newsArray.length}개의 뉴스 로드됨 (백그라운드)`);
      });
    }, 4000);

    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 초기 로딩 화면 제거 - 바로 CCTVViewer 표시 (Feed가 먼저 보임)
  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center">
          <Spinner />
          <p className="text-blue-700 font-semibold text-lg mt-4">준비 중...</p>
        </div>
      </div>
    );
  }

  return <CCTVViewer spots={spots} orooms={orooms} news={news} />;
};

export default CCTVViewerPage;
