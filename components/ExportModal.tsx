import React, { useState } from 'react';
import type { Place, Timestamp } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import Card from './common/Card';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allSpots: Place[];
  filteredSpots: Place[];
}

// Helper to trigger JSON file download
const downloadJson = (data: Place[], filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, allSpots, filteredSpots }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleExportAll = () => {
    downloadJson(allSpots, `k-lokal_all-spots_${new Date().toISOString().slice(0, 10)}.json`);
    onClose();
  };

  const handleExportFiltered = () => {
    downloadJson(filteredSpots, `k-lokal_filtered-spots_${new Date().toISOString().slice(0, 10)}.json`);
    onClose();
  };

  const handleExportByDate = () => {
    if (!startDate || !endDate) {
      setError('시작일과 종료일을 모두 선택해주세요.');
      return;
    }
    const startTimestamp = new Date(startDate).getTime() / 1000;
    const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999) / 1000;

    if (startTimestamp > endTimestamp) {
      setError('시작일은 종료일보다 이전이어야 합니다.');
      return;
    }
    
    setError('');

    const spotsInDateRange = allSpots.filter(spot => {
      const spotTimestamp = (spot.updated_at as Timestamp)?.seconds;
      if (!spotTimestamp) return false;
      return spotTimestamp >= startTimestamp && spotTimestamp <= endTimestamp;
    });

    if (spotsInDateRange.length === 0) {
        setError('해당 기간에 해당하는 데이터가 없습니다.');
        return;
    }

    downloadJson(spotsInDateRange, `k-lokal_spots_${startDate}_to_${endDate}.json`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="데이터 내보내기">
      <div className="space-y-6">
        <p className="text-gray-600">
          라이브러리의 스팟 데이터를 JSON 파일 형식으로 내보냅니다. 원하는 내보내기 옵션을 선택하세요.
        </p>

        {/* Option 1: Export Current Filter */}
        <Card>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h4 className="font-semibold text-lg text-gray-800">현재 필터링된 결과 내보내기</h4>
              <p className="text-sm text-gray-500 mt-1">
                현재 라이브러리에 표시된 {filteredSpots.length}개의 스팟을 내보냅니다.
              </p>
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                <Button onClick={handleExportFiltered} disabled={filteredSpots.length === 0}>
                    내보내기
                </Button>
            </div>
          </div>
        </Card>

        {/* Option 2: Export by Date Range */}
        <Card>
          <h4 className="font-semibold text-lg text-gray-800 mb-3">기간별 데이터 내보내기</h4>
          <p className="text-sm text-gray-500 mb-4">
            특정 기간 동안 최종 수정된 스팟 데이터를 선택하여 내보냅니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
            </div>
             <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleExportByDate} fullWidth>
                기간으로 내보내기
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-center text-red-600">{error}</p>}
        </Card>

        {/* Option 3: Export All */}
        <Card>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
             <div>
              <h4 className="font-semibold text-lg text-gray-800">전체 데이터 내보내기</h4>
              <p className="text-sm text-gray-500 mt-1">
                라이브러리의 모든 스팟 {allSpots.length}개를 내보냅니다.
              </p>
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                <Button onClick={handleExportAll} variant="secondary" disabled={allSpots.length === 0}>
                    전체 내보내기
                </Button>
            </div>
          </div>
        </Card>
      </div>
    </Modal>
  );
};

export default ExportModal;