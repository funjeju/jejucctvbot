import React from 'react';
import type { WeatherSource } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface WeatherSourceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: WeatherSource[];
  onEdit: (source: WeatherSource) => void;
  onDelete: (id: string) => void;
}

const WeatherSourceListModal: React.FC<WeatherSourceListModalProps> = ({ isOpen, onClose, sources, onEdit, onDelete }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="날씨 정보 소스 목록">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {sources.length > 0 ? (
          sources.map(source => (
            <div key={source.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-gray-800 truncate">{source.title}</p>
                <p className="text-xs text-gray-500 truncate">{source.youtubeUrl}</p>
              </div>
              <div className="flex space-x-2 ml-4 flex-shrink-0">
                <Button onClick={() => onEdit(source)} variant="secondary" size="normal">수정</Button>
                <button onClick={() => onDelete(source.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm">삭제</button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-center text-gray-500 py-6">
            등록된 날씨 정보 소스가 없습니다.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default WeatherSourceListModal;
