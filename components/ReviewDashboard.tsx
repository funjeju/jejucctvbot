import React, { useState } from 'react';
import type { Place, ImageInfo, Comment, LinkedSpot, PublicInfo, Geopoint } from '../types';
import AddressGpsInput from './AddressGpsInput';
import {
  TARGET_AUDIENCE_GROUPS,
  RECOMMENDED_SEASONS_GROUPS,
  WITH_KIDS_OPTIONS,
  WITH_PETS_OPTIONS,
  PARKING_DIFFICULTY_OPTIONS,
  ADMISSION_FEE_OPTIONS,
  LINK_TYPE_OPTIONS,
  COMMENT_TYPE_OPTIONS,
  ALL_REGIONS,
  ACCOMMODATION_TYPE_OPTIONS,
  ACCOMMODATION_PRICE_RANGE_OPTIONS,
  ACCOMMODATION_VIEW_TYPE_OPTIONS,
  KID_FRIENDLY_OPTIONS,
  PET_FRIENDLY_OPTIONS,
  BREAKFAST_OPTIONS,
  CATEGORIES
} from '../constants';
import Button from './common/Button';
import Card from './common/Card';
import Input from './common/Input';
import Textarea from './common/Textarea';
import Select from './common/Select';
import CheckboxGroup from './common/CheckboxGroup';

interface ReviewDashboardProps {
  initialData: Place;
  onSave: (finalData: Place) => void;
  allSpots: Place[];
  onAddStubSpot: (spotName: string) => Place;
  onBack: () => void;
}

const LinkedSpotEditor: React.FC<{
  spot: LinkedSpot;
  index: number;
  allSpots: Place[];
  onAddStub: (spotName: string) => Place;
  onChange: (index: number, field: keyof LinkedSpot, value: string) => void;
  onRemove: (index: number) => void;
}> = ({ spot, index, allSpots, onAddStub, onChange, onRemove }) => {
  const [inputValue, setInputValue] = useState(spot.place_name);
  const [showStubButton, setShowStubButton] = useState(false);
  const datalistId = `spots-datalist-${index}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setInputValue(name);
    
    const existingSpot = allSpots.find(s => s.place_name.toLowerCase() === name.toLowerCase());

    if (existingSpot) {
      onChange(index, 'place_id', existingSpot.place_id);
      onChange(index, 'place_name', existingSpot.place_name);
      setShowStubButton(false);
    } else {
      onChange(index, 'place_id', ''); // Clear ID if it's a new name
      onChange(index, 'place_name', name);
      setShowStubButton(name.trim().length > 0);
    }
  };

  const handleCreateStub = () => {
    const newStub = onAddStub(inputValue);
    onChange(index, 'place_id', newStub.place_id);
    // onChange(index, 'place_name', newStub.place_name); // inputValue is already set
    setShowStubButton(false);
  };
  
  return (
     <div className="border p-3 rounded-md space-y-2 relative">
      <button onClick={() => onRemove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl leading-none">&times;</button>
      <Select label="관계" value={spot.link_type} onChange={e => onChange(index, 'link_type', e.target.value)} options={LINK_TYPE_OPTIONS} />
      <Input
        label="연계 스팟 이름"
        value={inputValue}
        onChange={handleInputChange}
        list={datalistId}
        autoComplete="off"
      />
       <datalist id={datalistId}>
        {allSpots.map(s => <option key={s.place_id} value={s.place_name} />)}
      </datalist>

      {showStubButton && (
        <Button onClick={handleCreateStub} variant="secondary" size="normal" fullWidth>
          + '{inputValue}' 새 스팟으로 임시 등록
        </Button>
      )}
      <Input label="연계 스팟 ID" value={spot.place_id} onChange={e => onChange(index, 'place_id', e.target.value)} placeholder="자동으로 채워집니다" readOnly={!showStubButton}/>
    </div>
  );
};


const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ initialData, onSave, allSpots, onAddStubSpot, onBack }) => {
  const [data, setData] = useState<Place>(initialData);
  const [timeOfDayInput, setTimeOfDayInput] = useState<string>((initialData.attributes?.recommended_time_of_day || []).join(', '));

  const handleInputChange = <K extends keyof Place,>(field: K, value: Place[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttributeChange = <K extends keyof NonNullable<Place['attributes']>>(field: K, value: NonNullable<Place['attributes']>[K]) => {
    setData(prev => ({
      ...prev,
      // FIX: Used a non-null assertion `!` for `prev.attributes` and removed `as object` cast.
      // This is safe because the UI for attributes is only rendered when `data.attributes` exists,
      // ensuring `prev.attributes` is not undefined when this handler is called. This fixes the
      // TypeScript error about missing properties on the `Attributes` type.
      attributes: { ...(prev.attributes!), [field]: value },
    }));
  };

  const handlePublicInfoChange = <K extends keyof NonNullable<Place['public_info']>>(field: K, value: NonNullable<Place['public_info']>[K]) => {
    setData(prev => ({
      ...prev,
      // FIX: Removed `as object` cast. Spreading `prev.public_info` (which can be undefined) is safe
      // because all properties on `PublicInfo` are optional. This improves type safety.
      public_info: { ...(prev.public_info), [field]: value },
    }));
  };

  const [tagInput, setTagInput] = useState((initialData.tags || []).join(', '));

  const handleTagsChange = (value: string) => {
    setTagInput(value);
  };

  const handleTagsBlur = () => {
    const tagsArray = tagInput.split(/[,\s]+/).map(tag => tag.trim()).filter(Boolean);
    handleInputChange('tags', tagsArray);
  };

  const handleCommentChange = (index: number, field: keyof Comment, value: string) => {
    const newComments = [...(data.comments || [])];
    newComments[index] = { ...newComments[index], [field]: value };
    handleInputChange('comments', newComments);
  };
  
  const addComment = () => {
    const newComments: Comment[] = [...(data.comments || []), { type: '특징', content: '' }];
    handleInputChange('comments', newComments);
  };

  const removeComment = (index: number) => {
    const newComments = (data.comments || []).filter((_, i) => i !== index);
    handleInputChange('comments', newComments);
  };

  const handleImageFileChange = (index: number, file: File | null) => {
    if (!file) return;
    const newImages = [...(data.images || [])];
    newImages[index] = {
      ...newImages[index],
      file: file,
      url: URL.createObjectURL(file),
    };
    handleInputChange('images', newImages);
  };

  const handleImageCaptionChange = (index: number, caption: string) => {
    const newImages = [...(data.images || [])];
    newImages[index] = { ...newImages[index], caption: caption };
    handleInputChange('images', newImages);
  };

  const addImage = () => {
    if ((data.images || []).length < 3) {
      handleInputChange('images', [...(data.images || []), { url: '', caption: '' }]);
    }
  };

  const removeImage = (index: number) => {
    handleInputChange('images', (data.images || []).filter((_, i) => i !== index));
  };

  const handleLinkedSpotChange = (index: number, field: keyof LinkedSpot, value: string) => {
    const newLinkedSpots = [...(data.linked_spots || [])];
    newLinkedSpots[index] = { ...newLinkedSpots[index], [field]: value };
    handleInputChange('linked_spots', newLinkedSpots);
  };

  const addLinkedSpot = () => {
    if ((data.linked_spots || []).length < 5) {
      const newLinkedSpots: LinkedSpot[] = [...(data.linked_spots || []), { link_type: '함께가기', place_id: '', place_name: '' }];
      handleInputChange('linked_spots', newLinkedSpots);
    }
  };

  const removeLinkedSpot = (index: number) => {
    const newLinkedSpots = (data.linked_spots || []).filter((_, i) => i !== index);
    handleInputChange('linked_spots', newLinkedSpots);
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">3단계: AI 초안 생성 및 인터랙티브 검수</h2>
      
      {initialData.status === 'draft' && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-r-md" role="alert">
            <p className="font-bold">검수 대기 중</p>
            <p>이 스팟은 현재 '초안(draft)' 상태입니다. 내용을 검토하고 수정하신 후, '기본 정보' 섹션에서 상태를 'published'로 변경하고 최종 저장해주세요.</p>
        </div>
      )}

      <p className="text-md text-gray-600">AI가 생성한 초안입니다. 각 항목을 검토하고 자유롭게 수정해주세요.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="font-semibold text-lg mb-4">기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="스팟 이름" value={data.place_name} onChange={e => handleInputChange('place_name', e.target.value)} />
              <Select
                label="상태"
                value={data.status}
                onChange={e => handleInputChange('status', e.target.value as Place['status'])}
                options={['draft', 'published', 'rejected']}
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">카테고리 (복수 선택 가능)</label>
                <CheckboxGroup
                  options={CATEGORIES}
                  selectedValues={data.categories || []}
                  onChange={(selected) => handleInputChange('categories', selected)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">주소 및 GPS 좌표</label>
                <AddressGpsInput
                  address={data.address || ''}
                  location={data.location}
                  onAddressChange={(address) => handleInputChange('address', address)}
                  onLocationChange={(location) => handleInputChange('location', location)}
                />
              </div>
               <Input label="평균 체류 시간 (분)" type="number" value={data.average_duration_minutes || ''} onChange={e => handleInputChange('average_duration_minutes', e.target.value ? parseInt(e.target.value, 10) : null)} />
            </div>
             <div className="mt-4">
                <Select
                  label="지역"
                  value={data.region || ''}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                >
                  <option value="">지역을 선택해주세요</option>
                  {ALL_REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </Select>
            </div>
            <div className="mt-4">
                <Input label="태그 (쉼표 또는 스페이스로 구분)" value={tagInput} onChange={e => handleTagsChange(e.target.value)} onBlur={handleTagsBlur} placeholder="예: #인생샷, #오션뷰, #분위기좋은" />
            </div>
          </Card>

           <Card>
            <h3 className="font-semibold text-lg mb-4">공개 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input label="운영 시간" value={data.public_info?.operating_hours || ''} onChange={e => handlePublicInfoChange('operating_hours', e.target.value)} placeholder="예: 09:00 - 18:00 (월요일 휴무)" />
               <Input
                 label="정기 휴무일 (쉼표로 구분)"
                 value={data.public_info?.closed_days?.join(', ') || ''}
                 onChange={e => handlePublicInfoChange('closed_days', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                 placeholder="예: 월요일, 화요일"
                 type="text"
                 autoComplete="off"
               />
               <Input label="연락처" value={data.public_info?.phone_number || ''} onChange={e => handlePublicInfoChange('phone_number', e.target.value)} placeholder="예: 064-123-4567"/>
               <Input label="웹사이트 URL" value={data.public_info?.website_url || ''} onChange={e => handlePublicInfoChange('website_url', e.target.value)} placeholder="예: https://instagram.com/jeju_spot"/>
               {data.categories?.includes('식당') && (
                 <label className="flex items-center col-span-1 md:col-span-2">
                   <input
                     type="checkbox"
                     checked={data.public_info?.is_old_shop || false}
                     onChange={e => handlePublicInfoChange('is_old_shop', e.target.checked)}
                     className="form-checkbox mr-2"
                   />
                   노포 (오래된 맛집)
                 </label>
               )}
            </div>
          </Card>
          
          {data.attributes && (
            <Card>
              <h3 className="font-semibold text-lg mb-4">핵심 속성</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <Select label="아이와 함께" value={data.attributes.withKids} onChange={e => handleAttributeChange('withKids', e.target.value)} options={WITH_KIDS_OPTIONS} />
                <Select label="반려동물" value={data.attributes.withPets} onChange={e => handleAttributeChange('withPets', e.target.value)} options={WITH_PETS_OPTIONS} />
                <Select label="주차 난이도" value={data.attributes.parkingDifficulty} onChange={e => handleAttributeChange('parkingDifficulty', e.target.value)} options={PARKING_DIFFICULTY_OPTIONS} />
                <Select label="입장료" value={data.attributes.admissionFee} onChange={e => handleAttributeChange('admissionFee', e.target.value)} options={ADMISSION_FEE_OPTIONS} />
                 <div className="col-span-2 md:col-span-3">
                   <Input label="추천 시간대 (쉼표로 구분)" value={timeOfDayInput} onChange={e => setTimeOfDayInput(e.target.value)} onBlur={e => handleAttributeChange('recommended_time_of_day', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="예: 오전, 일몰, 점심시간 피하기" />
                 </div>
                 <div className="col-span-2 md:col-span-3 flex gap-6">
                   <label className="flex items-center">
                     <input
                       type="checkbox"
                       checked={data.attributes.rainy_day_friendly || false}
                       onChange={e => handleAttributeChange('rainy_day_friendly', e.target.checked)}
                       className="form-checkbox mr-2"
                     />
                     비오는날 추천
                   </label>
                   <label className="flex items-center">
                     <input
                       type="checkbox"
                       checked={data.attributes.is_hidden_gem || false}
                       onChange={e => handleAttributeChange('is_hidden_gem', e.target.checked)}
                       className="form-checkbox mr-2"
                     />
                     히든플레이스 (숨은 명소)
                   </label>
                 </div>
              </div>
              <div className="mt-6">
                <CheckboxGroup
                    label="추천 대상"
                    optionGroups={TARGET_AUDIENCE_GROUPS}
                    baseOption="누구나"
                    selectedOptions={data.attributes.targetAudience}
                    onChange={opt => handleAttributeChange('targetAudience', data.attributes.targetAudience.includes(opt) ? data.attributes.targetAudience.filter(o => o !== opt) : [...data.attributes.targetAudience, opt])}
                    onSelectAll={allOptions => handleAttributeChange('targetAudience', allOptions)}
                />
              </div>
              <div className="mt-6">
                <CheckboxGroup
                    label="추천 시즌"
                    optionGroups={RECOMMENDED_SEASONS_GROUPS}
                    baseOption="아무때나"
                    selectedOptions={data.attributes.recommendedSeasons}
                    onChange={opt => handleAttributeChange('recommendedSeasons', data.attributes.recommendedSeasons.includes(opt) ? data.attributes.recommendedSeasons.filter(o => o !== opt) : [...data.attributes.recommendedSeasons, opt])}
                    onSelectAll={allOptions => handleAttributeChange('recommendedSeasons', allOptions)}
                />
              </div>
            </Card>
          )}

           <Card>
            <h3 className="font-semibold text-lg mb-4">전문가 TIP</h3>
            <div className="space-y-4">
              <Textarea label="원본 설명 (수정 불가)" value={data.expert_tip_raw || ''} rows={5} readOnly className="bg-gray-100" />
              <Textarea label="AI 정제 TIP (수정 가능)" value={data.expert_tip_final || ''} onChange={e => handleInputChange('expert_tip_final', e.target.value)} rows={5} />
            </div>
          </Card>

          {/* 관심사 태그 */}
          <Card>
            <h3 className="font-semibold text-lg mb-4">🎯 관심사 분류</h3>
            <div className="space-y-4">
              <CheckboxGroup
                label="관심사 태그"
                options={["자연", "오션뷰", "요즘핫플", "쇼핑", "박물관", "역사", "액티비티", "걷기"]}
                selectedOptions={data.interest_tags || []}
                onChange={(tag) => {
                  const updated = data.interest_tags?.includes(tag)
                    ? data.interest_tags.filter(t => t !== tag)
                    : [...(data.interest_tags || []), tag];
                  handleInputChange('interest_tags', updated);
                }}
              />
            </div>
          </Card>

          {/* 뷰 정보 */}
          <Card>
            <h3 className="font-semibold text-lg mb-4">🌅 뷰 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.view_info?.ocean_view || false}
                  onChange={e => handleInputChange('view_info', {...(data.view_info || {}), ocean_view: e.target.checked})}
                  className="form-checkbox mr-2"
                />
                바다뷰
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.view_info?.mountain_view || false}
                  onChange={e => handleInputChange('view_info', {...(data.view_info || {}), mountain_view: e.target.checked})}
                  className="form-checkbox mr-2"
                />
                산뷰/오름뷰
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.view_info?.city_view || false}
                  onChange={e => handleInputChange('view_info', {...(data.view_info || {}), city_view: e.target.checked})}
                  className="form-checkbox mr-2"
                />
                시티뷰
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.view_info?.nature_view || false}
                  onChange={e => handleInputChange('view_info', {...(data.view_info || {}), nature_view: e.target.checked})}
                  className="form-checkbox mr-2"
                />
                자연뷰
              </label>
            </div>
          </Card>

          {/* 액티비티 정보 */}
          <Card>
            <h3 className="font-semibold text-lg mb-4">🏃 액티비티 정보</h3>
            <div className="space-y-4">
              <Select
                label="활동 강도"
                value={data.activity_info?.activity_level || ''}
                onChange={e => handleInputChange('activity_info', {...(data.activity_info || {}), activity_level: e.target.value})}
                options={["휴식중심", "가벼운활동", "활동적", "매우활동적"]}
              />
              <Select
                label="체력적 난이도"
                value={data.activity_info?.physical_difficulty || ''}
                onChange={e => handleInputChange('activity_info', {...(data.activity_info || {}), physical_difficulty: e.target.value})}
                options={["쉬움", "보통", "어려움"]}
              />
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.activity_info?.walking_required || false}
                    onChange={e => handleInputChange('activity_info', {...(data.activity_info || {}), walking_required: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  걷기 필요
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.activity_info?.suitable_for_kids || false}
                    onChange={e => handleInputChange('activity_info', {...(data.activity_info || {}), suitable_for_kids: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  아이 동반 적합
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.activity_info?.suitable_for_elderly || false}
                    onChange={e => handleInputChange('activity_info', {...(data.activity_info || {}), suitable_for_elderly: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  어르신 동반 적합
                </label>
              </div>
            </div>
          </Card>

          {/* 트렌드 정보 */}
          <Card>
            <h3 className="font-semibold text-lg mb-4">📱 트렌드 & 인기도</h3>
            <div className="space-y-4">
              <Select
                label="트렌드 상태"
                value={data.trend_info?.trend_status || ''}
                onChange={e => handleInputChange('trend_info', {...(data.trend_info || {}), trend_status: e.target.value})}
                options={["클래식", "꾸준인기", "요즘핫플", "숨은명소"]}
              />
              <Select
                label="인기도"
                value={data.trend_info?.popularity_level || ''}
                onChange={e => handleInputChange('trend_info', {...(data.trend_info || {}), popularity_level: e.target.value})}
                options={["한적함", "보통", "인기", "매우인기"]}
              />
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.trend_info?.sns_hotspot || false}
                    onChange={e => handleInputChange('trend_info', {...(data.trend_info || {}), sns_hotspot: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  SNS 핫스팟
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.trend_info?.instagram_worthy || false}
                    onChange={e => handleInputChange('trend_info', {...(data.trend_info || {}), instagram_worthy: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  인스타그램 포토스팟
                </label>
              </div>
            </div>
          </Card>

          {/* 쇼핑 정보 */}
          {(data.interest_tags?.includes('쇼핑') || data.categories?.some(cat => cat.includes('쇼핑') || cat.includes('상점'))) && (
            <Card>
              <h3 className="font-semibold text-lg mb-4">🛍️ 쇼핑 정보</h3>
              <div className="space-y-4">
                <Select
                  label="쇼핑 타입"
                  value={data.shopping_info?.shopping_type || ''}
                  onChange={e => handleInputChange('shopping_info', {...(data.shopping_info || {}), shopping_type: e.target.value})}
                  options={["대형몰", "로컬샵", "전통시장", "아울렛", "기타"]}
                />
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={data.shopping_info?.has_souvenirs || false}
                      onChange={e => handleInputChange('shopping_info', {...(data.shopping_info || {}), has_souvenirs: e.target.checked})}
                      className="form-checkbox mr-2"
                    />
                    기념품
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={data.shopping_info?.has_local_products || false}
                      onChange={e => handleInputChange('shopping_info', {...(data.shopping_info || {}), has_local_products: e.target.checked})}
                      className="form-checkbox mr-2"
                    />
                    로컬 특산품
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={data.shopping_info?.has_fashion || false}
                      onChange={e => handleInputChange('shopping_info', {...(data.shopping_info || {}), has_fashion: e.target.checked})}
                      className="form-checkbox mr-2"
                    />
                    패션/소품
                  </label>
                </div>
              </div>
            </Card>
          )}

          {/* 문화/역사 정보 */}
          {(data.interest_tags?.includes('역사') || data.interest_tags?.includes('박물관') ||
            data.categories?.some(cat => cat.includes('문화') || cat.includes('역사') || cat.includes('박물관'))) && (
            <Card>
              <h3 className="font-semibold text-lg mb-4">🏛️ 문화/역사 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.cultural_info?.historical_significance || false}
                    onChange={e => handleInputChange('cultural_info', {...(data.cultural_info || {}), historical_significance: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  역사적 의미
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.cultural_info?.cultural_experience || false}
                    onChange={e => handleInputChange('cultural_info', {...(data.cultural_info || {}), cultural_experience: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  문화 체험
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.cultural_info?.traditional_elements || false}
                    onChange={e => handleInputChange('cultural_info', {...(data.cultural_info || {}), traditional_elements: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  전통 요소
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.cultural_info?.modern_culture || false}
                    onChange={e => handleInputChange('cultural_info', {...(data.cultural_info || {}), modern_culture: e.target.checked})}
                    className="form-checkbox mr-2"
                  />
                  현대 문화
                </label>
              </div>
            </Card>
          )}

          {/* 숙소 정보 */}
          {data.categories?.includes('숙소') && (
            <Card>
              <h3 className="font-semibold text-lg mb-4">🏨 숙소 정보</h3>
              <div className="space-y-4">
                <Select
                  label="숙소 유형"
                  value={data.accommodation_info?.accommodation_type || ''}
                  onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), accommodation_type: e.target.value})}
                  options={ACCOMMODATION_TYPE_OPTIONS}
                />
                <Select
                  label="가격대"
                  value={data.accommodation_info?.price_range || ''}
                  onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), price_range: e.target.value})}
                  options={ACCOMMODATION_PRICE_RANGE_OPTIONS}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="뷰 유형"
                    value={data.accommodation_info?.view_type || ''}
                    onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), view_type: e.target.value})}
                    options={ACCOMMODATION_VIEW_TYPE_OPTIONS}
                  />
                  <Select
                    label="권역"
                    value={data.accommodation_info?.region || ''}
                    onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), region: e.target.value})}
                    options={ALL_REGIONS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="아이 동반"
                    value={data.accommodation_info?.kid_friendly || ''}
                    onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), kid_friendly: e.target.value})}
                    options={KID_FRIENDLY_OPTIONS}
                  />
                  <Select
                    label="반려동물"
                    value={data.accommodation_info?.pet_friendly || ''}
                    onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), pet_friendly: e.target.value})}
                    options={PET_FRIENDLY_OPTIONS}
                  />
                </div>
                <Select
                  label="조식"
                  value={data.accommodation_info?.breakfast_included || ''}
                  onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), breakfast_included: e.target.value})}
                  options={BREAKFAST_OPTIONS}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="체크인 시간"
                    value={data.accommodation_info?.check_in_time || ''}
                    onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), check_in_time: e.target.value})}
                    placeholder="예: 15:00"
                  />
                  <Input
                    label="체크아웃 시간"
                    value={data.accommodation_info?.check_out_time || ''}
                    onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), check_out_time: e.target.value})}
                    placeholder="예: 11:00"
                  />
                </div>
                <Input
                  label="구글 맵 링크"
                  value={data.accommodation_info?.google_maps_url || ''}
                  onChange={e => handleInputChange('accommodation_info', {...(data.accommodation_info || {}), google_maps_url: e.target.value})}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </Card>
          )}

        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="font-semibold text-lg mb-4">이미지 (최대 3개)</h3>
            <div className="space-y-4">
              {(data.images || []).map((img, index) => (
                <div key={index} className="border p-3 rounded-md space-y-2 relative">
                   <button onClick={() => removeImage(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl leading-none">&times;</button>
                   {img.url && <img src={img.url} alt="preview" className="rounded-md w-full h-32 object-cover"/>}
                   <input type="file" accept="image/*" onChange={e => handleImageFileChange(index, e.target.files ? e.target.files[0] : null)} className="text-sm w-full file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                   <Input label="캡션" value={img.caption} onChange={e => handleImageCaptionChange(index, e.target.value)} />
                </div>
              ))}
              {(data.images || []).length < 3 && <Button onClick={addImage} variant="secondary" fullWidth>+ 이미지 추가</Button>}
            </div>
          </Card>
          
          <Card>
            <h3 className="font-semibold text-lg mb-4">상세 코멘트</h3>
            <div className="space-y-3">
              {(data.comments || []).map((comment, index) => (
                <div key={index} className="border p-3 rounded-md space-y-2 relative">
                  <button onClick={() => removeComment(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl leading-none">&times;</button>
                  <Select label="유형" value={comment.type} onChange={e => handleCommentChange(index, 'type', e.target.value)} options={COMMENT_TYPE_OPTIONS} />
                  <Textarea label="내용" value={comment.content} onChange={e => handleCommentChange(index, 'content', e.target.value)} rows={3} />
                </div>
              ))}
              <Button onClick={addComment} variant="secondary" fullWidth>+ 코멘트 추가</Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-lg mb-4">연계 장소 (최대 5개)</h3>
            <div className="space-y-3">
              {(data.linked_spots || []).map((spot, index) => (
                <LinkedSpotEditor
                  key={index}
                  spot={spot}
                  index={index}
                  allSpots={allSpots}
                  onAddStub={onAddStubSpot}
                  onChange={handleLinkedSpotChange}
                  onRemove={removeLinkedSpot}
                />
              ))}
              {(data.linked_spots || []).length < 5 && (
                <Button onClick={addLinkedSpot} variant="secondary" fullWidth>+ 연계 장소 추가</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end space-x-4">
        <Button onClick={onBack} variant="secondary" size="large">
            뒤로가기 (수정)
        </Button>
        <Button onClick={() => onSave(data)} size="large">
            최종 저장
        </Button>
      </div>
    </div>
  );
};

export default ReviewDashboard;