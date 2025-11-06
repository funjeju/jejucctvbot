import React, { useState } from 'react';
import type { InitialFormData } from '../types';
import Button from './common/Button';
import Input from './common/Input';
import Textarea from './common/Textarea';
import Card from './common/Card';

interface InitialFormProps {
  categoryData: {spotName: string, categories: string[]};
  onGenerateDraft: (formData: InitialFormData) => void;
  error: string | null;
  onBack: () => void;
  initialValues?: {spotDescription: string, importUrl: string};
}

const InitialForm: React.FC<InitialFormProps> = ({ categoryData, onGenerateDraft, error, onBack, initialValues }) => {
  const [spotDescription, setSpotDescription] = useState(initialValues?.spotDescription || '');
  const [importUrl, setImportUrl] = useState(initialValues?.importUrl || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!spotDescription.trim()) {
        setValidationError('스팟 설명을 입력해주세요.');
        return false;
    }
    if (importUrl.trim() && !importUrl.trim().startsWith('https://www.visitjeju.net')) {
        setValidationError('URL을 입력한 경우, 유효한 VisitJeju.net URL이어야 합니다.');
        return;
    }

    setValidationError(null);
    onGenerateDraft({
        categories: categoryData.categories,
        spotName: categoryData.spotName,
        spotDescription,
        importUrl
    });
  };


  return (
    <Card>
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">2단계: 스팟 설명 입력</h3>
          <p className="text-sm text-gray-500 mb-4">
            <strong>{categoryData.spotName}</strong> ({categoryData.categories.join(', ')})에 대한 상세 설명을 입력하세요.
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-4">전문가님의 지식을 바탕으로 스팟을 자유롭게 설명해주세요. 이 설명을 기반으로 AI가 상세 데이터를 생성합니다. 더 정확한 정보 추출을 위해 관련 URL을 추가할 수 있습니다.</p>
           <div className="space-y-4">
             <Textarea
                label="스팟 설명 (필수)"
                id="spotDescription"
                value={spotDescription}
                onChange={(e) => setSpotDescription(e.target.value)}
                placeholder="예: 제주시 서쪽의 대표적인 오름으로, 가을에는 억새가 장관을 이룹니다. 경사가 가파르지만 정상에 오르면 주변 풍경이 한눈에 들어와요. 아이들과 함께 가기엔 조금 힘들 수 있지만, 연인이나 친구와 함께 일몰을 감상하기 좋은 곳입니다."
                rows={6}
              />
            <Input
                label="VisitJeju.net URL (선택)"
                id="importUrl"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.visitjeju.net/..."
            />
          </div>
        </div>
        
        <div className="pt-5 flex items-center space-x-4">
            <Button onClick={onBack} variant="secondary" fullWidth size="large">
                뒤로가기
            </Button>
            <Button onClick={handleSubmit} fullWidth size="large">
                AI로 초안 생성하기
            </Button>
        </div>

        {validationError && <p className="mt-4 text-sm text-red-600 text-center">{validationError}</p>}
        {error && <p className="mt-4 text-sm text-red-600 text-center">오류: {error}</p>}
        
      </div>
    </Card>
  );
};

export default InitialForm;
