import React from 'react';
import type { WeatherSource } from '../types';

interface CCTVListProps {
  cctvs: WeatherSource[];
  selectedCCTV: WeatherSource | null;
  onSelect: (cctv: WeatherSource) => void;
}

const CCTVList: React.FC<CCTVListProps> = ({ cctvs, selectedCCTV, onSelect }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">제주 라이브 CCTV</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {cctvs.map((cctv) => {
          const isSelected = selectedCCTV?.id === cctv.id;
          return (
            <button
              key={cctv.id}
              onClick={() => onSelect(cctv)}
              className={`
                flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all duration-200
                ${isSelected
                  ? 'border-indigo-600 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* CCTV 아이콘 */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}
                `}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* CCTV 정보 */}
                <div className="text-left">
                  <p className={`font-semibold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {cctv.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {/* LIVE 표시 */}
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                      LIVE
                    </span>
                    {/* 방향 */}
                    {cctv.direction && (
                      <span className="text-xs text-gray-500">{cctv.direction}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 CCTV 설명 */}
      {selectedCCTV && selectedCCTV.description && (
        <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <p className="text-sm text-gray-700">{selectedCCTV.description}</p>
        </div>
      )}
    </div>
  );
};

export default CCTVList;
