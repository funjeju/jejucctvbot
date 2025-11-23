import React, { useState, useMemo } from 'react';
import type { WeatherSource } from '../types';

interface CCTVListProps {
  cctvs: WeatherSource[];
  selectedCCTV: WeatherSource | null;
  onSelect: (cctv: WeatherSource) => void;
  language: 'KOR' | 'ENG' | 'CHN';
}

const CCTVList: React.FC<CCTVListProps> = ({ cctvs, selectedCCTV, onSelect, language }) => {
  const [selectedRegion, setSelectedRegion] = useState<'all' | '동부' | '서부' | '남부' | '북부'>('all');

  // 언어에 따라 표시할 제목 선택
  const getDisplayTitle = (cctv: WeatherSource) => {
    if (language === 'ENG' && cctv.titleEng) return cctv.titleEng;
    if (language === 'CHN' && cctv.titleChn) return cctv.titleChn;
    return cctv.title; // 기본값은 한글
  };

  // 제목에서 지역명 기반으로 동서남북 자동 할당
  const getAutoDirection = (cctv: WeatherSource): '동부' | '서부' | '남부' | '북부' | undefined => {
    // direction이 이미 설정되어 있으면 그대로 사용
    if (cctv.direction && ['동부', '서부', '남부', '북부'].includes(cctv.direction)) {
      return cctv.direction as '동부' | '서부' | '남부' | '북부';
    }

    const title = getDisplayTitle(cctv).toLowerCase();

    // 동부: 구좌, 성산, 표선, 우도, 세화, 하도, 종달
    const eastRegions = ['구좌', '성산', '표선', '우도', '세화', '하도', '종달'];
    if (eastRegions.some(region => title.includes(region))) return '동부';

    // 서부: 한림, 한경, 대정, 협재, 금능, 고산, 애월
    const westRegions = ['한림', '한경', '대정', '협재', '금능', '고산', '금릉'];
    if (westRegions.some(region => title.includes(region))) return '서부';

    // 남부: 안덕, 마라도, 가파도, 서귀포, 중문, 남원, 색달, 법환, 모슬포
    const southRegions = ['안덕', '마라도', '가파도', '서귀포', '중문', '남원', '색달', '법환', '모슬포'];
    if (southRegions.some(region => title.includes(region))) return '남부';

    // 북부: 조천, 제주시, 용담, 도두, 이호, 노형, 연동, 이도, 삼도
    const northRegions = ['조천', '제주시', '용담', '도두', '이호', '노형', '연동', '이도', '삼도', '애월'];
    if (northRegions.some(region => title.includes(region))) return '북부';

    return undefined;
  };

  // 제목에서 간략한 별칭 추출 (모바일용)
  const getShortTitle = (cctv: WeatherSource) => {
    // DB에 shortTitle이 있으면 우선 사용
    if (cctv.shortTitle) return cctv.shortTitle;

    // 없으면 자동 생성
    const fullTitle = getDisplayTitle(cctv);

    // "제주", "제주시", "CCTV", "라이브" 등 불필요한 단어 제거
    let cleaned = fullTitle
      .replace(/제주시/g, '')
      .replace(/제주/g, '')
      .replace(/CCTV/g, '')
      .replace(/라이브/g, '')
      .trim();

    // 공백으로 분리하고 첫 번째 의미있는 단어 추출
    const parts = cleaned.split(' ').filter(p => p.length > 0);

    // "시", "도", "군", "읍", "면" 같은 행정구역 단위는 건너뛰기
    const meaningfulPart = parts.find(p => !['시', '도', '군', '읍', '면', '동', '리'].includes(p));

    return meaningfulPart || parts[0] || fullTitle;
  };

  // 지역별 필터링 (자동 할당된 direction 사용)
  const filteredCCTVs = useMemo(() => {
    if (selectedRegion === 'all') return cctvs;
    return cctvs.filter(cctv => getAutoDirection(cctv) === selectedRegion);
  }, [cctvs, selectedRegion]);

  // 각 지역별 CCTV 개수 (자동 할당된 direction 사용)
  const regionCounts = useMemo(() => {
    return {
      all: cctvs.length,
      동부: cctvs.filter(c => getAutoDirection(c) === '동부').length,
      서부: cctvs.filter(c => getAutoDirection(c) === '서부').length,
      남부: cctvs.filter(c => getAutoDirection(c) === '남부').length,
      북부: cctvs.filter(c => getAutoDirection(c) === '북부').length,
    };
  }, [cctvs]);

  const regions: Array<{ key: 'all' | '동부' | '서부' | '남부' | '북부'; label: string; emoji: string }> = [
    { key: 'all', label: '전체', emoji: '🗺️' },
    { key: '동부', label: '동부', emoji: '🌅' },
    { key: '서부', label: '서부', emoji: '🌄' },
    { key: '남부', label: '남부', emoji: '🌊' },
    { key: '북부', label: '북부', emoji: '⛰️' },
  ];

  return (
    <div className="bg-white shadow-md rounded-lg p-2 sm:p-4">
      {/* 지역 선택 탭 */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
        {regions.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setSelectedRegion(key)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${selectedRegion === key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <span className="mr-1">{emoji}</span>
            {label}
            <span className="ml-1.5 text-xs opacity-75">({regionCounts[key]})</span>
          </button>
        ))}
      </div>

      {/* CCTV 목록 */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
        {filteredCCTVs.map((cctv) => {
          const isSelected = selectedCCTV?.id === cctv.id;
          const shortTitle = getShortTitle(cctv);
          const fullTitle = getDisplayTitle(cctv);

          return (
            <button
              key={cctv.id}
              onClick={() => onSelect(cctv)}
              className={`
                flex-shrink-0 px-2.5 py-2 sm:px-4 sm:py-3 rounded-lg border-2 transition-all duration-200
                ${isSelected
                  ? 'border-indigo-600 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-gray-50'
                }
              `}
              title={fullTitle}
            >
              {/* 모바일: 간략 버전 */}
              <div className="sm:hidden flex flex-col items-center gap-1 min-w-[60px]">
                {/* CCTV 아이콘 */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}
                `}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                {/* 간략한 제목 */}
                <p className={`text-xs font-semibold text-center ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {shortTitle}
                </p>
                {/* LIVE 표시 */}
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-red-600 animate-pulse' : 'bg-gray-400'}`}></span>
              </div>

              {/* PC: 별칭 버전 (모바일과 동일하게) */}
              <div className="hidden sm:flex flex-col items-center gap-1 min-w-[80px]">
                {/* CCTV 아이콘 */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}
                `}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                {/* 간략한 제목 (별칭) */}
                <p className={`text-sm font-semibold text-center ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {shortTitle}
                </p>
                {/* LIVE 표시 */}
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-red-600 animate-pulse' : 'bg-gray-400'}`}></span>
                  {isSelected && 'LIVE'}
                </span>
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
