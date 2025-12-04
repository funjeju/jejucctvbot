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
  const [isLoading, setIsLoading] = useState(true);


  // 스팟 데이터 실시간 리스너
  useEffect(() => {
    console.log('CCTVViewerPage: Firestore 스팟 리스너 설정 중...');
    const q = query(collection(db, 'spots'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const spotsArray: Place[] = querySnapshot.docs.map((docSnap) =>
          parsePlaceFromFirestore(docSnap.data(), docSnap.id)
        );
        setSpots(spotsArray);
        console.log(`CCTVViewerPage: ${spotsArray.length}개의 스팟 로드됨`);
      },
      (error) => {
        console.error('스팟 리스너 에러:', error);
        setSpots([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // 오름 데이터 실시간 리스너
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

  // 뉴스 데이터 실시간 리스너
  useEffect(() => {
    console.log('CCTVViewerPage: Firestore 뉴스 리스너 설정 중...');
    const unsubscribe = subscribeToNews((newsArray) => {
      setNews(newsArray);
      console.log(`CCTVViewerPage: ${newsArray.length}개의 뉴스 로드됨`);
    });

    return () => unsubscribe();
  }, []);

  // 모든 데이터 로딩 완료 체크
  useEffect(() => {
    // spots는 빈 배열일 수도 있지만 로딩은 완료된 것으로 간주
    setIsLoading(false);
  }, [spots, orooms, news]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center">
          <Spinner />
          <p className="text-blue-700 font-semibold text-lg mt-4">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return <CCTVViewer spots={spots} orooms={orooms} news={news} />;
};

export default CCTVViewerPage;
