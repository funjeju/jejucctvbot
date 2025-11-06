
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { Place } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';

// The API key is sourced from the environment variable `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// --- New 4-Step Type Definitions ---
interface TripPlanFormState {
  // Step 1: Time Frame
  nights: number;
  days: number;
  arrivalHour: string;
  arrivalMinute: string;
  departureHour: string;
  departureMinute: string;

  // Step 2: Fixed Points
  accommodationStatus: 'booked' | 'not_booked';
  bookedAccommodations: string[];
  mustVisitSpots: string[];
  mustVisitRestaurants: string[];
  mustTryFoods: string[]; // New: specific foods to try

  // Step 3: Route Constraints
  dinnerTravelTime: '30min' | '1hour' | '1hour30min';
  nextDayConsideration: 'same_day_finish' | 'next_day_start';
  postLunchCafe: boolean; // New: mandatory cafe after lunch

  // Step 4: Personal Preferences
  companions: string[];
  transportation: string;
  pace: string;
  interests: string[];
  interestWeights: { [key: string]: number };
  tripStyle: string;
}

const initialFormState: TripPlanFormState = {
  // Step 1: Time Frame
  nights: 2,
  days: 3,
  arrivalHour: '10',
  arrivalMinute: '00',
  departureHour: '18',
  departureMinute: '00',

  // Step 2: Fixed Points
  accommodationStatus: 'not_booked',
  bookedAccommodations: [''],
  mustVisitSpots: [''],
  mustVisitRestaurants: [''],
  mustTryFoods: [''],

  // Step 3: Route Constraints
  dinnerTravelTime: '1hour',
  nextDayConsideration: 'same_day_finish',
  postLunchCafe: true,

  // Step 4: Personal Preferences
  companions: [],
  transportation: '렌터카',
  pace: '보통',
  interests: [],
  interestWeights: {},
  tripStyle: '중간 (적당히 절약 + 포인트 투자)',
};


// Step 1 Options
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

// Step 2 Options
const MUST_TRY_FOODS = ["흑돼지", "갈치조림", "전복죽", "고등어회", "옥돔구이", "성게미역국", "몸국", "빙떡", "호떡", "오메기떡"];

// Step 3 Options
const DINNER_TRAVEL_OPTIONS = [
  { value: '30min', label: '30분 이내 (가까운 곳 위주)' },
  { value: '1hour', label: '1시간 이내 (적당히 멀어도 OK)' },
  { value: '1hour30min', label: '1시간 30분 이내 (멀어도 괜찮음)' }
];
const NEXT_DAY_OPTIONS = [
  { value: 'same_day_finish', label: '당일 마무리 중시 (숙소 가까운 곳에서 끝내기)' },
  { value: 'next_day_start', label: '다음날 시작 고려 (다음날 첫 일정 편의성 우선)' }
];

// Step 4 Options
const COMPANION_OPTIONS = ["혼자", "친구와", "연인과", "아이를 동반한 가족", "부모님을 모시고", "반려견과 함께", "회사 동료와"];
const TRANSPORTATION_OPTIONS = ["렌터카", "대중교통", "택시/투어 상품 이용"];
const PACE_OPTIONS = ["여유롭게", "보통", "촘촘하게"];
const INTEREST_OPTIONS = ["#자연 (숲, 오름, 바다)", "#오션뷰 (카페, 식당, 숙소)", "#요즘 뜨는 핫플", "#쇼핑 & 소품샵", "#박물관 & 미술관", "#역사 & 문화 유적", "#짜릿한 액티비티", "#걷기 좋은 길"];
const TRIP_STYLE_OPTIONS = ["전체 저예산 위주", "중간 (적당히 절약 + 포인트 투자)", "고급 (숙소·식사·체험 모두 고급 위주)"];


// --- Helper Components ---
const getIconForLine = (line: string): string => {
  const lowerLine = line.toLowerCase();
  if (lowerLine.includes('공항') || lowerLine.includes('도착') || lowerLine.includes('출발')) return '✈️';
  if (lowerLine.includes('식사') || lowerLine.includes('맛집') || lowerLine.includes('레스토랑') || lowerLine.includes('아침') || lowerLine.includes('점심') || lowerLine.includes('저녁')) return '🍴';
  if (lowerLine.includes('오름') || lowerLine.includes('해변') || lowerLine.includes('자연') || lowerLine.includes('숲') || lowerLine.includes('공원')) return '🏞️';
  if (lowerLine.includes('숙소') || lowerLine.includes('체크인') || lowerLine.includes('호텔') || lowerLine.includes('펜션')) return '🏨';
  if (lowerLine.includes('카페')) return '☕️';
  if (lowerLine.includes('쇼핑') || lowerLine.includes('소품샵')) return '🛍️';
  if (lowerLine.includes('박물관') || lowerLine.includes('미술관')) return '🏛️';
  if (lowerLine.includes('액티비티') || lowerLine.includes('체험')) return '🎢';
  if (lowerLine.includes('이동') || lowerLine.includes('드라이브')) return '🚗';
  return '📍'; // Default pin icon
};

const FormattedMessageContent: React.FC<{ content: string }> = ({ content }) => {
    // Split content by day headers (e.g., ### 1일차: ...)
    // The regex captures the header itself to use as a title.
    const daySections = content.split(/(?=### .*?일차)/).filter(Boolean);

    if (daySections.length === 0) {
        // Fallback for non-day-structured content
        return <p className="text-gray-800 whitespace-pre-wrap">{content}</p>;
    }

    return (
        <div className="space-y-6">
            {daySections.map((section, index) => {
                const lines = section.split('\n').filter(Boolean);
                const titleLine = lines.shift() || '';
                const title = titleLine.replace(/^[#\s]+/, '');

                return (
                    <div key={index} className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 p-6 rounded-2xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                        {/* 일차 배지 */}
                        <div className="absolute -top-3 left-6">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                Day {index + 1}
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-800 mb-6 mt-4 flex items-center">
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{title}</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent ml-4"></div>
                        </h3>

                        <ul className="space-y-4">
                            {lines.map((line, lineIndex) => {
                                if (!line.trim().startsWith('-') && !line.trim().startsWith('*')) {
                                    return <p key={lineIndex} className="text-gray-600 italic mt-2 mb-4 bg-amber-50/50 p-3 rounded-lg border-l-4 border-amber-300">{line}</p>;
                                }

                                const itemText = line.substring(line.indexOf(' ')).trim();
                                const icon = getIconForLine(itemText);

                                const formattedText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-700">$1</strong>');

                                return (
                                    <li key={lineIndex} className="flex items-start text-base group hover:bg-white/50 p-3 rounded-xl transition-colors">
                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                                            <span className="text-lg" role="img">{icon}</span>
                                        </div>
                                        <div className="flex-1 text-gray-700 mt-1" dangerouslySetInnerHTML={{ __html: formattedText }} />
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
};

const ToggleButtonGroup: React.FC<{ options: string[], selected: string, onSelect: (value: string) => void, multiSelect?: false }> = ({ options, selected, onSelect }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(opt => (
            <button key={opt} onClick={() => onSelect(opt)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${selected === opt ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {opt}
            </button>
        ))}
    </div>
);
const CheckboxButtonGroup: React.FC<{ options: string[], selected: string[], onSelect: (value: string) => void }> = ({ options, selected, onSelect }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(opt => (
            <button key={opt} onClick={() => onSelect(opt)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${selected.includes(opt) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {opt}
            </button>
        ))}
    </div>
);


// --- Main Component ---
interface TripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: Place[];
}

const TripPlannerModal: React.FC<TripPlannerModalProps> = ({ isOpen, onClose, spots }) => {
  const [formState, setFormState] = useState<TripPlanFormState>(initialFormState);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [finalItinerary, setFinalItinerary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const getDynamicSteps = () => {
    const baseSteps = ['duration', 'companions', 'transportation', 'accommodationStatus'];
    
    if (!formState.accommodationStatus) return baseSteps;

    let accommodationSteps: string[] = [];
    if (formState.accommodationStatus === 'booked') {
        accommodationSteps.push('bookedAccommodations');
        const bookedCount = formState.bookedAccommodations.filter(s => s.trim() !== '').length;
        if (formState.nights > 0 && bookedCount > 0 && formState.nights > bookedCount) {
            accommodationSteps.push('bookedAccommodationsFollowUp');
        }
    }

    const needsRecommendation = 
        formState.accommodationStatus === 'not_booked' ||
        formState.remainingNightsPlan === 'recommend_rest';

    if (needsRecommendation) {
        accommodationSteps.push('tripStyle');
        if (formState.nights > 1) { // Only ask about style if it's a multi-night trip and not a day trip
             accommodationSteps.push('accommodationRecommendationStyle');
        }
        accommodationSteps.push('accommodationPrefs');
    }
    
    const preferenceSteps = ['pace', 'interests'];
    if (formState.interests.length > 1) {
        preferenceSteps.push('interestWeights');
    }

    const finalSteps = ['food', 'mustVisits', 'summary'];

    return [...baseSteps, ...accommodationSteps, ...preferenceSteps, ...finalSteps];
  }
  const STEPS = getDynamicSteps();
  const MAX_POSSIBLE_STEPS = 15;

  const resetState = () => {
    const systemInstruction = `You are an AI trip planner for Jeju Island named '여행일정AI'. Your goal is to create a personalized travel itinerary based on a detailed user profile. You MUST use the provided JSON data of travel spots as your only source of information for recommendations. Present the final itinerary in a clear, day-by-day format using Markdown. Each day should start with '### X일차: [Day's Theme]'. Ensure the route is geographically logical. Include suggestions for meals. Be friendly and helpful.`;
    const newChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
    setChat(newChat);
    setFormState(initialFormState);
    setCurrentStep(0);
    setIsLoading(false);
    setFinalItinerary(null);
    setError(null);
  };

  useEffect(() => {
    if (isOpen) resetState();
  }, [isOpen]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [finalItinerary, isLoading]);


  const handleUpdateForm = <K extends keyof TripPlanFormState>(key: K, value: TripPlanFormState[K]) => {
    setError(null);
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleDynamicListChange = (key: 'bookedAccommodations' | 'mustVisitRestaurants' | 'mustVisitSpots', index: number, value: string) => {
    const newList = [...formState[key]];
    newList[index] = value;
    handleUpdateForm(key, newList as any);
  };

  const addDynamicListItem = (key: 'bookedAccommodations' | 'mustVisitRestaurants' | 'mustVisitSpots') => {
    handleUpdateForm(key, [...formState[key], ''] as any);
  };

  const removeDynamicListItem = (key: 'bookedAccommodations' | 'mustVisitRestaurants' | 'mustVisitSpots', index: number) => {
    const newList = formState[key].filter((_, i) => i !== index);
    handleUpdateForm(key, newList as any);
  };

  const handleWeightChange = (changedInterest: string, rawNewValue: number) => {
    const currentWeights = formState.interestWeights;
    const interests = formState.interests;
    const newValue = Math.round(rawNewValue / 10) * 10;
    const oldValue = currentWeights[changedInterest];
    const delta = newValue - oldValue;

    if (delta === 0) return;

    const newWeights: { [key: string]: number } = { ...currentWeights };
    newWeights[changedInterest] = newValue;
    
    const otherInterests = interests.filter(i => i !== changedInterest);
    let remainingDelta = delta;

    if (remainingDelta > 0) { 
        while (remainingDelta > 0) {
            let largestOtherInterest = otherInterests
                .filter(i => (newWeights[i] || 0) > 0)
                .sort((a, b) => (newWeights[b] || 0) - (newWeights[a] || 0))[0];
            
            if (!largestOtherInterest) break; 

            newWeights[largestOtherInterest] -= 10;
            remainingDelta -= 10;
        }
    } else { 
        while (remainingDelta < 0) {
            let smallestOtherInterest = otherInterests
                .filter(i => (newWeights[i] || 0) < 100)
                .sort((a, b) => (newWeights[a] || 0) - (newWeights[b] || 0))[0];

            if (!smallestOtherInterest) break; 
            
            newWeights[smallestOtherInterest] += 10;
            remainingDelta += 10;
        }
    }

    const currentSum = Object.values(newWeights).reduce((sum, val) => sum + (val || 0), 0);
    const correction = 100 - currentSum;
    if (correction !== 0) {
        const interestToCorrect = interests.find(i => 
            (newWeights[i] + correction) >= 0 && (newWeights[i] + correction) <= 100
        );
        if (interestToCorrect) {
            newWeights[interestToCorrect] += correction;
        }
    }

    handleUpdateForm('interestWeights', newWeights);
  };


  const generateItinerary = async () => {
    setIsLoading(true);
    setFinalItinerary(null);

    try {
        const needsRecommendation = formState.accommodationStatus === 'not_booked' || formState.remainingNightsPlan === 'recommend_rest';

        const accommodationSummary = formState.accommodationStatus === 'booked' 
            ? `Booked. Details: ${formState.bookedAccommodations.join(', ')}. Plan for remaining nights: ${formState.remainingNightsPlan || 'N/A'}`
            : `Not Booked. User needs recommendations.`;

        const preferenceSummary = needsRecommendation
            ? `Recommendation Style: ${formState.accommodationRecommendationStyle}. Preferred Type: ${formState.accommodationType.join(', ')}. Budget per night: ${formState.accommodationBudget}. Preferred Region: ${formState.preferredAccommodationRegion || 'None specified'}`
            : 'User has booked all accommodations.';

        const context = `
# AVAILABLE DATA (Jeju travel spots)
${JSON.stringify(spots, null, 2)}

# User's Travel Profile
- Trip Duration: ${formState.nights}박 ${formState.days}일 (Arrival: ${formState.arrivalHour}:${formState.arrivalMinute}, Departure: ${formState.departureHour}:${formState.departureMinute})
- Companions: ${formState.companions.join(', ')}
- Transportation: ${formState.transportation}
- Overall Trip Style: ${needsRecommendation ? formState.tripStyle : 'N/A'}
- Accommodation Status: ${accommodationSummary}
- Accommodation Preferences: ${preferenceSummary}
- Pace: ${formState.pace}
- Interests: ${JSON.stringify(formState.interestWeights)}
- Restaurant Style: ${formState.restaurantStyle}
- Must-Visit Restaurants: ${formState.mustVisitRestaurants.filter(Boolean).join(', ')}
- Must-Visit Spots: ${formState.mustVisitSpots.filter(Boolean).join(', ')}

# Task
Based on the user's detailed profile and the provided spot data, create a comprehensive, day-by-day travel itinerary. Ensure the plan is logical in terms of geography and timing. Use markdown for clear formatting. If accommodation recommendations are needed, suggest specific types and regions based on the plan.
`;
        
        const stream = await chat!.sendMessageStream({ message: context });
        
        let fullResponseText = '';
        for await (const chunk of stream) {
            fullResponseText += chunk.text;
            setFinalItinerary(fullResponseText);
        }
    } catch (err) {
        console.error("Trip Planner AI error:", err);
        setFinalItinerary('죄송합니다, 일정을 생성하는 중 오류가 발생했습니다.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleNext = () => {
    switch(STEPS[currentStep]) {
        case 'interests':
            if (formState.interests.length === 0 || formState.interests.length > 4) {
                setError('관심사를 1개 이상, 4개 이하로 선택해주세요.');
                return;
            }
            if (formState.interests.length > 1) {
              const initialWeight = Math.floor(100 / formState.interests.length);
              const remainder = 100 % formState.interests.length;
              const weights = formState.interests.reduce((acc, interest, index) => {
                  acc[interest] = initialWeight + (index < remainder ? 1 : 0);
                  return acc;
              }, {} as { [key: string]: number });
              
              const finalWeights = formState.interests.reduce((acc, interest) => {
                  acc[interest] = Math.round(weights[interest] / 10) * 10;
                  return acc;
              }, {} as {[key: string]: number});
              
              let sum = Object.values(finalWeights).reduce((s, v) => s + v, 0);
              let i = 0;
              while (sum !== 100) {
                  const key = formState.interests[i % formState.interests.length];
                  const adjustment = Math.sign(100 - sum) * 10;
                  if ((finalWeights[key] + adjustment) >= 0 && (finalWeights[key] + adjustment) <= 100) {
                    finalWeights[key] += adjustment;
                  }
                  sum = Object.values(finalWeights).reduce((s, v) => s + v, 0);
                  i++;
                  if(i > 20) break; // safety break
              }

              handleUpdateForm('interestWeights', finalWeights);

            } else if (formState.interests.length === 1) {
              handleUpdateForm('interestWeights', { [formState.interests[0]]: 100 });
            }
            break;
        case 'interestWeights':
            const totalWeight = Object.values(formState.interestWeights).reduce((sum, w) => sum + (w || 0), 0);
            if (totalWeight !== 100) {
                setError(`가중치의 총합이 100%가 되어야 합니다. (현재: ${totalWeight}%)`);
                return;
            }
            break;
    }
    
    if (STEPS[currentStep] === 'summary') {
      generateItinerary();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  const handleBack = () => setCurrentStep(prev => prev - 1);

  const renderCurrentStep = () => {
      const stepKey = STEPS[currentStep];
      const bookedCount = formState.bookedAccommodations.filter(s => s.trim()).length;
      const remainingNights = formState.nights - bookedCount;

      switch(stepKey) {
          case 'duration': return (
              <div>
                  <h3 className="font-semibold mb-3">1. 총 몇 박 며칠 일정인가요?</h3>
                  <div className="flex items-center gap-4 mb-4">
                      <Select label="박" value={formState.nights} onChange={e => { const n = parseInt(e.target.value); handleUpdateForm('nights', n); handleUpdateForm('days', n + 1); }}>
                          {Array.from({ length: 6 }, (_, i) => <option key={i} value={i}>{i === 0 ? '당일치기' : `${i}박`}</option>)}
                      </Select>
                      <Select label="일" value={formState.days} onChange={e => { const d = parseInt(e.target.value); handleUpdateForm('days', d); handleUpdateForm('nights', d > 0 ? d - 1 : 0); }}>
                          {Array.from({ length: 6 }, (_, i) => <option key={i + 1} value={i + 1}>{`${i + 1}일`}</option>)}
                      </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="block text-sm font-medium text-gray-700 mb-1">도착 예상 시간</p>
                        <div className="flex items-center gap-2">
                            <select value={formState.arrivalHour} onChange={e => handleUpdateForm('arrivalHour', e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                {HOUR_OPTIONS.map(h => <option key={`arr-h-${h}`} value={h}>{h}</option>)}
                            </select>
                            <span>시</span>
                            <select value={formState.arrivalMinute} onChange={e => handleUpdateForm('arrivalMinute', e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                {MINUTE_OPTIONS.map(m => <option key={`arr-m-${m}`} value={m}>{m}</option>)}
                            </select>
                            <span>분</span>
                        </div>
                    </div>
                    <div>
                        <p className="block text-sm font-medium text-gray-700 mb-1">출발 예상 시간</p>
                        <div className="flex items-center gap-2">
                            <select value={formState.departureHour} onChange={e => handleUpdateForm('departureHour', e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                {HOUR_OPTIONS.map(h => <option key={`dep-h-${h}`} value={h}>{h}</option>)}
                            </select>
                            <span>시</span>
                            <select value={formState.departureMinute} onChange={e => handleUpdateForm('departureMinute', e.target.value)} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                {MINUTE_OPTIONS.map(m => <option key={`dep-m-${m}`} value={m}>{m}</option>)}
                            </select>
                            <span>분</span>
                        </div>
                    </div>
                  </div>
              </div>
          );
          case 'companions': return (
              <div>
                  <h3 className="font-semibold mb-3">2. 누구와 함께 떠나시나요?</h3>
                  <CheckboxButtonGroup options={COMPANION_OPTIONS} selected={formState.companions} onSelect={val => handleUpdateForm('companions', formState.companions.includes(val) ? formState.companions.filter(c => c !== val) : [...formState.companions, val])} />
              </div>
          );
          case 'transportation': return (
              <div>
                  <h3 className="font-semibold mb-3">3. 주된 이동 수단은 무엇인가요?</h3>
                  <ToggleButtonGroup options={TRANSPORTATION_OPTIONS} selected={formState.transportation} onSelect={val => handleUpdateForm('transportation', val)} />
              </div>
          );
          case 'accommodationStatus': return (
              <div>
                  <h3 className="font-semibold mb-3">4. 이미 예약하신 숙소가 있나요?</h3>
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateForm('accommodationStatus', 'booked')} variant={formState.accommodationStatus === 'booked' ? 'primary' : 'secondary'}>네, 있습니다.</Button>
                    <Button onClick={() => handleUpdateForm('accommodationStatus', 'not_booked')} variant={formState.accommodationStatus === 'not_booked' ? 'primary' : 'secondary'}>아니요, 없습니다.</Button>
                  </div>
              </div>
          );
          case 'bookedAccommodations': return (
              <div>
                  <h3 className="font-semibold mb-3">예약하신 숙소 이름을 모두 알려주세요.</h3>
                  {formState.bookedAccommodations.map((acc, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                          <Input label={`숙소 ${index + 1}`} value={acc} onChange={e => handleDynamicListChange('bookedAccommodations', index, e.target.value)} />
                          {formState.bookedAccommodations.length > 1 && <button onClick={() => removeDynamicListItem('bookedAccommodations', index)} className="text-red-500 mt-6">&times;</button>}
                      </div>
                  ))}
                  <Button onClick={() => addDynamicListItem('bookedAccommodations')} variant="secondary" size="normal">+ 숙소 추가</Button>
              </div>
          );
          case 'bookedAccommodationsFollowUp': return (
              <div>
                  <h3 className="font-semibold mb-3">{`숙소 ${bookedCount}곳을 입력해주셨네요. 남은 ${remainingNights}박에 대한 숙소 계획을 선택해주세요.`}</h3>
                  <div className="flex flex-col gap-2">
                      <Button onClick={() => handleUpdateForm('remainingNightsPlan', 'stay_at_first')} variant={formState.remainingNightsPlan === 'stay_at_first' ? 'primary' : 'secondary'}>입력한 숙소에서 모두 숙박할게요.</Button>
                      <Button onClick={() => handleUpdateForm('remainingNightsPlan', 'recommend_rest')} variant={formState.remainingNightsPlan === 'recommend_rest' ? 'primary' : 'secondary'}>남은 숙소는 AI에게 추천받을게요.</Button>
                  </div>
              </div>
          );
          case 'tripStyle': return (
            <div>
                <h3 className="font-semibold mb-3">여행의 전반적인 스타일은 어떻게 할까요?</h3>
                <p className="text-sm text-gray-500 mb-3">선택하신 스타일은 숙소뿐만 아니라 식사, 체험 추천에도 영향을 줍니다.</p>
                <ToggleButtonGroup options={TRIP_STYLE_OPTIONS} selected={formState.tripStyle} onSelect={val => handleUpdateForm('tripStyle', val)} />
            </div>
          );
          case 'accommodationRecommendationStyle': return (
            <div>
              <h3 className="font-semibold mb-3">숙소는 어떻게 추천해 드릴까요?</h3>
              <div className="flex flex-col gap-2 mb-4">
                <Button onClick={() => handleUpdateForm('accommodationRecommendationStyle', 'base_camp')} variant={formState.accommodationRecommendationStyle === 'base_camp' ? 'primary' : 'secondary'}>한 곳을 거점으로 여행할래요</Button>
                <Button onClick={() => handleUpdateForm('accommodationRecommendationStyle', 'daily_move')} variant={formState.accommodationRecommendationStyle === 'daily_move' ? 'primary' : 'secondary'}>동선에 맞춰 매일 다른 곳에 머물래요</Button>
              </div>
              {formState.accommodationRecommendationStyle === 'base_camp' && (
                <Input label="혹시 특별히 선호하는 숙소 지역이 있으신가요? (선택)" value={formState.preferredAccommodationRegion} onChange={e => handleUpdateForm('preferredAccommodationRegion', e.target.value)} placeholder="예: 제주시, 서귀포시, 애월읍" />
              )}
              {formState.accommodationRecommendationStyle === 'daily_move' && (
                  <p className="text-sm text-indigo-700 bg-indigo-50 p-3 rounded-md">알겠습니다. 1일차 일정 마지막 코스에 가까운 숙소를, 2일차 일정 마지막 코스에 가까운 숙소를 추천해 드릴게요.</p>
              )}
            </div>
          );
          case 'accommodationPrefs': return (
              <div>
                  <h3 className="font-semibold mb-3">선호하는 숙소 유형과 1박당 예산을 알려주세요.</h3>
                  <div className="space-y-4">
                      <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">유형</p>
                          <CheckboxButtonGroup options={ACCOMMODATION_TYPES} selected={formState.accommodationType} onSelect={val => handleUpdateForm('accommodationType', formState.accommodationType.includes(val) ? formState.accommodationType.filter(c => c !== val) : [...formState.accommodationType, val])} />
                      </div>
                      <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">예산</p>
                          <ToggleButtonGroup options={ACCOMMODATION_BUDGETS} selected={formState.accommodationBudget} onSelect={val => handleUpdateForm('accommodationBudget', val)} />
                      </div>
                  </div>
              </div>
          );
          case 'pace': return (
              <div>
                  <h3 className="font-semibold mb-3">여행 템포를 알려주세요.</h3>
                  <ToggleButtonGroup options={PACE_OPTIONS} selected={formState.pace} onSelect={val => handleUpdateForm('pace', val)} />
              </div>
          );
          case 'interests': return (
              <div>
                  <h3 className="font-semibold mb-3">경험하고 싶은 스타일을 모두 선택해주세요. (1~4개)</h3>
                  <CheckboxButtonGroup options={INTEREST_OPTIONS} selected={formState.interests} onSelect={val => handleUpdateForm('interests', formState.interests.includes(val) ? formState.interests.filter(c => c !== val) : [...formState.interests, val])} />
              </div>
          );
          case 'interestWeights': return (
              <div>
                  <h3 className="font-semibold mb-3">선택하신 스타일의 중요도를 조절해주세요. (총합 100%)</h3>
                  <div className="space-y-3">
                      {formState.interests.map(interest => (
                          <div key={interest} className="grid grid-cols-5 items-center gap-3">
                              <label className="col-span-2 text-sm truncate" htmlFor={`slider-${interest}`}>{interest}</label>
                              <input 
                                id={`slider-${interest}`}
                                type="range" 
                                min="0" 
                                max="100" 
                                step="10"
                                value={formState.interestWeights[interest] || 0} 
                                onChange={e => handleWeightChange(interest, parseInt(e.target.value))} 
                                className="col-span-2 flex-1 accent-indigo-600"
                              />
                              <span className="col-span-1 text-sm font-semibold text-gray-700 text-right">{formState.interestWeights[interest] || 0}%</span>
                          </div>
                      ))}
                      <p className="text-right font-bold mt-2">총합: {Object.values(formState.interestWeights).reduce((a, b) => a + (b || 0), 0)}%</p>
                  </div>
              </div>
          );
          case 'food': return (
              <div>
                  <h3 className="font-semibold mb-3">식사는 어떤 스타일을 선호하시나요?</h3>
                  <ToggleButtonGroup options={RESTAURANT_STYLE_OPTIONS} selected={formState.restaurantStyle} onSelect={val => handleUpdateForm('restaurantStyle', val)} />
              </div>
          );
          case 'mustVisits': return (
              <div>
                  <h3 className="font-semibold mb-3">꼭 방문하고 싶은 맛집/카페나 관광지가 있나요?</h3>
                  <div className="space-y-4">
                      <div>
                          <p className="text-sm font-medium mb-1">맛집/카페</p>
                          {formState.mustVisitRestaurants.map((item, index) => (
                              <div key={index} className="flex items-center gap-2 mb-2">
                                  <Input label="" value={item} onChange={e => handleDynamicListChange('mustVisitRestaurants', index, e.target.value)} />
                                  {formState.mustVisitRestaurants.length > 1 && <button onClick={() => removeDynamicListItem('mustVisitRestaurants', index)} className="text-red-500">&times;</button>}
                              </div>
                          ))}
                          <Button onClick={() => addDynamicListItem('mustVisitRestaurants')} variant="secondary" size="normal">+ 추가</Button>
                      </div>
                      <div>
                          <p className="text-sm font-medium mb-1">관광지</p>
                          {formState.mustVisitSpots.map((item, index) => (
                              <div key={index} className="flex items-center gap-2 mb-2">
                                  <Input label="" value={item} onChange={e => handleDynamicListChange('mustVisitSpots', index, e.target.value)} />
                                  {formState.mustVisitSpots.length > 1 && <button onClick={() => removeDynamicListItem('mustVisitSpots', index)} className="text-red-500">&times;</button>}
                              </div>
                          ))}
                          <Button onClick={() => addDynamicListItem('mustVisitSpots')} variant="secondary" size="normal">+ 추가</Button>
                      </div>
                  </div>
              </div>
          );
          case 'summary': return (
            <div>
              <h3 className="font-semibold mb-3">마지막 단계입니다.</h3>
              <p className="text-sm text-gray-600">아래 버튼을 눌러 모든 정보를 바탕으로 맞춤형 여행 일정을 생성하세요.</p>
            </div>
          )
          default: return null;
      }
  };

  const isComplete = finalItinerary !== null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="여행일정AI">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-itinerary, .printable-itinerary * {
              visibility: visible;
            }
            .printable-itinerary {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            .no-print, .no-print * {
              display: none !important;
            }
            .printable-itinerary .bg-gray-50\\/50 {
              border: 1px solid #eee !important;
              box-shadow: none !important;
              background-color: #fff !important;
            }
          }
        `}
      </style>
      <div className="flex flex-col h-[70vh] max-h-[600px]">
        {isComplete ? (
          <main className="flex-1 p-2 overflow-y-auto bg-gray-100 rounded-lg">
             <div className="p-6 printable-itinerary">
                <div className="text-center mb-10 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-indigo-100/50 to-purple-100/50 rounded-2xl -z-10"></div>
                    <div className="py-8 px-6">
                        <div className="flex items-center justify-center mb-4">
                            <span className="text-4xl mr-3">🏝️</span>
                            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                제주 맞춤 여행일정
                            </h2>
                            <span className="text-4xl ml-3">✨</span>
                        </div>
                        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full mb-4"></div>
                        <p className="text-gray-600 text-lg font-medium">AI가 당신만을 위해 특별히 제작한 여행 계획</p>
                        <p className="text-gray-500 text-sm mt-2">🎯 맞춤형 추천 • 🗺️ 최적 동선 • 💎 숨은 명소</p>
                    </div>
                </div>
                <FormattedMessageContent content={finalItinerary || ''} />
             </div>
             <div ref={messagesEndRef} />
          </main>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* 여행 아이템들이 돌아가는 애니메이션 */}
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 animate-spin">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                  <span className="text-2xl">✈️</span>
                </div>
                <div className="absolute top-1/2 right-0 transform translate-x-1 -translate-y-1/2">
                  <span className="text-2xl">🏖️</span>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1">
                  <span className="text-2xl">🍴</span>
                </div>
                <div className="absolute top-1/2 left-0 transform -translate-x-1 -translate-y-1/2">
                  <span className="text-2xl">🏨</span>
                </div>
              </div>
              <div className="absolute inset-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">🧠</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">AI가 여행 일정을 만들고 있어요</h3>
              <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-gray-600 max-w-md">
                당신의 취향과 선호도를 분석하여<br/>
                <span className="font-semibold text-blue-600">완벽한 제주 여행 계획</span>을 생성하고 있습니다
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">진행상황</span>
                <span className="text-sm font-bold text-indigo-600">{currentStep + 1} / {MAX_POSSIBLE_STEPS}</span>
              </div>
              <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${((currentStep + 1) / MAX_POSSIBLE_STEPS) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
            <main className="flex-1 p-4 overflow-y-auto">
              {renderCurrentStep()}
            </main>
          </>
        )}
        
        <footer className="pt-4 border-t no-print">
          {isComplete ? (
            <div className="flex items-center space-x-3">
              <Button onClick={resetState} fullWidth variant="secondary">새로운 일정 만들기</Button>
              <Button onClick={() => window.print()} fullWidth>PDF로 다운로드</Button>
            </div>
          ) : !isLoading && (
            <div className="flex items-center justify-between">
              <Button onClick={handleBack} variant="secondary" disabled={currentStep === 0}>이전</Button>
              {error && <p className="text-sm text-red-500 mx-2 text-center flex-1">{error}</p>}
              <Button onClick={handleNext}>
                  {STEPS[currentStep] === 'summary' ? '일정 생성하기' : '다음'}
              </Button>
            </div>
          )}
        </footer>
      </div>
    </Modal>
  );
};

export default TripPlannerModal;
