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
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3">
        {/* 로그인 상태 표시 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-sm">
            {user ? (
              <>
                <span className="text-indigo-600 font-medium">
                  {getUserName(user.email)}님 환영합니다
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="text-indigo-600 hover:text-indigo-700 font-medium text-xs"
              >
                로그인 / 회원가입
              </button>
            )}
          </div>
        </div>

        {/* 메인 헤더 */}
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">🏝️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">가장 스마트한 제주여행챗봇</h1>
              <p className="text-xs text-gray-500">환각 X, 최신성 OK</p>
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
