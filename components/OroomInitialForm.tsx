import React, { useState } from 'react';
import type { OroomInitialFormData } from '../types';
import Button from './common/Button';

interface OroomInitialFormProps {
  onSubmit: (data: OroomInitialFormData) => void;
  onBack: () => void;
}

const OroomInitialForm: React.FC<OroomInitialFormProps> = ({ onSubmit, onBack }) => {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('오름에 대한 설명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ description: description.trim() });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🏔️ 새로운 오름 추가</h2>
        <p className="text-gray-600">AI가 분석할 수 있도록 오름에 대해 자유롭게 설명해주세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            오름을 설명하세요 *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="오름의 위치, 높이, 특징, 난이도, 볼거리 등을 자유롭게 설명해주세요. AI가 이 정보를 분석하여 구조화된 데이터로 변환합니다."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            required
          />
          <div className="text-sm text-gray-500 mt-1">
            최소 50자 이상 입력해주세요. 더 자세할수록 AI가 정확하게 분석할 수 있습니다.
          </div>
        </div>


        <div className="flex gap-3">
          <Button
            type="button"
            onClick={onBack}
            variant="secondary"
            className="flex-1"
          >
            뒤로가기
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || description.trim().length < 50}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'AI 분석 중...' : 'AI로 분석하기'}
          </Button>
        </div>
      </form>

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">🤖 AI가 분석하는 정보</h3>
        <div className="text-xs text-blue-600 space-y-1">
          <p>• 오름 이름 및 정확한 주소</p>
          <p>• 난이도 (쉬움/보통/어려움/매우어려움)</p>
          <p>• 주요 계절 및 추천 월</p>
          <p>• 왕복 소요 시간</p>
          <p>• 정상뷰 등급 (상/중/하)</p>
          <p>• 주변 관광지 및 이름 유래</p>
        </div>
      </div>
    </div>
  );
};

export default OroomInitialForm;