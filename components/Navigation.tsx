import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

type MenuItem = 'feed' | 'cam' | 'tips' | 'mypage';

interface NavigationProps {
  currentPage: MenuItem;
  onNavigate: (page: MenuItem) => void;
  language: 'KOR' | 'ENG' | 'CHN';
}

const menuTranslations = {
  KOR: {
    feed: 'Feed',
    cam: 'Cam & Chat',
    tips: 'Tips',
    mypage: 'My Page',
  },
  ENG: {
    feed: 'Feed',
    cam: 'Cam & Chat',
    tips: 'Tips',
    mypage: 'My Page',
  },
  CHN: {
    feed: 'Feed',
    cam: 'Cam & Chat',
    tips: 'Tips',
    mypage: '我的',
  },
};

const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate, language }) => {
  const { user, userProfile } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const t = menuTranslations[language];

  const handleMyPageClick = () => {
    if (!user) {
      // 로그인되지 않은 경우 로그인 모달 열기
      setIsLoginModalOpen(true);
    } else {
      // 로그인된 경우 마이페이지로 이동
      onNavigate('mypage');
    }
  };

  const menuItems: { id: MenuItem; label: string; icon: JSX.Element }[] = [
    {
      id: 'feed',
      label: t.feed,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      id: 'cam',
      label: t.cam,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'tips',
      label: t.tips,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      id: 'mypage',
      label: t.mypage,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* 모바일: 하단 네비게이션 - fixed로 화면 최하단에 고정 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === 'mypage' ? handleMyPageClick() : onNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-3 px-2 flex-1 transition-colors relative ${
                currentPage === item.id
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={currentPage === item.id ? 'text-indigo-600' : 'text-gray-500'}>
                {item.icon}
              </div>
              <span className="text-xs mt-1 font-medium whitespace-nowrap">{item.label}</span>
              {/* 로그인 상태 표시 */}
              {item.id === 'mypage' && user && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* PC: 상단 네비게이션 */}
      <nav className="hidden lg:block bg-white shadow-md rounded-lg">
        <div className="flex items-center justify-center gap-2 p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === 'mypage' ? handleMyPageClick() : onNavigate(item.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all relative ${
                currentPage === item.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="w-5 h-5">
                {item.icon}
              </div>
              <span className="font-medium">{item.label}</span>
              {/* 로그인 상태 표시 */}
              {item.id === 'mypage' && user && userProfile && (
                <span className="ml-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                  {userProfile.role === 'admin' ? 'Admin' : userProfile.role === 'store' ? 'Store' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <LoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}
    </>
  );
};

export default Navigation;
