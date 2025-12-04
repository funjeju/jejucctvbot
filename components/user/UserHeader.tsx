import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface UserHeaderProps {
  onLoginClick: () => void;
}

const UserHeader: React.FC<UserHeaderProps> = ({ onLoginClick }) => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 이메일에서 사용자 이름 추출 (@ 앞부분)
  const getUserName = (email: string | null) => {
    if (!email) return '사용자';
    return email.split('@')[0];
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-gray-200 bg-white/98 backdrop-blur-md shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* 로그인 상태 표시 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            {user ? (
              <>
                <span className="text-gray-700 font-medium">
                  {getUserName(user.email)}님 환영합니다
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs px-2.5 py-1 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-600"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="text-gray-900 hover:text-gray-700 font-medium text-xs transition-colors"
              >
                로그인 / 회원가입
              </button>
            )}
          </div>
        </div>

        {/* 메인 헤더 */}
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-blue-100">
              <span className="text-white text-3xl drop-shadow-sm">🏝️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">가장 스마트한 제주여행챗봇</h1>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">환각 X, 최신성 OK</p>
            </div>
          </div>

          {/* 우측 아이콘 (필요시 추가) */}
          <div className="flex items-center space-x-3">
            {/* 향후 알림, 프로필 등 추가 가능 */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default UserHeader;
