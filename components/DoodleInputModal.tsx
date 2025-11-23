import React, { useState } from 'react';
import { X, Type, Palette } from 'lucide-react';
import { DoodleCreateData } from '../types';
import DrawingCanvas from './DrawingCanvas';
import { useAuth } from '../contexts/AuthContext';

interface DoodleInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DoodleCreateData) => void;
}

const DoodleInputModal: React.FC<DoodleInputModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { user, userProfile } = useAuth();
  const [mode, setMode] = useState<'text' | 'drawing' | 'coupon'>('text');
  const [text, setText] = useState('');
  const [type, setType] = useState<'speech' | 'thought' | 'shout'>('speech');
  const [color, setColor] = useState('#FFFFFF');
  const [duration, setDuration] = useState(10000); // 기본 10초

  // 쿠폰 전용 상태
  const [couponTitle, setCouponTitle] = useState('');
  const [couponDescription, setCouponDescription] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [maxClaims, setMaxClaims] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit({ text: text.trim(), type, color, duration });
      setText('');
      setType('speech');
      setColor('#FFFFFF');
      setDuration(10000);
      setMode('text');
      onClose();
    }
  };

  const handleDrawingComplete = (imageData: string) => {
    onSubmit({ type: 'drawing', color, imageData, duration });
    setColor('#FFFFFF');
    setDuration(10000);
    setMode('text');
    onClose();
  };

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponTitle.trim()) {
      onSubmit({
        type: 'coupon',
        color: '#FFD700', // 금색
        duration,
        couponTitle: couponTitle.trim(),
        couponDescription: couponDescription.trim(),
        storeName: storeName.trim(),
        storeAddress: storeAddress.trim(),
        maxClaims,
      });
      setCouponTitle('');
      setCouponDescription('');
      setStoreName('');
      setStoreAddress('');
      setMaxClaims(1);
      setDuration(10000);
      setMode('text');
      onClose();
    }
  };

  const handleClose = () => {
    setMode('text');
    onClose();
  };

  if (!isOpen) return null;

  const bubbleTypes = [
    { value: 'speech' as const, label: '말풍선', emoji: '💬' },
    { value: 'thought' as const, label: '생각', emoji: '💭' },
    { value: 'shout' as const, label: '외침', emoji: '📢' }
  ];

  const colorPresets = [
    { value: '#FFFFFF', label: '흰색' },
    { value: '#FEF3C7', label: '노란색' },
    { value: '#DBEAFE', label: '파란색' },
    { value: '#DCFCE7', label: '초록색' },
    { value: '#FCE7F3', label: '분홍색' },
    { value: '#F3E8FF', label: '보라색' }
  ];

  const durationOptions = [
    { value: 10000, label: '10초' },
    { value: 30000, label: '30초' },
    { value: 3600000, label: '1시간' },
    { value: 86400000, label: '24시간' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">영상에 낙서하기</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 모드 선택 */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'text'
                ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Type size={18} />
            텍스트
          </button>
          <button
            type="button"
            onClick={() => setMode('drawing')}
            className={`flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'drawing'
                ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Palette size={18} />
            그림 그리기
          </button>
          <button
            type="button"
            onClick={() => {
              // 쿠폰 모드 권한 체크
              if (!user) {
                alert('쿠폰을 생성하려면 로그인이 필요합니다.');
                return;
              }
              if (userProfile?.role !== 'store' && userProfile?.role !== 'admin') {
                alert('쿠폰은 사업자 또는 관리자만 생성할 수 있습니다.');
                return;
              }
              if (userProfile?.role === 'store' && !userProfile?.businessApproved) {
                alert('사업자 승인 후 쿠폰을 생성할 수 있습니다.\n관리자 승인을 기다려주세요.');
                return;
              }
              setMode('coupon');
            }}
            className={`flex-1 py-3 px-4 font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'coupon'
                ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            쿠폰
            {userProfile?.role === 'store' && !userProfile?.businessApproved && (
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {mode === 'coupon' ? (
            /* 쿠폰 모드 */
            <form onSubmit={handleCouponSubmit} className="space-y-4">
              {/* 쿠폰 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  쿠폰 제목 *
                </label>
                <input
                  type="text"
                  value={couponTitle}
                  onChange={(e) => setCouponTitle(e.target.value)}
                  placeholder="예: 아메리카노 1+1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={30}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{couponTitle.length}/30</p>
              </div>

              {/* 쿠폰 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  쿠폰 설명
                </label>
                <textarea
                  value={couponDescription}
                  onChange={(e) => setCouponDescription(e.target.value)}
                  placeholder="쿠폰 사용 조건 등을 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={2}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">{couponDescription.length}/100</p>
              </div>

              {/* 매장명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  매장명 *
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="예: 제주 ○○ 카페"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={50}
                  required
                />
              </div>

              {/* 매장 주소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  매장 주소
                </label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="예: 제주시 ○○로 123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={100}
                />
              </div>

              {/* 발급 개수 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  발급 개수 (선착순)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxClaims(num)}
                      className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                        maxClaims === num
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {num}명
                    </button>
                  ))}
                </div>
              </div>

              {/* 지속 시간 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  표시 시간
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 3600000, label: '1시간' },
                    { value: 10800000, label: '3시간' },
                    { value: 43200000, label: '12시간' },
                    { value: 86400000, label: '24시간' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDuration(option.value)}
                      className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                        duration === option.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!couponTitle.trim() || !storeName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  쿠폰 발행
                </button>
              </div>
            </form>
          ) : mode === 'text' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
          {/* 텍스트 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메시지
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="영상에 표시할 메시지를 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{text.length}/100</p>
          </div>

          {/* 말풍선 유형 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              말풍선 유형
            </label>
            <div className="grid grid-cols-3 gap-2">
              {bubbleTypes.map((bubbleType) => (
                <button
                  key={bubbleType.value}
                  type="button"
                  onClick={() => setType(bubbleType.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    type === bubbleType.value
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{bubbleType.emoji}</div>
                  <div className="text-xs font-medium">{bubbleType.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 색상 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              배경 색상
            </label>
            <div className="grid grid-cols-6 gap-2">
              {colorPresets.map((colorPreset) => (
                <button
                  key={colorPreset.value}
                  type="button"
                  onClick={() => setColor(colorPreset.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    color === colorPreset.value
                      ? 'border-indigo-600 scale-110'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorPreset.value }}
                  title={colorPreset.label}
                />
              ))}
            </div>
          </div>

          {/* 지속 시간 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              표시 시간
            </label>
            <div className="grid grid-cols-4 gap-2">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDuration(option.value)}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    duration === option.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              추가하기
            </button>
          </div>
        </form>
          ) : (
            /* 그리기 모드 */
            <div className="space-y-4">
              {/* 색상 선택 (그리기용 - 펜 색상) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  펜 색상
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '#000000', label: '검정' },
                    { value: '#EF4444', label: '빨강' },
                    { value: '#3B82F6', label: '파랑' },
                    { value: '#10B981', label: '초록' },
                    { value: '#F59E0B', label: '주황' },
                    { value: '#8B5CF6', label: '보라' },
                    { value: '#EC4899', label: '분홍' },
                    { value: '#FFFFFF', label: '흰색' },
                  ].map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        color === c.value
                          ? 'border-indigo-600 scale-110'
                          : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* 지속 시간 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  표시 시간
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {durationOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDuration(option.value)}
                      className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                        duration === option.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canvas */}
              <DrawingCanvas onComplete={handleDrawingComplete} color={color} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoodleInputModal;
