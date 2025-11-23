
import React, { useState, useMemo, useEffect } from 'react';
import type { Place, OroomData, NewsItem } from '../types';
import { CATEGORIES, REGIONS } from '../constants';
import Button from './common/Button';
import Card from './common/Card';
import Input from './common/Input';
import ExportModal from './ExportModal';
import GoogleMapView from './GoogleMapView';
import NewsCarousel from './NewsCarousel';
import { subscribeToOrooms } from '../services/oroomFirestore';

interface ContentLibraryProps {
  spots: Place[];
  news: NewsItem[];
  onAddNew: () => void;
  onAddEvent: () => void;
  onAddNews: () => void;
  onEdit: (spot: Place) => void;
  onView: (spot: Place) => void;
  onDelete: (spot: Place) => void;
  onOpenWeatherChat: () => void;
  onOpenTripPlanner: () => void;
  onOpenOroomDB?: () => void;
  onOpenNewsFeed: () => void;
}

const STATUS_OPTIONS = ['draft', 'published', 'rejected', 'stub'];

const StatusBadge: React.FC<{ status: Place['status']; onClick?: () => void }> = ({ status, onClick }) => {
    const styleMap: { [key in Place['status']]: string } = {
        draft: 'bg-yellow-100 text-yellow-800',
        published: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        stub: 'bg-gray-100 text-gray-800',
    };

    const baseClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
    const clickableClasses = onClick ? ' cursor-pointer hover:opacity-80 transition-opacity' : '';

    if (onClick) {
        return (
            <button onClick={onClick} className={`${baseClasses} ${styleMap[status]} ${clickableClasses}`}>
                {status}
            </button>
        );
    }

    return (
        <span className={`${baseClasses} ${styleMap[status]}`}>
            {status}
        </span>
    );
};


const ContentLibrary: React.FC<ContentLibraryProps> = ({ spots, news, onAddNew, onAddEvent, onAddNews, onEdit, onView, onDelete, onOpenWeatherChat, onOpenTripPlanner, onOpenOroomDB, onOpenNewsFeed }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Place; direction: 'asc' | 'desc' }>({ key: 'updated_at', direction: 'desc' });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [deleteConfirmSpot, setDeleteConfirmSpot] = useState<Place | null>(null);
  const [orooms, setOrooms] = useState<OroomData[]>([]);

  // 오름 데이터 실시간 구독
  useEffect(() => {
    const unsubscribe = subscribeToOrooms((oroomList) => {
      setOrooms(oroomList);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteClick = (spot: Place) => {
    setDeleteConfirmSpot(spot);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmSpot) {
      onDelete(deleteConfirmSpot);
      setDeleteConfirmSpot(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmSpot(null);
  };

  const filteredAndSortedSpots = useMemo(() => {
    let filtered = spots;

    if (searchTerm) {
      filtered = filtered.filter(spot => 
        spot.place_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (regionFilter !== 'all') {
      filtered = filtered.filter(spot => spot.region === regionFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(spot => spot.categories?.includes(categoryFilter));
    }
    if (statusFilter !== 'all') {
        filtered = filtered.filter(spot => spot.status === statusFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (sortConfig.key === 'updated_at' || sortConfig.key === 'created_at') {
            const aTime = aVal ? (aVal as any).seconds : 0;
            const bTime = bVal ? (bVal as any).seconds : 0;
            if (aTime < bTime) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aTime > bTime) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
  }, [spots, searchTerm, categoryFilter, statusFilter, regionFilter, sortConfig]);

  const handleSort = (key: keyof Place) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const getSortIcon = (key: keyof Place) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'desc' ? '↓' : '↑';
  }

  return (
    <>
      {/* 뉴스 캐러셀 */}
      <NewsCarousel
        news={news}
        onViewAll={onOpenNewsFeed}
      />

      <Card>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">콘텐츠 라이브러리</h2>
        <div className="flex items-center gap-2 flex-wrap justify-end gap-y-2">
            {/* 지도/리스트 전환 버튼 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 리스트
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🗺️ 지도
              </button>
            </div>

            <Button
                onClick={onOpenWeatherChat}
                className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
            >
                📹 CCTV 목록 관리
            </Button>
            <Button
                onClick={() => window.location.href = '/cctv'}
                className="bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-400"
            >
                🎥 라이브 CCTV 보기
            </Button>
            <Button
                onClick={onOpenTripPlanner}
                className="bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-400"
            >
                📅 여행일정AI
            </Button>
            <Button
                onClick={() => onOpenOroomDB && onOpenOroomDB()}
                className="bg-green-500 text-white hover:bg-green-600 focus:ring-green-400"
            >
                🏔️ 오름DB
            </Button>
            
            <div className="flex items-center gap-2 border-l border-gray-300 pl-4 ml-2">
                <Button onClick={() => setIsExportModalOpen(true)} variant="secondary">내보내기</Button>
                <Button onClick={onAddNew}>+ 새 스팟 추가</Button>
                <Button
                  onClick={onAddEvent}
                  className="bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-400"
                >
                  🎉 축제 및 행사
                </Button>
                <Button
                  onClick={onAddNews}
                  className="bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400"
                >
                  📰 최신 소식
                </Button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
         <Input
            label="이름으로 검색"
            placeholder="스팟 이름 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">지역 필터</label>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value="all">모든 지역</option>
                {REGIONS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                        {group.options.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </optgroup>
                ))}
            </select>
         </div>
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 필터</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value="all">모든 카테고리</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
         </div>
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태 필터</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value="all">모든 상태</option>
                {STATUS_OPTIONS.map(stat => <option key={stat} value={stat}>{stat}</option>)}
            </select>
         </div>
      </div>

      {/* 뷰 모드에 따른 조건부 렌더링 */}
      {viewMode === 'map' ? (
        <div className="mb-6">
          <GoogleMapView
            spots={filteredAndSortedSpots}
            orooms={orooms}
            onSpotClick={onView}
            height="500px"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('place_name')}>스팟 이름 {getSortIcon('place_name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('updated_at')}>최종 수정일 {getSortIcon('updated_at')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedSpots.length > 0 ? filteredAndSortedSpots.map(spot => (
              <tr key={spot.place_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {spot.region && <span className="text-gray-500 font-normal mr-2">[{spot.region}]</span>}
                  <button onClick={() => onView(spot)} className="text-left text-indigo-600 hover:text-indigo-900 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">
                    {spot.place_name}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(spot.categories || []).map(cat => (
                        <span key={cat} className="mr-1 mb-1 px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full">{cat}</span>
                    ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge 
                      status={spot.status} 
                      onClick={(spot.status === 'draft' || spot.status === 'stub') ? () => onEdit(spot) : undefined}
                    />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{spot.updated_at ? new Date((spot.updated_at as any).seconds * 1000).toLocaleString() : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button onClick={() => onEdit(spot)} variant="secondary" size="normal">수정</Button>
                  <Button onClick={() => handleDeleteClick(spot)} variant="secondary" size="normal" className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-400">삭제</Button>
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">
                        {spots.length === 0 ? "아직 등록된 스팟이 없습니다. 첫 스팟을 추가해보세요!" : "검색 조건에 맞는 스팟이 없습니다."}
                    </td>
                </tr>
            )}
          </tbody>
        </table>
        </div>
      )}
      </Card>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allSpots={spots}
        filteredSpots={filteredAndSortedSpots}
      />

      {/* 삭제 확인 모달 */}
      {deleteConfirmSpot && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">스팟 삭제 확인</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                <strong>"{deleteConfirmSpot.place_name}"</strong>을(를) 정말로 삭제하시겠습니까?
              </p>
              <p className="text-sm text-red-600 mt-2">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <Button onClick={handleDeleteCancel} variant="secondary">
                취소
              </Button>
              <Button onClick={handleDeleteConfirm} className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500">
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentLibrary;
