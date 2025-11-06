import React, { useState } from 'react';
import type { EventInfo } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import Input from './common/Input';
import CheckboxGroup from './common/CheckboxGroup';

interface EventFormProps {
  onSubmit: (eventData: EventFormData) => void;
  onBack: () => void;
}

export interface EventFormData {
  eventName: string;
  eventDescription: string;
  eventInfo: EventInfo;
  region?: string;
  address?: string;
  importUrl?: string;
}

const EVENT_TYPES = ["축제", "공연", "전시", "문화행사", "체험행사", "기타"];
const EVENT_SCALES = ["소규모", "중규모", "대규모"];
const SEASONS = ["봄", "여름", "가을", "겨울"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const TARGET_AUDIENCES = ["가족", "연인", "친구", "어린이", "청소년", "성인", "노인", "단체"];

const EventForm: React.FC<EventFormProps> = ({ onSubmit, onBack }) => {
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [importUrl, setImportUrl] = useState('');

  const [eventType, setEventType] = useState<EventInfo['event_type']>('축제');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [seasons, setSeasons] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [isAnnual, setIsAnnual] = useState(true);
  const [admissionFee, setAdmissionFee] = useState('');
  const [reservationRequired, setReservationRequired] = useState(false);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [eventScale, setEventScale] = useState<EventInfo['event_scale']>('중규모');
  const [durationDays, setDurationDays] = useState<number | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim()) {
      alert('행사명을 입력해주세요.');
      return;
    }

    const eventInfo: EventInfo = {
      event_type: eventType,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      seasons: seasons.length > 0 ? seasons : undefined,
      months: months.length > 0 ? months : undefined,
      is_annual: isAnnual,
      admission_fee: admissionFee || undefined,
      reservation_required: reservationRequired,
      target_audience: targetAudience.length > 0 ? targetAudience : undefined,
      event_scale: eventScale,
      duration_days: durationDays,
    };

    onSubmit({
      eventName,
      eventDescription,
      eventInfo,
      region: region || undefined,
      address: address || undefined,
      importUrl: importUrl || undefined,
    });
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">축제 및 행사 정보 입력</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-700 mb-3">기본 정보</h3>

          <Input
            label="행사명 *"
            placeholder="예: 제주 벚꽃 축제"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              행사 설명
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
              placeholder="행사에 대한 상세 설명을 입력해주세요..."
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
            />
          </div>

          <Input
            label="지역"
            placeholder="예: 제주시"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />

          <Input
            label="주소"
            placeholder="예: 제주시 전농로 123"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <Input
            label="참고 URL"
            placeholder="https://..."
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
          />
        </div>

        {/* 행사 유형 및 규모 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-700 mb-3">행사 유형 및 규모</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              행사 유형
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventInfo['event_type'])}
            >
              {EVENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              행사 규모
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={eventScale}
              onChange={(e) => setEventScale(e.target.value as EventInfo['event_scale'])}
            >
              {EVENT_SCALES.map(scale => (
                <option key={scale} value={scale}>{scale}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 일정 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-700 mb-3">일정 정보</h3>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAnnual"
              checked={isAnnual}
              onChange={(e) => setIsAnnual(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isAnnual" className="text-sm font-medium text-gray-700">
              연례 행사 (매년 개최)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="시작일"
              type="text"
              placeholder={isAnnual ? "매년 3월" : "2025-03-15"}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              label="종료일"
              type="text"
              placeholder={isAnnual ? "매년 4월" : "2025-04-15"}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <Input
            label="행사 기간 (일 수)"
            type="number"
            placeholder="예: 30"
            value={durationDays || ''}
            onChange={(e) => setDurationDays(e.target.value ? parseInt(e.target.value) : undefined)}
          />

          <CheckboxGroup
            label="주요 계절"
            options={SEASONS}
            selectedOptions={seasons}
            onChange={setSeasons}
          />

          <CheckboxGroup
            label="주요 월"
            options={MONTHS}
            selectedOptions={months}
            onChange={setMonths}
          />
        </div>

        {/* 참여 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-700 mb-3">참여 정보</h3>

          <Input
            label="입장료"
            placeholder="예: 무료 / 성인 10,000원 / 5,000원"
            value={admissionFee}
            onChange={(e) => setAdmissionFee(e.target.value)}
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="reservationRequired"
              checked={reservationRequired}
              onChange={(e) => setReservationRequired(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="reservationRequired" className="text-sm font-medium text-gray-700">
              사전 예약 필요
            </label>
          </div>

          <CheckboxGroup
            label="주요 대상"
            options={TARGET_AUDIENCES}
            selectedOptions={targetAudience}
            onChange={setTargetAudience}
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button type="button" onClick={onBack} variant="secondary">
            뒤로 가기
          </Button>
          <Button type="submit">
            다음 단계로
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default EventForm;
