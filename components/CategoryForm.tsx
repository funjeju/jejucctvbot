import React, { useState } from 'react';
import { CATEGORIES } from '../constants';
import Button from './common/Button';
import CheckboxGroup from './common/CheckboxGroup';
import Input from './common/Input';
import Card from './common/Card';

interface CategoryFormProps {
  onSubmit: (data: {spotName: string, categories: string[]}) => void;
  error: string | null;
  onBack: () => void;
  initialValues?: {spotName: string, categories: string[]};
}

const CategoryForm: React.FC<CategoryFormProps> = ({ onSubmit, error, onBack, initialValues }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialValues?.categories || []);
  const [spotName, setSpotName] = useState(initialValues?.spotName || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = () => {
    if (selectedCategories.length < 1) {
      setValidationError('카테고리를 1개 이상 선택해주세요.');
      return false;
    }
    if (!spotName.trim()) {
      setValidationError('스팟 이름을 입력해주세요.');
      return false;
    }

    setValidationError(null);
    onSubmit({
        categories: selectedCategories,
        spotName: spotName.trim()
    });
  };

  return (
    <Card>
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">1단계: 카테고리 및 스팟 이름</h3>
          <p className="text-sm text-gray-500 mb-4">스팟의 기본 정보를 설정합니다.</p>
          <div className="space-y-4">
            <CheckboxGroup
              label="카테고리 선택 (필수, 1개 이상)"
              options={CATEGORIES}
              selectedOptions={selectedCategories}
              onChange={handleCategoryChange}
            />
            <Input
              label="스팟 이름 (필수)"
              id="spotName"
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
              placeholder="예: 새별오름"
            />
          </div>
        </div>

        <div className="pt-5 flex items-center space-x-4">
            <Button onClick={onBack} variant="secondary" fullWidth size="large">
                뒤로가기
            </Button>
            <Button onClick={handleSubmit} fullWidth size="large">
                다음 단계
            </Button>
        </div>

        {validationError && <p className="mt-4 text-sm text-red-600 text-center">{validationError}</p>}
        {error && <p className="mt-4 text-sm text-red-600 text-center">오류: {error}</p>}

      </div>
    </Card>
  );
};

export default CategoryForm;