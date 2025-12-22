import React, { useState } from 'react';
import { collection, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { BusinessCategory } from '../types';

interface BusinessRegistrationModalProps {
  onClose: () => void;
}

const BusinessRegistrationModal: React.FC<BusinessRegistrationModalProps> = ({ onClose }) => {
  const { user, userProfile } = useAuth();
  const [businessNumber, setBusinessNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>('기타체험');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 사업자 번호 형식 검증 (간단한 형식 체크)
  const validateBusinessNumber = (num: string): boolean => {
    // 숫자만 허용, 10자리
    const cleaned = num.replace(/[^0-9]/g, '');
    return cleaned.length === 10;
  };

  // 사업자 번호 포맷팅 (000-00-00000)
  const formatBusinessNumber = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value);
    setBusinessNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userProfile) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 검증
    const cleanedNumber = businessNumber.replace(/[^0-9]/g, '');
    if (!validateBusinessNumber(cleanedNumber)) {
      alert('올바른 사업자 번호 형식이 아닙니다. (10자리 숫자)');
      return;
    }

    if (!businessName.trim()) {
      alert('상호명을 입력해주세요.');
      return;
    }

    if (!businessAddress.trim()) {
      alert('사업장 주소를 입력해주세요.');
      return;
    }

    if (!businessPhone.trim()) {
      alert('연락처를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. users 컬렉션 업데이트 (AuthContext가 사용하는 컬렉션)
      const userProfileRef = doc(db, 'users', user.uid);
      await setDoc(userProfileRef, {
        role: 'store',
        businessNumber: cleanedNumber,
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        businessPhone: businessPhone.trim(),
        businessCategory: businessCategory,
        businessWebsite: businessWebsite.trim(),
        businessApproved: true, // 테스트용: 바로 승인
        updatedAt: Timestamp.now(),
      }, { merge: true }); // merge: true로 문서가 없으면 생성, 있으면 업데이트

      // 2. businessApplications 컬렉션에 신청 기록 추가
      await addDoc(collection(db, 'businessApplications'), {
        userId: user.uid,
        userEmail: user.email,
        userName: userProfile.displayName || user.email,
        businessNumber: cleanedNumber,
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        businessPhone: businessPhone.trim(),
        businessCategory: businessCategory,
        businessWebsite: businessWebsite.trim(),
        status: 'pending', // pending, approved, rejected
        appliedAt: Timestamp.now(),
      });

      alert('사업자 등록이 완료되었습니다.\n이제 피드에 업체 정보가 표시되며 쿠폰 발급 기능을 사용하실 수 있습니다.');
      onClose();
    } catch (error) {
      console.error('사업자 등록 실패:', error);
      alert('사업자 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">사업자 등록</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">사업자 등록 안내</p>
              <p className="text-xs text-blue-600 mt-1">
                사업자 정보를 입력하시면 피드에 업체 정보가 표시되며 쿠폰 발급 기능을 사용하실 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 사업자 번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업자 번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessNumber}
              onChange={handleBusinessNumberChange}
              placeholder="000-00-00000"
              maxLength={12}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">10자리 숫자를 입력해주세요</p>
          </div>

          {/* 상호명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상호명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="예: 제주맛집"
              maxLength={50}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* 사업장 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사업장 주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="예: 제주시 중앙로 123"
              maxLength={100}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              연락처 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="예: 064-123-4567"
              maxLength={20}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* 업종 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              업종 <span className="text-red-500">*</span>
            </label>
            <select
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value as BusinessCategory)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="서핑">🏄 서핑</option>
              <option value="스냅">📸 스냅</option>
              <option value="낚시">🎣 낚시</option>
              <option value="공예">🎨 공예</option>
              <option value="박물관">🏛️ 박물관</option>
              <option value="꽃관련">🌸 꽃관련</option>
              <option value="기타체험">✨ 기타체험</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">사업자의 주요 업종을 선택해주세요</p>
          </div>

          {/* 웹사이트 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              웹사이트 URL
            </label>
            <input
              type="url"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
              placeholder="예: https://www.example.com"
              maxLength={200}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">선택사항: 업체 웹사이트 주소를 입력해주세요</p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '신청 중...' : '신청하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessRegistrationModal;
