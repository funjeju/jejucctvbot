import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
  runTransaction,
} from 'firebase/firestore';
import type { PointLog, PointLogType, PointBox, PointLocationRecord } from '../types';

// 포인트 설정값
export const POINT_CONFIG = {
  FEED_PHOTO: 10,           // 사진 피드 등록
  FEED_VIDEO: 30,           // 동영상 피드 등록
  FEED_24H_BONUS: 20,       // 24시간 내 촬영 보너스
  CCTV_CAPTURE_BONUS: 50,   // CCTV 캡쳐 인증 보너스
  CHAT_AWARD_1ST: 100,      // 채팅 우수자 1등
  CHAT_AWARD_2ND: 50,       // 채팅 우수자 2등
  CHAT_AWARD_3RD: 30,       // 채팅 우수자 3등
  GPS_DUPLICATE_RADIUS: 100, // 중복 방지 반경 (미터)
};

// 두 지점 사이의 거리 계산 (Haversine 공식)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위
};

// 해당 위치에서 이미 포인트를 받았는지 확인
export const checkLocationDuplicate = async (
  userId: string,
  type: 'photo' | 'video',
  latitude: number,
  longitude: number
): Promise<boolean> => {
  try {
    const recordsRef = collection(db, 'pointLocationRecords');
    const q = query(
      recordsRef,
      where('userId', '==', userId),
      where('type', '==', type)
    );
    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const record = doc.data() as PointLocationRecord;
      const distance = calculateDistance(
        latitude,
        longitude,
        record.latitude,
        record.longitude
      );
      if (distance < POINT_CONFIG.GPS_DUPLICATE_RADIUS) {
        return true; // 100m 이내에 이미 포인트를 받은 기록이 있음
      }
    }
    return false;
  } catch (error) {
    console.error('위치 중복 확인 실패:', error);
    return false;
  }
};

// 포인트 지급
export const grantPoints = async (
  userId: string,
  type: PointLogType,
  amount: number,
  description: string,
  options?: {
    relatedId?: string;
    location?: { latitude: number; longitude: number };
  }
): Promise<boolean> => {
  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        console.error('사용자를 찾을 수 없음:', userId);
        return false;
      }

      const userData = userDoc.data();
      const currentPoints = userData.points || 0;
      const newBalance = currentPoints + amount;

      // 사용자 포인트 업데이트
      transaction.update(userRef, {
        points: newBalance,
        totalEarnedPoints: increment(amount > 0 ? amount : 0),
        totalSpentPoints: increment(amount < 0 ? Math.abs(amount) : 0),
        updatedAt: Timestamp.now(),
      });

      // 포인트 로그 추가
      const logRef = doc(collection(db, 'pointLogs'));
      transaction.set(logRef, {
        userId,
        type,
        amount,
        balance: newBalance,
        description,
        relatedId: options?.relatedId,
        location: options?.location,
        createdAt: Timestamp.now(),
      });

      // 위치 기록 저장 (피드 포인트인 경우)
      if (options?.location && (type === 'feed_photo' || type === 'feed_video')) {
        const locRecordRef = doc(collection(db, 'pointLocationRecords'));
        transaction.set(locRecordRef, {
          userId,
          type: type === 'feed_photo' ? 'photo' : 'video',
          latitude: options.location.latitude,
          longitude: options.location.longitude,
          feedId: options.relatedId || '',
          createdAt: Timestamp.now(),
        });
      }

      return true;
    });
  } catch (error) {
    console.error('포인트 지급 실패:', error);
    return false;
  }
};

// 사용자 포인트 로그 조회
export const getPointLogs = async (
  userId: string,
  limitCount: number = 50
): Promise<PointLog[]> => {
  try {
    const logsRef = collection(db, 'pointLogs');
    const q = query(
      logsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PointLog[];
  } catch (error) {
    console.error('포인트 로그 조회 실패:', error);
    return [];
  }
};

// 포인트 박스 생성
export const createPointBox = async (
  creatorId: string,
  creatorName: string,
  totalPoints: number,
  maxClaims: number,
  distributionType: 'equal' | 'random'
): Promise<string | null> => {
  try {
    // 생성자의 포인트 차감
    const userRef = doc(db, 'users', creatorId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;

    if (currentPoints < totalPoints) {
      console.error('포인트 부족');
      return null;
    }

    // 트랜잭션으로 처리
    return await runTransaction(db, async (transaction) => {
      // 포인트 차감
      transaction.update(userRef, {
        points: increment(-totalPoints),
        totalSpentPoints: increment(totalPoints),
        updatedAt: Timestamp.now(),
      });

      // 포인트 박스 생성
      const boxRef = doc(collection(db, 'pointBoxes'));
      const expiredAt = new Date();
      expiredAt.setHours(expiredAt.getHours() + 24);

      transaction.set(boxRef, {
        creatorId,
        creatorName,
        totalPoints,
        remainingPoints: totalPoints,
        maxClaims,
        claimedCount: 0,
        claimedBy: [],
        distributionType,
        isActive: true,
        createdAt: Timestamp.now(),
        expiredAt: Timestamp.fromDate(expiredAt),
      });

      // 포인트 로그
      const logRef = doc(collection(db, 'pointLogs'));
      transaction.set(logRef, {
        userId: creatorId,
        type: 'point_spend',
        amount: -totalPoints,
        balance: currentPoints - totalPoints,
        description: `포인트 박스 생성 (${maxClaims}명 대상)`,
        relatedId: boxRef.id,
        createdAt: Timestamp.now(),
      });

      return boxRef.id;
    });
  } catch (error) {
    console.error('포인트 박스 생성 실패:', error);
    return null;
  }
};

// 포인트 박스에서 포인트 받기
export const claimPointBox = async (
  boxId: string,
  userId: string
): Promise<{ success: boolean; claimedPoints?: number; message?: string }> => {
  try {
    return await runTransaction(db, async (transaction) => {
      const boxRef = doc(db, 'pointBoxes', boxId);
      const boxDoc = await transaction.get(boxRef);

      if (!boxDoc.exists()) {
        console.error('포인트 박스를 찾을 수 없음');
        return { success: false, message: '포인트 박스를 찾을 수 없습니다.' };
      }

      const boxData = boxDoc.data() as PointBox;

      // 유효성 검사
      if (boxData.creatorId === userId) {
        console.error('본인이 만든 포인트 박스는 받을 수 없음');
        return { success: false, message: '본인이 만든 포인트 박스는 받을 수 없습니다.' };
      }

      if (!boxData.isActive) {
        console.error('비활성화된 포인트 박스');
        return { success: false, message: '이미 종료된 포인트 박스입니다.' };
      }

      if (boxData.claimedBy.includes(userId)) {
        console.error('이미 받은 포인트 박스');
        return { success: false, message: '이미 받은 포인트 박스입니다.' };
      }

      if (boxData.claimedCount >= boxData.maxClaims) {
        console.error('포인트 박스 소진됨');
        return { success: false, message: '선착순 마감되었습니다.' };
      }

      if (boxData.remainingPoints <= 0) {
        console.error('남은 포인트 없음');
        return { success: false, message: '남은 포인트가 없습니다.' };
      }

      // 포인트 계산
      let pointsToGive: number;
      const remainingSlots = boxData.maxClaims - boxData.claimedCount;

      if (boxData.distributionType === 'equal') {
        // 균등 분배
        pointsToGive = Math.floor(boxData.totalPoints / boxData.maxClaims);
      } else {
        // 랜덤 분배
        if (remainingSlots === 1) {
          // 마지막 사람은 남은 포인트 전부
          pointsToGive = boxData.remainingPoints;
        } else {
          // 남은 포인트의 0.01 ~ 70% 사이에서 랜덤
          const maxAmount = Math.floor(boxData.remainingPoints * 0.7);
          const minAmount = Math.max(1, Math.floor(boxData.remainingPoints * 0.01));
          pointsToGive = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
        }
      }

      // ⚠️ 중요: Firestore 트랜잭션에서는 모든 읽기를 쓰기보다 먼저 수행해야 함
      // 사용자 문서 읽기 (쓰기 전에 수행)
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      const currentPoints = userDoc.exists() ? (userDoc.data().points || 0) : 0;

      // 포인트 박스 업데이트
      const newClaimedBy = [...boxData.claimedBy, userId];
      const newRemainingPoints = boxData.remainingPoints - pointsToGive;
      const newClaimedCount = boxData.claimedCount + 1;
      const isActive = newClaimedCount < boxData.maxClaims && newRemainingPoints > 0;

      transaction.update(boxRef, {
        claimedBy: newClaimedBy,
        remainingPoints: newRemainingPoints,
        claimedCount: newClaimedCount,
        isActive,
      });

      // 사용자 포인트 추가
      transaction.update(userRef, {
        points: increment(pointsToGive),
        totalEarnedPoints: increment(pointsToGive),
        updatedAt: Timestamp.now(),
      });

      // 포인트 로그
      const logRef = doc(collection(db, 'pointLogs'));
      transaction.set(logRef, {
        userId,
        type: 'chat_pointbox',
        amount: pointsToGive,
        balance: currentPoints + pointsToGive,
        description: `${boxData.creatorName}님의 포인트 박스에서 획득`,
        relatedId: boxId,
        createdAt: Timestamp.now(),
      });

      return { success: true, claimedPoints: pointsToGive };
    });
  } catch (error) {
    console.error('포인트 박스 수령 실패:', error);
    return { success: false, message: '포인트 박스 수령에 실패했습니다.' };
  }
};

// EXIF 날짜가 24시간 이내인지 확인
export const isWithin24Hours = (exifDateTime?: string): boolean => {
  if (!exifDateTime) return false;

  try {
    // EXIF 날짜 형식: "2024:01:15 14:30:00" 또는 "2024-01-15T14:30:00"
    const normalized = exifDateTime.replace(/:/g, '-').replace(' ', 'T');
    const exifDate = new Date(normalized);
    const now = new Date();
    const diffMs = now.getTime() - exifDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours >= 0 && diffHours <= 24;
  } catch (error) {
    console.error('EXIF 날짜 파싱 실패:', error);
    return false;
  }
};

// ============================================
// 관리자 전용 포인트 관리 함수
// ============================================

// 관리자 자가 포인트 충전
export const adminSelfChargePoints = async (
  adminId: string,
  amount: number,
  description: string = '관리자 포인트 충전'
): Promise<boolean> => {
  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', adminId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        console.error('사용자를 찾을 수 없음:', adminId);
        return false;
      }

      const userData = userDoc.data();



      const currentPoints = userData.points || 0;
      const newBalance = currentPoints + amount;

      // 사용자 포인트 업데이트
      transaction.update(userRef, {
        points: newBalance,
        totalEarnedPoints: increment(amount),
        updatedAt: Timestamp.now(),
      });

      // 포인트 로그 추가
      const logRef = doc(collection(db, 'pointLogs'));
      transaction.set(logRef, {
        userId: adminId,
        type: 'admin_grant',
        amount,
        balance: newBalance,
        description,
        createdAt: Timestamp.now(),
      });

      return true;
    });
  } catch (error) {
    console.error('관리자 포인트 충전 실패:', error);
    return false;
  }
};

// 관리자가 특정 사용자에게 포인트 지급
export const adminGrantPointsToUser = async (
  adminId: string,
  targetUserId: string,
  amount: number,
  description: string = '관리자 포인트 지급'
): Promise<boolean> => {
  try {
    // 먼저 관리자 권한 확인
    const adminRef = doc(db, 'users', adminId);
    const adminDoc = await getDoc(adminRef);

    if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
      console.error('관리자 권한이 없습니다.');
      return false;
    }

    return await runTransaction(db, async (transaction) => {
      const targetUserRef = doc(db, 'users', targetUserId);
      const targetUserDoc = await transaction.get(targetUserRef);

      if (!targetUserDoc.exists()) {
        console.error('대상 사용자를 찾을 수 없음:', targetUserId);
        return false;
      }

      const targetUserData = targetUserDoc.data();
      const currentPoints = targetUserData.points || 0;
      const newBalance = currentPoints + amount;

      // 대상 사용자 포인트 업데이트
      transaction.update(targetUserRef, {
        points: newBalance,
        totalEarnedPoints: increment(amount > 0 ? amount : 0),
        totalSpentPoints: increment(amount < 0 ? Math.abs(amount) : 0),
        updatedAt: Timestamp.now(),
      });

      // 포인트 로그 추가
      const logRef = doc(collection(db, 'pointLogs'));
      transaction.set(logRef, {
        userId: targetUserId,
        type: amount > 0 ? 'admin_grant' : 'admin_deduct',
        amount,
        balance: newBalance,
        description,
        grantedBy: adminId,
        createdAt: Timestamp.now(),
      });

      return true;
    });
  } catch (error) {
    console.error('사용자 포인트 지급 실패:', error);
    return false;
  }
};

// 이메일로 사용자 검색
export const searchUserByEmail = async (email: string): Promise<{ uid: string; email: string; displayName?: string; points: number } | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    return {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName,
      points: userData.points || 0,
    };
  } catch (error) {
    console.error('사용자 검색 실패:', error);
    return null;
  }
};

// 포인트 박스 삭제 (생성자 또는 관리자만 가능)
export const deletePointBox = async (
  boxId: string,
  userId: string,
  userRole: string
): Promise<{ success: boolean; message: string; refundedPoints?: number }> => {
  try {
    return await runTransaction(db, async (transaction) => {
      const boxRef = doc(db, 'pointBoxes', boxId);
      const boxDoc = await transaction.get(boxRef);

      if (!boxDoc.exists()) {
        return { success: false, message: '포인트 박스를 찾을 수 없습니다.' };
      }

      const boxData = boxDoc.data() as PointBox;

      // 권한 확인: 생성자 또는 관리자만 삭제 가능
      if (boxData.creatorId !== userId && userRole !== 'admin') {
        return { success: false, message: '삭제 권한이 없습니다.' };
      }

      // 남은 포인트가 있으면 생성자에게 환불
      let refundedPoints = 0;
      if (boxData.remainingPoints > 0) {
        const creatorRef = doc(db, 'users', boxData.creatorId);
        const creatorDoc = await transaction.get(creatorRef);

        if (creatorDoc.exists()) {
          const creatorData = creatorDoc.data();
          const currentPoints = creatorData.points || 0;
          refundedPoints = boxData.remainingPoints;

          // 생성자에게 포인트 환불
          transaction.update(creatorRef, {
            points: currentPoints + refundedPoints,
            totalEarnedPoints: increment(refundedPoints),
            updatedAt: Timestamp.now(),
          });

          // 환불 로그 추가
          const logRef = doc(collection(db, 'pointLogs'));
          transaction.set(logRef, {
            userId: boxData.creatorId,
            type: 'admin_grant',
            amount: refundedPoints,
            balance: currentPoints + refundedPoints,
            description: `포인트 박스 삭제로 인한 환불 (박스 ID: ${boxId})`,
            relatedId: boxId,
            createdAt: Timestamp.now(),
          });
        }
      }

      // 포인트 박스 삭제
      transaction.delete(boxRef);

      return {
        success: true,
        message: refundedPoints > 0
          ? `포인트 박스가 삭제되었습니다. ${refundedPoints}P가 환불되었습니다.`
          : '포인트 박스가 삭제되었습니다.',
        refundedPoints,
      };
    });
  } catch (error) {
    console.error('포인트 박스 삭제 실패:', error);
    return { success: false, message: '포인트 박스 삭제에 실패했습니다.' };
  }
};
