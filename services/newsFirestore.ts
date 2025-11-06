import { collection, query, onSnapshot, setDoc, doc, deleteDoc, orderBy, where, Timestamp as FirestoreTimestamp } from "firebase/firestore";
import { db } from './firebase';
import type { NewsItem, Timestamp } from '../types';

/**
 * NewsItem을 Firestore에 저장하기 위해 정리
 */
export function sanitizeNewsForFirestore(news: NewsItem): any {
  const sanitized = JSON.parse(JSON.stringify(news, (key, value) => {
    return value === undefined ? null : value;
  }));

  // Timestamp 변환
  if (sanitized.published_at && typeof sanitized.published_at === 'object' && 'seconds' in sanitized.published_at) {
    sanitized.published_at = FirestoreTimestamp.fromMillis(sanitized.published_at.seconds * 1000);
  }
  if (sanitized.expires_at && typeof sanitized.expires_at === 'object' && 'seconds' in sanitized.expires_at) {
    sanitized.expires_at = FirestoreTimestamp.fromMillis(sanitized.expires_at.seconds * 1000);
  }
  if (sanitized.created_at && typeof sanitized.created_at === 'object' && 'seconds' in sanitized.created_at) {
    sanitized.created_at = FirestoreTimestamp.fromMillis(sanitized.created_at.seconds * 1000);
  }
  if (sanitized.updated_at && typeof sanitized.updated_at === 'object' && 'seconds' in sanitized.updated_at) {
    sanitized.updated_at = FirestoreTimestamp.fromMillis(sanitized.updated_at.seconds * 1000);
  }

  return sanitized;
}

/**
 * Firestore 데이터를 NewsItem으로 파싱
 */
export function parseNewsFromFirestore(data: any, id: string): NewsItem {
  const news = { ...data, id } as NewsItem;

  // Firestore Timestamp를 앱 Timestamp로 변환
  if (news.published_at && typeof news.published_at.toDate === 'function') {
    const date = news.published_at.toDate();
    news.published_at = {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0
    } as Timestamp;
  }

  if (news.expires_at && typeof (news.expires_at as any).toDate === 'function') {
    const date = (news.expires_at as any).toDate();
    news.expires_at = {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0
    } as Timestamp;
  }

  if (news.created_at && typeof (news.created_at as any).toDate === 'function') {
    const date = (news.created_at as any).toDate();
    news.created_at = {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0
    } as Timestamp;
  }

  if (news.updated_at && typeof (news.updated_at as any).toDate === 'function') {
    const date = (news.updated_at as any).toDate();
    news.updated_at = {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0
    } as Timestamp;
  }

  return news;
}

/**
 * 뉴스 아이템 저장
 */
export async function saveNewsItem(news: NewsItem): Promise<void> {
  const sanitized = sanitizeNewsForFirestore(news);
  await setDoc(doc(db, "news", news.id), sanitized);
  console.log('뉴스 저장 완료:', news.title);
}

/**
 * 뉴스 아이템 삭제
 */
export async function deleteNewsItem(newsId: string): Promise<void> {
  await deleteDoc(doc(db, "news", newsId));
  console.log('뉴스 삭제 완료:', newsId);
}

/**
 * 모든 뉴스 실시간 구독
 */
export function subscribeToNews(callback: (news: NewsItem[]) => void): () => void {
  // 일단 정렬 없이 모든 뉴스 가져오기
  const q = query(collection(db, "news"));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const newsArray: NewsItem[] = [];
    querySnapshot.forEach((doc) => {
      const newsItem = parseNewsFromFirestore(doc.data(), doc.id);

      // approved 상태만 필터링
      if (newsItem.status !== 'approved') {
        return;
      }

      // 만료된 뉴스 필터링
      if (newsItem.expires_at) {
        const now = Date.now() / 1000;
        if (newsItem.expires_at.seconds < now) {
          return; // 만료됨
        }
      }

      newsArray.push(newsItem);
    });

    // 클라이언트에서 정렬 (created_at 기준 최신순)
    newsArray.sort((a, b) => {
      const aTime = a.created_at?.seconds || 0;
      const bTime = b.created_at?.seconds || 0;
      return bTime - aTime; // 최신순
    });

    callback(newsArray);
    console.log(`Firestore에서 실시간으로 뉴스 ${newsArray.length}개를 불러왔습니다.`);
  }, (error) => {
    console.error('Error in news listener:', error);
    callback([]);
  });

  return unsubscribe;
}

/**
 * 특정 스팟 관련 뉴스만 가져오기
 */
export function subscribeToSpotNews(spotId: string, callback: (news: NewsItem[]) => void): () => void {
  const q = query(
    collection(db, "news"),
    where("related_spot_ids", "array-contains", spotId),
    where("auto_apply_to_spot", "==", true),
    orderBy("published_at", "desc")
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const newsArray: NewsItem[] = [];
    querySnapshot.forEach((doc) => {
      const newsItem = parseNewsFromFirestore(doc.data(), doc.id);

      // 만료된 뉴스 필터링
      if (newsItem.expires_at) {
        const now = Date.now() / 1000;
        if (newsItem.expires_at.seconds < now) {
          return;
        }
      }

      newsArray.push(newsItem);
    });

    callback(newsArray);
  }, (error) => {
    console.error('Error in spot news listener:', error);
    callback([]);
  });

  return unsubscribe;
}

/**
 * 챗봇용: 키워드로 관련 뉴스 검색
 */
export function getNewsByKeywords(allNews: NewsItem[], keywords: string[]): NewsItem[] {
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  return allNews.filter(news => {
    // 뉴스의 키워드와 매칭
    if (news.keywords) {
      const newsKeywords = news.keywords.map(k => k.toLowerCase());
      if (newsKeywords.some(nk => lowerKeywords.some(lk => nk.includes(lk) || lk.includes(nk)))) {
        return true;
      }
    }

    // 제목이나 내용에서 매칭
    const searchText = `${news.title} ${news.content}`.toLowerCase();
    return lowerKeywords.some(keyword => searchText.includes(keyword));
  });
}

/**
 * 챗봇용: 특정 타입의 최신 뉴스 가져오기
 */
export function getNewsByType(allNews: NewsItem[], type: NewsItem['type']): NewsItem[] {
  return allNews.filter(news => news.type === type);
}

/**
 * 챗봇용: 핀 고정된 중요 뉴스 가져오기
 */
export function getPinnedNews(allNews: NewsItem[]): NewsItem[] {
  return allNews.filter(news => news.is_pinned);
}
