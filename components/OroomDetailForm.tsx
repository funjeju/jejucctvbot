import React, { useState, useEffect } from 'react';
import type { OroomData, OroomImage } from '../types';
import Button from './common/Button';
import Input from './common/Input';
import { uploadMultipleImages } from '../services/imageUpload';

interface OroomDetailFormProps {
  oroomData: OroomData;
  onSave: (data: OroomData) => void;
  onBack: () => void;
}

const OroomDetailForm: React.FC<OroomDetailFormProps> = ({ oroomData, onSave, onBack }) => {
  const [formData, setFormData] = useState<OroomData>(oroomData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [attractionsText, setAttractionsText] = useState<string>(oroomData.nearbyAttractions.join(', '));

  const difficulties = ['쉬움', '보통', '어려움', '매우어려움'] as const;
  const summitViews = ['상', '중', '하'] as const;
  const seasons = ['봄', '여름', '가을', '겨울'];
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // AI 분석 결과가 이미 oroomData에 포함되어 있음

  const handleInputChange = (field: keyof OroomData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date()
    }));
  };

  const handleImageUpload = async (category: 'parking' | 'entrance' | 'trail' | 'summit', files: FileList | null) => {
    if (!files) return;

    const maxFiles = {
      parking: 3,
      entrance: 3,
      trail: 5,
      summit: 3
    };

    const fieldName = `${category}Images` as keyof OroomData;
    const currentImages = formData[fieldName] as OroomImage[];

    if (currentImages.length + files.length > maxFiles[category]) {
      alert(`${category === 'parking' ? '주차장' :
              category === 'entrance' ? '탐방로입구' :
              category === 'trail' ? '탐방로' : '정상뷰'} 사진은 최대 ${maxFiles[category]}장까지 업로드 가능합니다.`);
      return;
    }

    const categoryKey = `${category}_upload`;
    setUploadingImages(prev => [...prev, categoryKey]);

    try {
      // Firebase Storage에 업로드
      const filesArray = Array.from(files);
      const uploadedImages = await uploadMultipleImages(filesArray, formData.id, category);

      // 기존 이미지와 새로 업로드된 이미지 합치기
      handleInputChange(fieldName, [...currentImages, ...uploadedImages]);

      console.log(`${category} 이미지 업로드 완료:`, uploadedImages);
    } catch (error) {
      console.error(`${category} 이미지 업로드 오류:`, error);
      alert(`이미지 업로드 중 오류가 발생했습니다: ${(error as Error).message}`);
    } finally {
      setUploadingImages(prev => prev.filter(key => key !== categoryKey));
    }
  };

  const handleCardImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const categoryKey = 'card_upload';
    setUploadingImages(prev => [...prev, categoryKey]);

    try {
      // Firebase Storage에 업로드 (카드 카테고리로)
      const uploadedImages = await uploadMultipleImages([file], formData.id, 'summit'); // summit 카테고리 재사용

      if (uploadedImages.length > 0) {
        handleInputChange('cardImage', uploadedImages[0]);
        console.log('카드 이미지 업로드 완료:', uploadedImages[0]);
      }
    } catch (error) {
      console.error('카드 이미지 업로드 오류:', error);
      alert(`카드 이미지 업로드 중 오류가 발생했습니다: ${(error as Error).message}`);
    } finally {
      setUploadingImages(prev => prev.filter(key => key !== categoryKey));
    }
  };

  const removeImage = (category: 'parking' | 'entrance' | 'trail' | 'summit', imageId: string) => {
    const fieldName = `${category}Images` as keyof OroomData;
    const currentImages = formData[fieldName] as OroomImage[];
    const updatedImages = currentImages.filter(img => img.id !== imageId);
    handleInputChange(fieldName, updatedImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 업데이트된 시간 추가
      const updatedOroom = {
        ...formData,
        updatedAt: new Date()
      };

      onSave(updatedOroom);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderImageSection = (
    category: 'parking' | 'entrance' | 'trail' | 'summit',
    title: string,
    maxCount: number
  ) => {
    const fieldName = `${category}Images` as keyof OroomData;
    const images = formData[fieldName] as OroomImage[];

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {title} (최대 {maxCount}장)
        </label>

        {/* 업로드된 이미지들 */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((image) => (
              <div key={image.id} className="relative">
                <img
                  src={image.url}
                  alt={title}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(category, image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 파일 업로드 */}
        {images.length < maxCount && (
          <div>
            {uploadingImages.includes(`${category}_upload`) ? (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">이미지 업로드 중...</span>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(category, e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🏔️ 오름 상세 정보</h2>
        <div className="text-sm text-gray-500">AI 분석 완료</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 기본 정보 */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="오름 이름 *"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />

            <Input
              label="주소 *"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              required
            />

            <Input
              label="GPS 위도"
              type="number"
              step="any"
              value={formData.latitude || ''}
              onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="33.3617"
            />

            <Input
              label="GPS 경도"
              type="number"
              step="any"
              value={formData.longitude || ''}
              onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="126.5292"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">난이도 *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {difficulties.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <Input
              label="왕복 소요 시간 *"
              value={formData.roundTripTime}
              onChange={(e) => handleInputChange('roundTripTime', e.target.value)}
              placeholder="예: 왕복 2시간"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">정상뷰 *</label>
              <select
                value={formData.summitView}
                onChange={(e) => handleInputChange('summitView', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {summitViews.map(view => (
                  <option key={view} value={view}>{view}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">정상뷰 유튜브 영상 (선택)</label>
              <Input
                value={formData.summitVideoUrl || ''}
                onChange={(e) => handleInputChange('summitVideoUrl', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">주요 계절</label>
            <div className="flex flex-wrap gap-2">
              {seasons.map(season => (
                <label key={season} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.mainSeasons.includes(season)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...formData.mainSeasons, season]
                        : formData.mainSeasons.filter(s => s !== season);
                      handleInputChange('mainSeasons', updated);
                    }}
                    className="mr-2"
                  />
                  {season}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">주요 월</label>
              <button
                type="button"
                onClick={() => {
                  const isAllSelected = formData.mainMonths.length === months.length;
                  handleInputChange('mainMonths', isAllSelected ? [] : [...months]);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                {formData.mainMonths.length === months.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {months.map(month => (
                <label key={month} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.mainMonths.includes(month)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...formData.mainMonths, month]
                        : formData.mainMonths.filter(m => m !== month);
                      handleInputChange('mainMonths', updated);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{month}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💡 전문가 팁</label>
            <textarea
              value={formData.expertTip}
              onChange={(e) => handleInputChange('expertTip', e.target.value)}
              placeholder="AI가 생성한 전문가 팁을 자유롭게 수정하세요.&#10;&#10;포함할 내용:&#10;• 등반 준비물 (신발, 의류, 물, 간식)&#10;• 날씨별 주의사항&#10;• 추천 등반 경로 및 소요시간&#10;• 안전 수칙 및 위험 구간&#10;• 체력 관리법 및 휴식 포인트&#10;• 최적 등반 시간대&#10;• 주차장 정보 및 주차 팁&#10;• 사진 촬영 명소&#10;• 계절별 특별 주의사항&#10;• 초보자/숙련자별 맞춤 조언"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm leading-relaxed"
              rows={8}
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 팁: AI가 생성한 내용을 기반으로 더욱 상세하고 실용적인 정보로 업데이트하세요.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">주변 가볼만한 곳</label>
            <textarea
              value={attractionsText}
              onChange={(e) => {
                setAttractionsText(e.target.value);
              }}
              onBlur={(e) => {
                // blur 시에만 배열로 변환하여 저장
                const attractions = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                handleInputChange('nearbyAttractions', attractions);
              }}
              placeholder="쉼표로 구분해서 입력하세요. 예: 성산포항, 섭지코지, 우도"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이름 유래</label>
            <textarea
              value={formData.nameOrigin}
              onChange={(e) => handleInputChange('nameOrigin', e.target.value)}
              placeholder="오름 이름의 유래나 의미를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
            />
          </div>
        </div>

        {/* 오름 카드 이미지 섹션 */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">🎴 오름 카드 이미지</h3>
          <p className="text-sm text-gray-600">세로형 카드 이미지를 업로드하세요. (권장 비율: 2:3 또는 3:4)</p>

          <div className="space-y-3">
            {/* 현재 카드 이미지 표시 */}
            {formData.cardImage && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={formData.cardImage.url}
                    alt="오름 카드"
                    className="w-48 h-64 object-cover rounded-lg border shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleInputChange('cardImage', undefined)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* 카드 이미지 업로드 */}
            {!formData.cardImage && (
              <div>
                {uploadingImages.includes('card_upload') ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm">카드 이미지 업로드 중...</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="space-y-2">
                      <div className="text-4xl text-gray-400">🎴</div>
                      <p className="text-sm text-gray-600">오름 카드 이미지를 업로드하세요</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCardImageUpload(e.target.files)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 사진 업로드 섹션 */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">사진 업로드</h3>

          {renderImageSection('parking', '주차장 사진', 3)}
          {renderImageSection('entrance', '탐방로입구 사진', 3)}
          {renderImageSection('trail', '탐방로 사진', 5)}
          {renderImageSection('summit', '정상뷰 사진', 3)}
        </div>

        {/* 버튼 */}
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
            disabled={isSubmitting || !formData.name || !formData.address}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            {isSubmitting ? '저장 중...' : '오름 저장하기'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OroomDetailForm;