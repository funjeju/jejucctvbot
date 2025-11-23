import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, getDocs, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../services/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { FeedPost, UserCoupon, Place, PointLog } from '../types';
import FeedCard from './FeedCard';
import FeedDetailModal from './FeedDetailModal';
import BusinessRegistrationModal from './BusinessRegistrationModal';
import {
  getPointLogs,
  adminSelfChargePoints,
  adminGrantPointsToUser,
  searchUserByEmail
} from '../services/pointService';

interface MyPageProps {
  spots: Place[];
  language: 'KOR' | 'ENG' | 'CHN';
}

const translations = {
  KOR: {
    title: '마이 페이지',
    profile: '프로필',
    logout: '로그아웃',
    myFeeds: '내가 쓴 피드',
    likedFeeds: '찜한 피드',
    receivedCoupons: '받은 쿠폰',
    usedCoupons: '사용한 쿠폰',
    issuedCoupons: '발행한 쿠폰',
    couponStats: '쿠폰 통계',
    businessInfo: '사업자 정보',
    businessNumber: '사업자 번호',
    businessName: '상호명',
    businessAddress: '사업장 주소',
    businessPhone: '연락처',
    approvalStatus: '승인 상태',
    approved: '승인됨',
    pending: '승인 대기',
    editProfile: '프로필 수정',
    noFeeds: '작성한 피드가 없습니다',
    noLikedFeeds: '찜한 피드가 없습니다',
    noCoupons: '받은 쿠폰이 없습니다',
    noUsedCoupons: '사용한 쿠폰이 없습니다',
    noIssuedCoupons: '발행한 쿠폰이 없습니다',
    useCoupon: '사용하기',
    couponUsed: '사용됨',
    couponExpired: '만료됨',
    claimed: '수령됨',
    totalIssued: '총 발행',
    totalClaimed: '총 수령',
    role: '역할',
    roleUser: '일반 사용자',
    roleStore: '매장 운영자',
    roleAdmin: '관리자',
    registerBusiness: '사업자 등록',
    businessRegistration: '사업자 인증',
    pendingApproval: '승인 대기 중',
    approvedBusiness: '승인 완료',
    points: '포인트',
    pointLog: '포인트 내역',
    currentPoints: '보유 포인트',
    totalEarned: '총 획득',
    totalSpent: '총 사용',
    noPointLog: '포인트 내역이 없습니다',
    pointLogTypes: {
      feed_photo: '사진 피드 등록',
      feed_video: '동영상 피드 등록',
      feed_24h_bonus: '24시간 촬영 보너스',
      cctv_capture_bonus: 'CCTV 캡쳐 인증',
      chat_pointbox: '포인트 박스 획득',
      chat_award_1st: '채팅 우수자 1등',
      chat_award_2nd: '채팅 우수자 2등',
      chat_award_3rd: '채팅 우수자 3등',
      point_spend: '포인트 사용',
      admin_grant: '관리자 지급',
      admin_deduct: '관리자 차감',
    },
    // 관리자 전용
    adminPointManagement: '포인트 관리',
    selfCharge: '내 포인트 충전',
    grantToUser: '사용자에게 지급',
    chargeAmount: '충전할 포인트',
    charge: '충전',
    searchUser: '사용자 검색',
    searchByEmail: '이메일로 검색',
    search: '검색',
    userNotFound: '사용자를 찾을 수 없습니다.',
    grantAmount: '지급할 포인트',
    grantReason: '지급 사유',
    grant: '지급',
    deduct: '차감',
    chargeSuccess: '포인트가 충전되었습니다!',
    grantSuccess: '포인트가 지급되었습니다!',
    deductSuccess: '포인트가 차감되었습니다!',
    operationFailed: '작업에 실패했습니다.',
    editNickname: '닉네임 수정',
    changeProfileImage: '프로필 이미지 변경',
    save: '저장',
    cancel: '취소',
    uploading: '업로드 중...',
    nicknamePlaceholder: '닉네임을 입력하세요',
    profileUpdated: '프로필이 업데이트되었습니다!',
    updateFailed: '업데이트에 실패했습니다.',
  },
  ENG: {
    title: 'My Page',
    profile: 'Profile',
    logout: 'Logout',
    myFeeds: 'My Feeds',
    likedFeeds: 'Liked Feeds',
    receivedCoupons: 'Received Coupons',
    usedCoupons: 'Used Coupons',
    issuedCoupons: 'Issued Coupons',
    couponStats: 'Coupon Statistics',
    businessInfo: 'Business Information',
    businessNumber: 'Business Number',
    businessName: 'Business Name',
    businessAddress: 'Business Address',
    businessPhone: 'Contact',
    approvalStatus: 'Approval Status',
    approved: 'Approved',
    pending: 'Pending Approval',
    editProfile: 'Edit Profile',
    noFeeds: 'No feeds yet',
    noLikedFeeds: 'No liked feeds',
    noCoupons: 'No coupons received',
    noUsedCoupons: 'No used coupons',
    noIssuedCoupons: 'No issued coupons',
    useCoupon: 'Use',
    couponUsed: 'Used',
    couponExpired: 'Expired',
    claimed: 'Claimed',
    totalIssued: 'Total Issued',
    totalClaimed: 'Total Claimed',
    role: 'Role',
    roleUser: 'User',
    roleStore: 'Store',
    roleAdmin: 'Admin',
    registerBusiness: 'Register Business',
    businessRegistration: 'Business Verification',
    pendingApproval: 'Pending Approval',
    approvedBusiness: 'Approved',
    points: 'Points',
    pointLog: 'Point History',
    currentPoints: 'Current Points',
    totalEarned: 'Total Earned',
    totalSpent: 'Total Spent',
    noPointLog: 'No point history',
    pointLogTypes: {
      feed_photo: 'Photo Feed Upload',
      feed_video: 'Video Feed Upload',
      feed_24h_bonus: '24h Fresh Bonus',
      cctv_capture_bonus: 'CCTV Capture Bonus',
      chat_pointbox: 'Point Box Claim',
      chat_award_1st: 'Chat Award 1st',
      chat_award_2nd: 'Chat Award 2nd',
      chat_award_3rd: 'Chat Award 3rd',
      point_spend: 'Point Spent',
      admin_grant: 'Admin Grant',
      admin_deduct: 'Admin Deduct',
    },
    // Admin only
    adminPointManagement: 'Point Management',
    selfCharge: 'Charge My Points',
    grantToUser: 'Grant to User',
    chargeAmount: 'Amount to Charge',
    charge: 'Charge',
    searchUser: 'Search User',
    searchByEmail: 'Search by Email',
    search: 'Search',
    userNotFound: 'User not found.',
    grantAmount: 'Amount to Grant',
    grantReason: 'Reason',
    grant: 'Grant',
    deduct: 'Deduct',
    chargeSuccess: 'Points charged successfully!',
    grantSuccess: 'Points granted successfully!',
    deductSuccess: 'Points deducted successfully!',
    operationFailed: 'Operation failed.',
    editNickname: 'Edit Nickname',
    changeProfileImage: 'Change Profile Image',
    save: 'Save',
    cancel: 'Cancel',
    uploading: 'Uploading...',
    nicknamePlaceholder: 'Enter nickname',
    profileUpdated: 'Profile updated successfully!',
    updateFailed: 'Update failed.',
  },
  CHN: {
    title: '我的页面',
    profile: '个人资料',
    logout: '登出',
    myFeeds: '我的动态',
    likedFeeds: '收藏的动态',
    receivedCoupons: '领取的优惠券',
    usedCoupons: '已使用的优惠券',
    issuedCoupons: '发行的优惠券',
    couponStats: '优惠券统计',
    businessInfo: '商家信息',
    businessNumber: '营业执照号',
    businessName: '商家名称',
    businessAddress: '商家地址',
    businessPhone: '联系方式',
    approvalStatus: '审批状态',
    approved: '已批准',
    pending: '待审批',
    editProfile: '编辑资料',
    noFeeds: '还没有动态',
    noLikedFeeds: '还没有收藏动态',
    noCoupons: '还没有优惠券',
    noUsedCoupons: '还没有使用过优惠券',
    noIssuedCoupons: '还没有发行优惠券',
    useCoupon: '使用',
    couponUsed: '已使用',
    couponExpired: '已过期',
    claimed: '已领取',
    totalIssued: '总发行',
    totalClaimed: '总领取',
    role: '角色',
    roleUser: '用户',
    roleStore: '商家',
    roleAdmin: '管理员',
    registerBusiness: '商家注册',
    businessRegistration: '商家认证',
    pendingApproval: '待审批',
    approvedBusiness: '已批准',
    points: '积分',
    pointLog: '积分记录',
    currentPoints: '当前积分',
    totalEarned: '累计获得',
    totalSpent: '累计消费',
    noPointLog: '暂无积分记录',
    pointLogTypes: {
      feed_photo: '照片动态',
      feed_video: '视频动态',
      feed_24h_bonus: '24小时新鲜奖励',
      cctv_capture_bonus: 'CCTV截图奖励',
      chat_pointbox: '积分盒子',
      chat_award_1st: '聊天第一名',
      chat_award_2nd: '聊天第二名',
      chat_award_3rd: '聊天第三名',
      point_spend: '积分消费',
      admin_grant: '管理员发放',
      admin_deduct: '管理员扣除',
    },
    // 管理员专用
    adminPointManagement: '积分管理',
    selfCharge: '充值我的积分',
    grantToUser: '发放给用户',
    chargeAmount: '充值金额',
    charge: '充值',
    searchUser: '搜索用户',
    searchByEmail: '通过邮箱搜索',
    search: '搜索',
    userNotFound: '未找到用户。',
    grantAmount: '发放金额',
    grantReason: '原因',
    grant: '发放',
    deduct: '扣除',
    chargeSuccess: '积分充值成功！',
    grantSuccess: '积分发放成功！',
    deductSuccess: '积分扣除成功！',
    operationFailed: '操作失败。',
    editNickname: '编辑昵称',
    changeProfileImage: '更改头像',
    save: '保存',
    cancel: '取消',
    uploading: '上传中...',
    nicknamePlaceholder: '请输入昵称',
    profileUpdated: '个人资料更新成功！',
    updateFailed: '更新失败。',
  },
};

type TabType = 'myFeeds' | 'likedFeeds' | 'points' | 'receivedCoupons' | 'usedCoupons' | 'issuedCoupons' | 'couponStats' | 'businessInfo' | 'adminPoints';

const MyPage: React.FC<MyPageProps> = ({ spots, language }) => {
  const { user, userProfile, signOut, loading: authLoading } = useAuth();
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<TabType>('myFeeds');
  const [myFeeds, setMyFeeds] = useState<FeedPost[]>([]);
  const [likedFeeds, setLikedFeeds] = useState<FeedPost[]>([]);
  const [receivedCoupons, setReceivedCoupons] = useState<UserCoupon[]>([]);
  const [usedCoupons, setUsedCoupons] = useState<UserCoupon[]>([]);
  const [issuedCoupons, setIssuedCoupons] = useState<any[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<FeedPost | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // 관리자 포인트 관리 상태
  const [chargeAmount, setChargeAmount] = useState(10000);
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<{ uid: string; email: string; displayName?: string; points: number } | null>(null);
  const [grantAmount, setGrantAmount] = useState(100);
  const [grantReason, setGrantReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 프로필 수정 상태
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 역할에 따른 탭 설정
  const tabs: { id: TabType; label: string }[] = [];
  tabs.push({ id: 'myFeeds', label: t.myFeeds });
  tabs.push({ id: 'likedFeeds', label: t.likedFeeds });
  tabs.push({ id: 'points', label: t.points });
  tabs.push({ id: 'receivedCoupons', label: t.receivedCoupons });
  tabs.push({ id: 'usedCoupons', label: t.usedCoupons });

  if (userProfile?.role === 'store' || userProfile?.role === 'admin') {
    tabs.push({ id: 'issuedCoupons', label: t.issuedCoupons });
    tabs.push({ id: 'couponStats', label: t.couponStats });
  }

  if (userProfile?.role === 'store') {
    tabs.push({ id: 'businessInfo', label: t.businessInfo });
  }

  // 관리자 전용 탭
  if (userProfile?.role === 'admin') {
    tabs.push({ id: 'adminPoints', label: (t as any).adminPointManagement || '포인트 관리' });
  }

  // 내가 쓴 피드 로드
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'feeds'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feeds: FeedPost[] = [];
      snapshot.forEach((doc) => {
        feeds.push({ id: doc.id, ...doc.data() } as FeedPost);
      });
      setMyFeeds(feeds);
    });

    return () => unsubscribe();
  }, [user]);

  // 찜한 피드 로드 (bookmarkedBy 기반)
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'feeds'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feeds: FeedPost[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as FeedPost;
        if (data.bookmarkedBy?.includes(user.uid)) {
          feeds.push({ id: doc.id, ...data });
        }
      });
      setLikedFeeds(feeds);
    });

    return () => unsubscribe();
  }, [user]);

  // 받은 쿠폰 로드
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'userCoupons'),
      where('userId', '==', user.uid),
      where('used', '==', false),
      orderBy('claimedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const coupons: UserCoupon[] = [];
      snapshot.forEach((doc) => {
        coupons.push({ id: doc.id, ...doc.data() } as UserCoupon);
      });
      setReceivedCoupons(coupons);
      setLoadingCoupons(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 사용한 쿠폰 로드
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'userCoupons'),
      where('userId', '==', user.uid),
      where('used', '==', true),
      orderBy('usedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const coupons: UserCoupon[] = [];
      snapshot.forEach((doc) => {
        coupons.push({ id: doc.id, ...doc.data() } as UserCoupon);
      });
      setUsedCoupons(coupons);
    });

    return () => unsubscribe();
  }, [user]);

  // 발행한 쿠폰 로드 (매장/관리자)
  useEffect(() => {
    if (!user || (userProfile?.role !== 'store' && userProfile?.role !== 'admin')) return;

    const q = query(
      collection(db, 'doodles'),
      where('type', '==', 'coupon'),
      where('issuedBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const coupons: any[] = [];
      snapshot.forEach((doc) => {
        coupons.push({ id: doc.id, ...doc.data() });
      });
      setIssuedCoupons(coupons);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  // 포인트 로그 로드
  useEffect(() => {
    if (!user || activeTab !== 'points') return;

    const loadPointLogs = async () => {
      setLoadingPoints(true);
      try {
        const logs = await getPointLogs(user.uid, 50);
        setPointLogs(logs);
      } catch (error) {
        console.error('포인트 로그 로드 실패:', error);
      } finally {
        setLoadingPoints(false);
      }
    };

    loadPointLogs();
  }, [user, activeTab]);

  // selectedFeedId가 변경되면 해당 피드를 myFeeds 또는 likedFeeds에서 찾아 selectedFeed 업데이트
  useEffect(() => {
    if (selectedFeedId) {
      // 내가 쓴 피드에서 먼저 찾기
      let updatedFeed = myFeeds.find(f => f.id === selectedFeedId);
      // 없으면 찜한 피드에서 찾기
      if (!updatedFeed) {
        updatedFeed = likedFeeds.find(f => f.id === selectedFeedId);
      }
      if (updatedFeed) {
        setSelectedFeed(updatedFeed);
      }
    }
  }, [myFeeds, likedFeeds, selectedFeedId]);

  const handleUseCoupon = async (couponId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'userCoupons', couponId), {
        used: true,
        usedAt: new Date(),
      });
      alert('쿠폰을 사용했습니다!');
    } catch (error) {
      console.error('Failed to use coupon:', error);
      alert('쿠폰 사용에 실패했습니다.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // 프로필 생성 핸들러
  const handleCreateProfile = async () => {
    if (!user) return;

    try {
      const WELCOME_BONUS = 100;
      const newProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null,
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        feedCount: 0,
        couponIssuedCount: 0,
        points: WELCOME_BONUS,
        totalEarnedPoints: WELCOME_BONUS,
        totalSpentPoints: 0,
      };

      await setDoc(doc(db, 'users', user.uid), newProfile);

      // 웰컴 보너스 로그
      const { collection: firestoreCollection, addDoc, Timestamp } = await import('firebase/firestore');
      await addDoc(firestoreCollection(db, 'pointLogs'), {
        userId: user.uid,
        type: 'admin_grant',
        amount: WELCOME_BONUS,
        balance: WELCOME_BONUS,
        description: '신규 가입 웰컴 보너스',
        createdAt: Timestamp.now(),
      });

      window.location.reload(); // 프로필 생성 후 새로고침
    } catch (error) {
      console.error('프로필 생성 실패:', error);
      // 에러가 나도 무한 루프를 방지하기 위해 별도 처리는 하지 않음 (콘솔 확인)
    }
  };

  // 프로필이 없으면 자동으로 생성 시도
  useEffect(() => {
    if (user && !userProfile && !authLoading) {
      handleCreateProfile();
    }
  }, [user, userProfile, authLoading]);

  // 닉네임 수정 핸들러
  const handleNicknameEdit = async () => {
    if (!user || !newNickname.trim()) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: newNickname.trim(),
        updatedAt: serverTimestamp(),
      });
      setIsEditingNickname(false);
      setNewNickname('');
      alert(t.profileUpdated);
    } catch (error) {
      console.error('닉네임 업데이트 실패:', error);
      alert(t.updateFailed);
    }
  };

  // 프로필 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setSelectedImage(file);
    handleImageUpload(file);
  };

  // 프로필 이미지 업로드 핸들러
  const handleImageUpload = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Firebase Storage에 업로드
      const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('이미지 업로드 실패:', error);
          alert(t.updateFailed);
          setIsUploading(false);
        },
        async () => {
          // 업로드 완료 후 URL 가져오기
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Firestore 업데이트
          await updateDoc(doc(db, 'users', user.uid), {
            photoURL: downloadURL,
            updatedAt: serverTimestamp(),
          });

          setIsUploading(false);
          setUploadProgress(0);
          setSelectedImage(null);
          alert(t.profileUpdated);
        }
      );
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert(t.updateFailed);
      setIsUploading(false);
    }
  };


  if (authLoading || (user && !userProfile)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? '로그인 정보를 확인 중입니다...' : '사용자 프로필을 생성 중입니다...'}
          </p>
        </div>
      </div>
    );
  }

  // 아예 로그인이 안 된 경우
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">로그인이 필요합니다.</p>
      </div>
    );
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return t.roleAdmin;
      case 'store':
        return t.roleStore;
      default:
        return t.roleUser;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 lg:pb-0">
      {/* 프로필 카드 */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* 프로필 이미지 */}
            <div className="relative">
              <div
                className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
              >
                {userProfile.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-indigo-600">
                    {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              {/* 카메라 아이콘 오버레이 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1.5 hover:bg-indigo-700 transition-colors shadow-md"
                title={t.changeProfileImage}
              >
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {/* 업로드 진행 표시 */}
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="text-white text-xs font-bold">{Math.round(uploadProgress)}%</div>
                </div>
              )}
              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              {/* 닉네임 표시/수정 */}
              {isEditingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder={t.nicknamePlaceholder}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleNicknameEdit}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {t.save}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingNickname(false);
                      setNewNickname('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800">{userProfile.displayName || 'User'}</h2>
                  <button
                    onClick={() => {
                      setIsEditingNickname(true);
                      setNewNickname(userProfile.displayName || '');
                    }}
                    className="text-indigo-600 hover:text-indigo-700 transition-colors"
                    title={t.editNickname}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-600">{userProfile.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-600 text-xs font-medium rounded-full">
                  {getRoleName(userProfile.role)}
                </span>
                {/* 포인트 표시 */}
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(userProfile.points || 0).toLocaleString()} P
                </span>
                {/* 사업자 승인 상태 표시 */}
                {userProfile.role === 'store' && (
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${userProfile.businessApproved
                    ? 'bg-green-100 text-green-600'
                    : 'bg-yellow-100 text-yellow-600'
                    }`}>
                    {userProfile.businessApproved ? t.approvedBusiness : t.pendingApproval}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t.logout}
          </button>
        </div>

        {/* 일반 사용자인 경우 사업자 등록 버튼 표시 */}
        {userProfile.role === 'user' && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsBusinessModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-medium">{t.registerBusiness}</span>
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              사업자로 등록하시면 쿠폰 발급 기능을 사용하실 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <div className="flex border-b border-gray-200 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="mt-4">
        {/* 내가 쓴 피드 - 갤러리 형태 */}
        {activeTab === 'myFeeds' && (
          <div>
            {myFeeds.length === 0 ? (
              <div className="bg-white shadow-md rounded-lg p-8 text-center">
                <p className="text-gray-600">{t.noFeeds}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {myFeeds.map((feed) => {
                  const mainMedia = feed.media[0];
                  return (
                    <div
                      key={feed.id}
                      onClick={() => {
                        setSelectedFeed(feed);
                        setSelectedFeedId(feed.id);
                      }}
                      className="relative aspect-square cursor-pointer overflow-hidden bg-gray-200 hover:opacity-90 transition-opacity"
                    >
                      {mainMedia?.type === 'image' ? (
                        <img
                          src={mainMedia.url}
                          alt={feed.title}
                          className="w-full h-full object-cover"
                        />
                      ) : mainMedia?.type === 'video' ? (
                        <video
                          src={mainMedia.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* 미디어 타입 표시 */}
                      {mainMedia?.type === 'video' && (
                        <div className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                      {/* 좋아요 수 표시 */}
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-xs text-white">{feed.likes || 0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 찜한 피드 */}
        {activeTab === 'likedFeeds' && (
          <div>
            {likedFeeds.length === 0 ? (
              <div className="bg-white shadow-md rounded-lg p-8 text-center">
                <p className="text-gray-600">{t.noLikedFeeds}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {likedFeeds.map((feed) => {
                  const mainMedia = feed.media[0];
                  return (
                    <div
                      key={feed.id}
                      onClick={() => {
                        setSelectedFeed(feed);
                        setSelectedFeedId(feed.id);
                      }}
                      className="relative aspect-square cursor-pointer overflow-hidden bg-gray-200 hover:opacity-90 transition-opacity"
                    >
                      {mainMedia?.type === 'image' ? (
                        <img
                          src={mainMedia.url}
                          alt={feed.title}
                          className="w-full h-full object-cover"
                        />
                      ) : mainMedia?.type === 'video' ? (
                        <video
                          src={mainMedia.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* 북마크 표시 */}
                      <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-1">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 포인트 탭 */}
        {activeTab === 'points' && (
          <div className="space-y-4">
            {/* 포인트 요약 카드 */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t.currentPoints}</h3>
                <svg className="w-8 h-8 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold mb-4">
                {(userProfile?.points || 0).toLocaleString()} P
              </p>
              <div className="flex gap-6 text-sm opacity-90">
                <div>
                  <span className="opacity-75">{t.totalEarned}:</span>
                  <span className="ml-2 font-semibold">+{(userProfile?.totalEarnedPoints || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="opacity-75">{t.totalSpent}:</span>
                  <span className="ml-2 font-semibold">-{(userProfile?.totalSpentPoints || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 포인트 충전 (모든 사용자용) */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {(t as any).selfCharge || '내 포인트 충전'}
              </h3>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {(t as any).chargeAmount || '충전할 포인트'}
                  </label>
                  <input
                    type="number"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(Number(e.target.value))}
                    min={100}
                    step={100}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={async () => {
                      if (!user || chargeAmount < 100) return;
                      setIsProcessing(true);
                      const success = await adminSelfChargePoints(user.uid, chargeAmount, `포인트 충전 ${chargeAmount}P`);
                      setIsProcessing(false);
                      if (success) {
                        alert((t as any).chargeSuccess || '포인트가 충전되었습니다!');
                        window.location.reload();
                      } else {
                        alert((t as any).operationFailed || '작업에 실패했습니다.');
                      }
                    }}
                    disabled={isProcessing || chargeAmount < 100}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {isProcessing ? '...' : `+${chargeAmount.toLocaleString()}P ${(t as any).charge || '충전'}`}
                  </button>
                </div>
              </div>

              {/* 빠른 충전 버튼 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[1000, 5000, 10000, 50000, 100000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setChargeAmount(amount)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${chargeAmount === amount
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {amount.toLocaleString()}P
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white shadow-md rounded-lg p-4">
              <h4 className="text-lg font-bold text-gray-800 mb-4">{t.pointLog}</h4>

              {loadingPoints ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : pointLogs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t.noPointLog}</p>
              ) : (
                <div className="space-y-3">
                  {pointLogs.map((log) => {
                    const isPositive = log.amount > 0;
                    const logTypeLabel = (t.pointLogTypes as Record<string, string>)[log.type] || log.type;
                    const logDate = log.createdAt?.toDate?.()
                      ? log.createdAt.toDate().toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      : '';

                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            {isPositive ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{logTypeLabel}</p>
                            <p className="text-xs text-gray-500">{log.description}</p>
                            <p className="text-xs text-gray-400">{logDate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{log.amount.toLocaleString()} P
                          </p>
                          <p className="text-xs text-gray-400">
                            잔액: {log.balance.toLocaleString()} P
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 받은 쿠폰 */}
        {activeTab === 'receivedCoupons' && (
          <div className="space-y-4">
            {receivedCoupons.length === 0 ? (
              <div className="bg-white shadow-md rounded-lg p-8 text-center">
                <p className="text-gray-600">{t.noCoupons}</p>
              </div>
            ) : (
              receivedCoupons.map((coupon) => (
                <div key={coupon.id} className="bg-white shadow-md rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{coupon.couponTitle}</h3>
                      <p className="text-sm text-gray-600 mb-2">{coupon.couponDescription}</p>
                      <div className="text-xs text-gray-500">
                        <p>{coupon.storeName}</p>
                        <p>{coupon.storeAddress}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUseCoupon(coupon.id)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      {t.useCoupon}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 사용한 쿠폰 */}
        {activeTab === 'usedCoupons' && (
          <div className="space-y-4">
            {usedCoupons.length === 0 ? (
              <div className="bg-white shadow-md rounded-lg p-8 text-center">
                <p className="text-gray-600">{t.noUsedCoupons}</p>
              </div>
            ) : (
              usedCoupons.map((coupon) => (
                <div key={coupon.id} className="bg-gray-100 shadow-md rounded-lg p-6 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{coupon.couponTitle}</h3>
                      <p className="text-sm text-gray-600 mb-2">{coupon.couponDescription}</p>
                      <div className="text-xs text-gray-500">
                        <p>{coupon.storeName}</p>
                        <p>{coupon.storeAddress}</p>
                      </div>
                    </div>
                    <span className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg">
                      {t.couponUsed}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 발행한 쿠폰 (매장/관리자) */}
        {activeTab === 'issuedCoupons' && (
          <div className="space-y-4">
            {issuedCoupons.length === 0 ? (
              <div className="bg-white shadow-md rounded-lg p-8 text-center">
                <p className="text-gray-600">{t.noIssuedCoupons}</p>
              </div>
            ) : (
              issuedCoupons.map((coupon) => (
                <div key={coupon.id} className="bg-white shadow-md rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{coupon.couponTitle}</h3>
                  <p className="text-sm text-gray-600 mb-3">{coupon.couponDescription}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full">
                      {t.totalIssued}: {coupon.maxClaims}
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-600 rounded-full">
                      {t.totalClaimed}: {coupon.claimedBy?.length || 0}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 사업자 정보 (매장) */}
        {activeTab === 'businessInfo' && userProfile.role === 'store' && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t.businessInfo}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.businessNumber}
                </label>
                <p className="text-gray-800">{userProfile.businessNumber || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.businessName}
                </label>
                <p className="text-gray-800">{userProfile.businessName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.businessAddress}
                </label>
                <p className="text-gray-800">{userProfile.businessAddress || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.businessPhone}
                </label>
                <p className="text-gray-800">{userProfile.businessPhone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.approvalStatus}
                </label>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${userProfile.businessApproved
                    ? 'bg-green-100 text-green-600'
                    : 'bg-yellow-100 text-yellow-600'
                    }`}
                >
                  {userProfile.businessApproved ? t.approved : t.pending}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 관리자 포인트 관리 */}
        {activeTab === 'adminPoints' && userProfile.role === 'admin' && (
          <div className="space-y-6">
            {/* 내 포인트 충전 */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {(t as any).selfCharge || '내 포인트 충전'}
              </h3>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {(t as any).chargeAmount || '충전할 포인트'}
                  </label>
                  <input
                    type="number"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(Number(e.target.value))}
                    min={100}
                    step={100}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={async () => {
                      if (!user || chargeAmount < 100) return;
                      setIsProcessing(true);
                      const success = await adminSelfChargePoints(user.uid, chargeAmount, `관리자 자가 충전 ${chargeAmount}P`);
                      setIsProcessing(false);
                      if (success) {
                        alert((t as any).chargeSuccess || '포인트가 충전되었습니다!');
                        window.location.reload();
                      } else {
                        alert((t as any).operationFailed || '작업에 실패했습니다.');
                      }
                    }}
                    disabled={isProcessing || chargeAmount < 100}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {isProcessing ? '...' : `+${chargeAmount.toLocaleString()}P ${(t as any).charge || '충전'}`}
                  </button>
                </div>
              </div>

              {/* 빠른 충전 버튼 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[1000, 5000, 10000, 50000, 100000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setChargeAmount(amount)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${chargeAmount === amount
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {amount.toLocaleString()}P
                  </button>
                ))}
              </div>
            </div>

            {/* 사용자에게 포인트 지급 */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {(t as any).grantToUser || '사용자에게 지급'}
              </h3>

              {/* 사용자 검색 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {(t as any).searchByEmail || '이메일로 검색'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={async () => {
                      if (!searchEmail.trim()) return;
                      setIsProcessing(true);
                      const user = await searchUserByEmail(searchEmail.trim());
                      setIsProcessing(false);
                      if (user) {
                        setFoundUser(user);
                      } else {
                        setFoundUser(null);
                        alert((t as any).userNotFound || '사용자를 찾을 수 없습니다.');
                      }
                    }}
                    disabled={isProcessing || !searchEmail.trim()}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {(t as any).search || '검색'}
                  </button>
                </div>
              </div>

              {/* 검색된 사용자 정보 */}
              {foundUser && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{foundUser.displayName || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{foundUser.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">현재 포인트</p>
                      <p className="text-xl font-bold text-indigo-600">{foundUser.points.toLocaleString()}P</p>
                    </div>
                  </div>

                  {/* 포인트 지급/차감 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {(t as any).grantAmount || '지급할 포인트'}
                      </label>
                      <input
                        type="number"
                        value={grantAmount}
                        onChange={(e) => setGrantAmount(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {(t as any).grantReason || '지급 사유'}
                      </label>
                      <input
                        type="text"
                        value={grantReason}
                        onChange={(e) => setGrantReason(e.target.value)}
                        placeholder="이벤트 당첨, 보상 등"
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* 빠른 금액 선택 */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[100, 500, 1000, 5000, 10000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setGrantAmount(amount)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${grantAmount === amount
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {amount.toLocaleString()}P
                      </button>
                    ))}
                  </div>

                  {/* 지급/차감 버튼 */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={async () => {
                        if (!user || !foundUser || grantAmount <= 0) return;
                        setIsProcessing(true);
                        const success = await adminGrantPointsToUser(
                          user.uid,
                          foundUser.uid,
                          grantAmount,
                          grantReason || `관리자 포인트 지급 ${grantAmount}P`
                        );
                        setIsProcessing(false);
                        if (success) {
                          alert((t as any).grantSuccess || '포인트가 지급되었습니다!');
                          setFoundUser({ ...foundUser, points: foundUser.points + grantAmount });
                          setGrantAmount(100);
                          setGrantReason('');
                        } else {
                          alert((t as any).operationFailed || '작업에 실패했습니다.');
                        }
                      }}
                      disabled={isProcessing || grantAmount <= 0}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      +{grantAmount.toLocaleString()}P {(t as any).grant || '지급'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!user || !foundUser || grantAmount <= 0) return;
                        if (!confirm(`정말 ${foundUser.displayName || foundUser.email}님에게서 ${grantAmount}P를 차감하시겠습니까?`)) return;
                        setIsProcessing(true);
                        const success = await adminGrantPointsToUser(
                          user.uid,
                          foundUser.uid,
                          -grantAmount,
                          grantReason || `관리자 포인트 차감 ${grantAmount}P`
                        );
                        setIsProcessing(false);
                        if (success) {
                          alert((t as any).deductSuccess || '포인트가 차감되었습니다!');
                          setFoundUser({ ...foundUser, points: Math.max(0, foundUser.points - grantAmount) });
                          setGrantAmount(100);
                          setGrantReason('');
                        } else {
                          alert((t as any).operationFailed || '작업에 실패했습니다.');
                        }
                      }}
                      disabled={isProcessing || grantAmount <= 0}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      -{grantAmount.toLocaleString()}P {(t as any).deduct || '차감'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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

      {/* 사업자 등록 모달 */}
      {isBusinessModalOpen && (
        <BusinessRegistrationModal onClose={() => setIsBusinessModalOpen(false)} />
      )}
    </div>
  );
};

export default MyPage;
