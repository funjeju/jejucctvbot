import React, { useState, useEffect } from 'react';
import CCTVViewer from '../components/CCTVViewer';
import type { Place, OroomData, NewsItem } from '../types';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { parsePlaceFromFirestore } from '../services/placeFirestore';
import { subscribeToNews } from '../services/newsFirestore';

const CCTVViewerPage: React.FC = () => {
  const [spots, setSpots] = useState<Place[]>([]);
  const [orooms, setOrooms] = useState<OroomData[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  // 스팟 데이터 백그라운드 로드 (렌더링 차단 없음)
  useEffect(() => {
    const q = query(collection(db, 'spots'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const spotsArray: Place[] = querySnapshot.docs.map((docSnap) =>
          parsePlaceFromFirestore(docSnap.data(), docSnap.id)
        );
        setSpots(spotsArray);
      },
      (error) => {
        console.error('스팟 리스너 에러:', error);
        setSpots([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // 오름 데이터 즉시 로드
  useEffect(() => {
    console.log('CCTVViewerPage: Firestore 오름 리스너 설정 중...');
    const q = query(collection(db, 'orooms'));

    const unsubscribe = onSnapshot(
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
        console.log(`CCTVViewerPage: ${oroomsArray.length}개의 오름 로드됨`);
      },
      (error) => {
        console.error('오름 리스너 에러:', error);
        setOrooms([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // 뉴스 데이터 백그라운드 로드
  useEffect(() => {
    const unsubscribe = subscribeToNews((newsArray) => {
      setNews(newsArray);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 즉시 렌더링 (데이터는 백그라운드에서 로드)
  return <CCTVViewer spots={spots} orooms={orooms} news={news} />;
};

export default CCTVViewerPage;
