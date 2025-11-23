import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Doodle } from '../types';
import { doc, updateDoc, arrayUnion, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

interface DoodleOverlayProps {
  doodles: Doodle[];
  onRemove: (id: string) => void;
  currentSessionId: string;
}

const DoodleOverlay: React.FC<DoodleOverlayProps> = ({ doodles, onRemove, currentSessionId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {doodles.map((doodle) => (
        <DoodleBubble
          key={doodle.id}
          doodle={doodle}
          onRemove={onRemove}
          canDelete={doodle.sessionId === currentSessionId}
          currentSessionId={currentSessionId}
        />
      ))}
    </div>
  );
};

interface DoodleBubbleProps {
  doodle: Doodle;
  onRemove: (id: string) => void;
  canDelete: boolean;
  currentSessionId: string;
}

const DoodleBubble: React.FC<DoodleBubbleProps> = ({ doodle, onRemove, canDelete, currentSessionId }) => {
  const { user, userProfile } = useAuth();
  const [position, setPosition] = useState(() => {
    // Firestore에 저장된 위치가 있으면 사용, 없으면 랜덤
    if (doodle.position) {
      return doodle.position;
    }
    return {
      left: Math.random() * 60 + 10, // 10% ~ 70%
      top: Math.random() * 60 + 20, // 20% ~ 80%
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // 화면 너비 대비 비율로 크기 저장 (기본값 15% = 0.15)
  const [widthPercent, setWidthPercent] = useState(() => doodle.widthPercent || 15);
  const [initialWidthPercent, setInitialWidthPercent] = useState(15);
  const [showControls, setShowControls] = useState(false); // 컨트롤 버튼 표시 여부
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 다른 기기에서 변경된 값만 동기화 (내가 조작 중이 아니고, 값이 실제로 다를 때만)
  const lastSyncedRef = React.useRef({ position: doodle.position, widthPercent: doodle.widthPercent });

  useEffect(() => {
    // 드래그/리사이징 중이면 무시
    if (isDragging || isResizing) return;

    // position 동기화 (값이 실제로 다를 때만)
    if (doodle.position) {
      const lastPos = lastSyncedRef.current.position;
      const newPos = doodle.position;
      if (!lastPos || Math.abs(lastPos.left - newPos.left) > 0.5 || Math.abs(lastPos.top - newPos.top) > 0.5) {
        setPosition(newPos);
        lastSyncedRef.current.position = newPos;
      }
    }

    // widthPercent 동기화 (값이 실제로 다를 때만)
    if (doodle.widthPercent) {
      const lastWidth = lastSyncedRef.current.widthPercent;
      if (!lastWidth || Math.abs(lastWidth - doodle.widthPercent) > 0.5) {
        setWidthPercent(doodle.widthPercent);
        lastSyncedRef.current.widthPercent = doodle.widthPercent;
      }
    }
  }, [doodle.position?.left, doodle.position?.top, doodle.widthPercent, isDragging, isResizing]);

  useEffect(() => {
    // duration 후 제거
    const removeTimer = setTimeout(() => {
      onRemove(doodle.id);
    }, doodle.duration);

    return () => {
      clearTimeout(removeTimer);
    };
  }, [doodle.id, doodle.duration, onRemove]);

  // 위치 저장 디바운스 타이머
  const saveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Firestore에 위치와 크기 업데이트 (5초 디바운스)
  const updatePositionAndSizeInFirestore = async () => {
    try {
      const doodleRef = doc(db, 'doodles', doodle.id);
      await updateDoc(doodleRef, {
        position: position,
        widthPercent: widthPercent, // 화면 너비 대비 비율 (%)
      });
      // 저장 후 ref 업데이트 (다시 동기화 방지)
      lastSyncedRef.current = { position, widthPercent };
      console.log('말풍선 위치/크기 저장:', { position, widthPercent });
    } catch (error) {
      console.error('위치/크기 저장 실패:', error);
    }
  };

  // 위치/크기 변경 시 5초 후 저장 예약
  const scheduleSave = () => {
    // 기존 타이머 취소
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 5초 후 저장
    saveTimerRef.current = setTimeout(() => {
      updatePositionAndSizeInFirestore();
    }, 5000);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // 컨테이너 클릭/터치 (컨트롤 표시 토글)
  const handleContainerClick = (e: React.MouseEvent | React.TouchEvent) => {
    // 버튼 클릭인 경우 무시
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
    setShowControls(!showControls);
  };

  // 드래그 시작 (마우스)
  const handleMouseDown = (e: React.MouseEvent) => {
    // 버튼이나 리사이즈 핸들 클릭인 경우 무시
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - (containerRef.current?.getBoundingClientRect().left || 0),
      y: e.clientY - (containerRef.current?.getBoundingClientRect().top || 0),
    });
    e.preventDefault();
  };

  // 드래그 시작 (터치)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 한 손가락: 드래그
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - (containerRef.current?.getBoundingClientRect().left || 0),
        y: touch.clientY - (containerRef.current?.getBoundingClientRect().top || 0),
      });
      e.preventDefault();
    }
  };

  // 리사이징 시작 (마우스)
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation(); // 드래그 이벤트와 분리
    setIsResizing(true);
    setInitialWidthPercent(widthPercent);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // 리사이징 시작 (터치)
  const handleResizeTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation(); // 드래그 이벤트와 분리
    if (e.touches.length !== 1) return;
    setIsResizing(true);
    setInitialWidthPercent(widthPercent);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  // 삭제 버튼 클릭
  const handleDelete = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // 드래그 이벤트와 분리
    onRemove(doodle.id);
  };

  // 쿠폰 클릭 핸들러
  const handleCouponClick = async (e: React.MouseEvent) => {
    if (doodle.type !== 'coupon') return;
    e.stopPropagation();

    // 로그인 체크
    if (!user) {
      alert('쿠폰을 받으려면 로그인이 필요합니다.');
      return;
    }

    // 최대 발급 개수 확인
    const claimedCount = doodle.claimedBy?.length || 0;
    if (claimedCount >= (doodle.maxClaims || 1)) {
      alert('쿠폰이 모두 소진되었습니다.');
      return;
    }

    try {
      // 1. doodles 컬렉션의 claimedBy에 사용자 UID 추가
      const doodleRef = doc(db, 'doodles', doodle.id);
      await updateDoc(doodleRef, {
        claimedBy: arrayUnion(user.uid)
      });

      // 2. userCoupons 컬렉션에 사용자 쿠폰 저장
      await addDoc(collection(db, 'userCoupons'), {
        id: doodle.id, // 원본 쿠폰 ID
        userId: user.uid,
        couponTitle: doodle.couponTitle || '',
        couponDescription: doodle.couponDescription || '',
        storeName: doodle.storeName || '',
        storeAddress: doodle.storeAddress || '',
        claimedAt: Timestamp.now(),
        used: false,
        issuedBy: currentSessionId, // 발행자 세션 ID (레거시)
        issuerName: '', // 발행자 이름 (추후 개선 가능)
        videoId: doodle.id, // 연결된 비디오 ID
        expiresAt: doodle.createdAt + doodle.duration, // 만료 시간
      });

      alert('쿠폰을 받았습니다!\n마이페이지에서 확인하세요.');
    } catch (error) {
      console.error('쿠폰 수령 실패:', error);
      alert('쿠폰 수령에 실패했습니다.');
    }
  };

  // 드래그 중
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!containerRef.current?.parentElement) return;

      const parent = containerRef.current.parentElement;
      const parentRect = parent.getBoundingClientRect();

      // 부모 요소 기준 퍼센트 계산
      const newLeft = ((clientX - parentRect.left - dragStart.x) / parentRect.width) * 100;
      const newTop = ((clientY - parentRect.top - dragStart.y) / parentRect.height) * 100;

      // 경계 제한 (0% ~ 90%)
      setPosition({
        left: Math.max(0, Math.min(90, newLeft)),
        top: Math.max(0, Math.min(90, newTop)),
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        scheduleSave();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragStart, position, widthPercent]);

  // 리사이징 중
  useEffect(() => {
    if (!isResizing) return;

    const handleResize = (clientX: number, clientY: number) => {
      if (!containerRef.current?.parentElement) return;

      const parent = containerRef.current.parentElement;
      const parentWidth = parent.getBoundingClientRect().width;

      // 드래그 거리를 부모 너비 대비 비율로 변환
      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const direction = (deltaX + deltaY) > 0 ? 1 : -1;

      // 드래그 거리를 퍼센트로 변환 (부모 너비 기준)
      const percentChange = (distance / parentWidth) * 100 * direction;
      const newWidthPercent = Math.max(8, Math.min(50, initialWidthPercent + percentChange));

      setWidthPercent(newWidthPercent);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleResize(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleResize(touch.clientX, touch.clientY);
      e.preventDefault();
    };

    const handleEnd = () => {
      setIsResizing(false);
      // 리사이징 종료 시 5초 후 저장 예약
      scheduleSave();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing, dragStart, initialWidthPercent, position, widthPercent]);

  // 배경색에 투명도 50% 적용하는 헬퍼 함수 (영상이 더 잘 보이도록)
  const getTransparentColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  };

  // 말풍선 스타일 결정
  const getBubbleStyle = () => {
    const baseStyle = {
      backgroundColor: getTransparentColor(doodle.color),
      border: '2px solid rgba(0, 0, 0, 0.2)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(2px)', // 약간의 블러 효과
    };

    switch (doodle.type) {
      case 'shout':
        return {
          ...baseStyle,
          borderRadius: '12px',
          borderWidth: '3px',
          borderColor: '#EF4444',
          transform: 'rotate(-2deg)',
        };
      case 'thought':
        return {
          ...baseStyle,
          borderRadius: '50%',
          borderStyle: 'dashed',
        };
      default: // speech
        return {
          ...baseStyle,
          borderRadius: '16px',
        };
    }
  };

  // widthPercent를 scale 값으로 변환 (기본 15% = scale 1.0)
  const scale = widthPercent / 15;

  return (
    <>
      <div
        ref={containerRef}
        className="absolute pointer-events-auto select-none"
        style={{
          left: `${position.left}%`,
          top: `${position.top}%`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleContainerClick}
      >
        {doodle.type === 'coupon' ? (
          /* 쿠폰 타입 */
          <div
            className="relative group cursor-pointer"
            onClick={handleCouponClick}
            style={{ pointerEvents: 'auto' }}
          >
            <div
              className="px-4 py-3 text-center relative bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 rounded-lg shadow-lg border-2 border-yellow-600 min-w-[120px]"
              style={{
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))',
              }}
            >
              {/* 쿠폰 아이콘 */}
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg className="w-5 h-5 text-yellow-800" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span className="text-xs font-bold text-yellow-900 uppercase">COUPON</span>
              </div>

              {/* 쿠폰 제목 */}
              <p
                className="text-sm font-bold mb-1"
                style={{
                  color: '#78350F',
                  textShadow: '0 1px 2px rgba(255, 255, 255, 0.5)',
                  wordBreak: 'keep-all',
                  lineHeight: '1.3',
                }}
              >
                {doodle.couponTitle}
              </p>

              {/* 남은 개수 표시 */}
              <div className="text-xs font-semibold text-yellow-900 mt-2 bg-yellow-200 rounded-full px-2 py-1 inline-block">
                {(doodle.maxClaims || 1) - (doodle.claimedBy?.length || 0)}개 남음
              </div>

              {/* 삭제 버튼 (관리자만) */}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  onTouchEnd={handleDelete}
                  className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full transition-opacity flex items-center justify-center hover:bg-red-600 ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  style={{ pointerEvents: 'auto' }}
                  title="삭제"
                >
                  <X size={12} className="text-white" />
                </button>
              )}
            </div>

            {/* 리사이징 핸들 */}
            <div
              data-resize-handle
              className={`absolute bottom-0 right-0 w-6 h-6 bg-indigo-600 rounded-tl-lg cursor-nwse-resize transition-opacity flex items-center justify-center ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeTouchStart}
              style={{ pointerEvents: 'auto' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </div>
        ) : doodle.type === 'drawing' ? (
          /* 그림 타입 */
          doodle.imageData ? (
            <div className="relative group">
              <img
                src={doodle.imageData}
                alt="Drawing"
                className="w-full h-auto rounded-lg"
                style={{
                  filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15))',
                }}
                onError={(e) => {
                  console.error('Image failed to load:', doodle.imageData?.substring(0, 100));
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* 삭제 버튼 (우상단) - 내가 올린 것만 */}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  onTouchEnd={handleDelete}
                  className={`absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-bl-lg transition-opacity flex items-center justify-center hover:bg-red-600 ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  style={{ pointerEvents: 'auto' }}
                  title="삭제"
                >
                  <X size={14} className="text-white" />
                </button>
              )}
              {/* 리사이징 핸들 (우하단) */}
              <div
                data-resize-handle
                className={`absolute bottom-0 right-0 w-6 h-6 bg-indigo-600 rounded-tl-lg cursor-nwse-resize transition-opacity flex items-center justify-center ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeTouchStart}
                style={{ pointerEvents: 'auto' }}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 bg-red-100 text-red-600 rounded-lg">
              이미지 로딩 실패
            </div>
          )
        ) : (
          /* 말풍선 타입 */
          <div className="relative group">
            <div
              className="px-4 py-3 text-center relative min-w-[100px] max-w-[200px]"
              style={getBubbleStyle()}
            >
              {/* 삭제 버튼 (우상단) - 내가 올린 것만 */}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  onTouchEnd={handleDelete}
                  className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full transition-opacity flex items-center justify-center hover:bg-red-600 ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  style={{ pointerEvents: 'auto' }}
                  title="삭제"
                >
                  <X size={12} className="text-white" />
                </button>
              )}
              {/* 말풍선 꼬리 (speech만) */}
              {doodle.type === 'speech' && (
                <div
                  className="absolute bottom-[-10px] left-[20px] w-0 h-0"
                  style={{
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: `10px solid ${getTransparentColor(doodle.color)}`,
                    filter: 'drop-shadow(0 2px 1px rgba(0, 0, 0, 0.1))',
                  }}
                />
              )}

              {/* 텍스트 */}
              <p
                className={`text-sm font-medium ${doodle.type === 'shout' ? 'text-lg font-bold' : ''
                  }`}
                style={{
                  color: getTextColor(doodle.color),
                  wordBreak: 'keep-all',
                }}
              >
                {doodle.type === 'shout' && '📢 '}
                {doodle.text}
                {doodle.type === 'shout' && ' 📢'}
              </p>

              {/* 생각 말풍선 작은 원들 */}
              {doodle.type === 'thought' && (
                <>
                  <div
                    className="absolute bottom-[-15px] left-[25px] w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getTransparentColor(doodle.color),
                      border: '1px dashed rgba(0, 0, 0, 0.2)',
                    }}
                  />
                  <div
                    className="absolute bottom-[-25px] left-[15px] w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: getTransparentColor(doodle.color),
                      border: '1px dashed rgba(0, 0, 0, 0.2)',
                    }}
                  />
                </>
              )}
            </div>
            {/* 리사이징 핸들 (우하단) */}
            <div
              data-resize-handle
              className={`absolute bottom-0 right-0 w-6 h-6 bg-indigo-600 rounded-tl-lg cursor-nwse-resize transition-opacity flex items-center justify-center ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeTouchStart}
              style={{ pointerEvents: 'auto' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// 배경색에 따라 텍스트 색상 결정
const getTextColor = (bgColor: string): string => {
  // 간단한 명도 계산으로 텍스트 색상 결정
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#1F2937' : '#FFFFFF';
};

export default DoodleOverlay;
