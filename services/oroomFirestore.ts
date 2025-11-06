import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import type { OroomData } from '../types';

const COLLECTION_NAME = 'orooms';

// OroomData를 Firestore용으로 변환 (Date를 Timestamp로)
const sanitizeOroomForFirestore = (oroom: OroomData): any => {
  const sanitized = { ...oroom };

  // Date 객체를 Firestore Timestamp로 변환
  if (sanitized.createdAt instanceof Date) {
    sanitized.createdAt = Timestamp.fromDate(sanitized.createdAt);
  }
  if (sanitized.updatedAt instanceof Date) {
    sanitized.updatedAt = Timestamp.fromDate(sanitized.updatedAt);
  }

  // File 객체 제거 (Firestore에 저장 불가)
  sanitized.parkingImages = sanitized.parkingImages?.map(img => ({
    id: img.id,
    url: img.url,
    description: img.description || ''
  })) || [];

  sanitized.entranceImages = sanitized.entranceImages?.map(img => ({
    id: img.id,
    url: img.url,
    description: img.description || ''
  })) || [];

  sanitized.trailImages = sanitized.trailImages?.map(img => ({
    id: img.id,
    url: img.url,
    description: img.description || ''
  })) || [];

  sanitized.summitImages = sanitized.summitImages?.map(img => ({
    id: img.id,
    url: img.url,
    description: img.description || ''
  })) || [];

  return sanitized;
};

// Firestore 데이터를 OroomData로 변환 (Timestamp를 Date로)
const parseOroomFromFirestore = (doc: any): OroomData => {
  const data = doc.data();

  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    parkingImages: data.parkingImages || [],
    entranceImages: data.entranceImages || [],
    trailImages: data.trailImages || [],
    summitImages: data.summitImages || []
  };
};

// 오름 저장
export const saveOroom = async (oroom: OroomData): Promise<string> => {
  try {
    const sanitizedOroom = sanitizeOroomForFirestore(oroom);
    const docRef = await addDoc(collection(db, COLLECTION_NAME), sanitizedOroom);
    console.log('오름이 저장되었습니다:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('오름 저장 오류:', error);
    throw new Error('오름 저장에 실패했습니다.');
  }
};

// 모든 오름 가져오기
export const getAllOrooms = async (): Promise<OroomData[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(parseOroomFromFirestore);
  } catch (error) {
    console.error('오름 목록 가져오기 오류:', error);
    throw new Error('오름 목록을 가져올 수 없습니다.');
  }
};

// 오름 업데이트
export const updateOroom = async (oroomId: string, oroom: OroomData): Promise<void> => {
  try {
    const sanitizedOroom = sanitizeOroomForFirestore(oroom);
    const docRef = doc(db, COLLECTION_NAME, oroomId);
    await updateDoc(docRef, sanitizedOroom);
    console.log('오름이 업데이트되었습니다:', oroomId);
  } catch (error) {
    console.error('오름 업데이트 오류:', error);
    throw new Error('오름 업데이트에 실패했습니다.');
  }
};

// 오름 삭제
export const deleteOroom = async (oroomId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, oroomId);
    await deleteDoc(docRef);
    console.log('오름이 삭제되었습니다:', oroomId);
  } catch (error) {
    console.error('오름 삭제 오류:', error);
    throw new Error('오름 삭제에 실패했습니다.');
  }
};

// 실시간 오름 목록 구독
export const subscribeToOrooms = (callback: (orooms: OroomData[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    const orooms = querySnapshot.docs.map(parseOroomFromFirestore);
    callback(orooms);
  }, (error) => {
    console.error('오름 실시간 구독 오류:', error);
  });
};