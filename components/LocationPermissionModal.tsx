import React from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import type { UserLocation } from '../types';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllowLocation: () => Promise<void>;
  isLoading?: boolean;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onAllowLocation,
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="위치 정보 허용">
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            현재 위치 정보가 필요합니다
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            사용자의 위치 정보를 활용하여 더 정확하고 개인화된<br />
            여행 추천과 날씨 정보를 제공할 수 있습니다.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">위치 정보 활용 내용:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 가까운 관광지 및 맛집 추천</li>
            <li>• 현재 위치 기반 날씨 정보 제공</li>
            <li>• 주변 실시간 CCTV 영상 안내</li>
            <li>• 맞춤형 여행 일정 생성</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-700">
            <span className="font-semibold">개인정보 보호:</span> 위치 정보는 서비스 제공 목적으로만 사용되며,
            외부로 전송되거나 저장되지 않습니다.
          </p>
        </div>

        <div className="flex space-x-3 pt-2">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isLoading}
          >
            나중에
          </Button>
          <Button
            onClick={onAllowLocation}
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? '위치 정보 가져오는 중...' : '허용하기'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LocationPermissionModal;