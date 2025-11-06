import React from 'react';

type ModalType = 'weather' | 'guide' | 'tripPlanner' | 'newsFeed' | null;

interface QuickMenuBarProps {
  onMenuClick: (modalType: ModalType) => void;
}

const QuickMenuBar: React.FC<QuickMenuBarProps> = ({ onMenuClick }) => {
  const menuItems = [
    {
      id: 'weather' as const,
      icon: '🌤️',
      line1: '실시간',
      line2: '날씨챗봇',
      color: 'from-blue-400 to-cyan-500',
      hoverColor: 'hover:from-blue-500 hover:to-cyan-600',
    },
    {
      id: 'guide' as const,
      icon: '🗺️',
      line1: '가이드',
      line2: '챗봇',
      color: 'from-green-400 to-emerald-500',
      hoverColor: 'hover:from-green-500 hover:to-emerald-600',
    },
    {
      id: 'tripPlanner' as const,
      icon: '✈️',
      line1: '여행일정',
      line2: 'AI',
      color: 'from-purple-400 to-pink-500',
      hoverColor: 'hover:from-purple-500 hover:to-pink-600',
    },
    // 제주최근소식 버튼 제거 - 메인 피드에 이미 표시되므로 중복 제거
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
      <div className="grid grid-cols-3 gap-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onMenuClick(item.id)}
            className={`
              bg-gradient-to-br ${item.color} ${item.hoverColor}
              text-white rounded-lg p-4
              transform transition-all duration-200
              hover:scale-105 hover:shadow-lg
              active:scale-95
              flex flex-col items-center justify-center space-y-2
            `}
          >
            <span className="text-3xl">{item.icon}</span>
            <div className="text-xs font-semibold text-center leading-tight">
              <div>{item.line1}</div>
              <div>{item.line2}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickMenuBar;
