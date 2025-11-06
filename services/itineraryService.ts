/**
 * 여행 일정 생성 서비스
 * Phase 0: 동선 벡터 및 이동 코리도 생성
 */

import type {
  SpotLocation,
  TravelCorridor,
  CandidateSpot,
  Place,
} from '../types';

/**
 * Phase 0: 이동 코리도 생성
 * 시작점과 목적지를 잇는 직선 중심의 가상 복도를 설정
 */
export function createTravelCorridor(
  startPoint: SpotLocation,
  endPoint: SpotLocation,
  radiusKm: number = 12 // 기본 반경 12km
): TravelCorridor {
  return {
    startPoint,
    endPoint,
    radiusKm,
    centerLine: {
      lat1: startPoint.latitude,
      lng1: startPoint.longitude,
      lat2: endPoint.latitude,
      lng2: endPoint.longitude,
    },
  };
}

/**
 * 두 지점 간의 거리 계산 (Haversine formula)
 * @returns 거리 (km)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 점에서 선분까지의 최단 거리 계산
 * @returns 거리 (km)
 */
export function distanceFromPointToLine(
  point: { lat: number; lng: number },
  lineStart: { lat: number; lng: number },
  lineEnd: { lat: number; lng: number }
): number {
  // 벡터 계산을 위한 좌표
  const A = {
    lat: lineStart.lat,
    lng: lineStart.lng,
  };
  const B = {
    lat: lineEnd.lat,
    lng: lineEnd.lng,
  };
  const P = {
    lat: point.lat,
    lng: point.lng,
  };

  // AP와 AB의 내적
  const AB = {
    lat: B.lat - A.lat,
    lng: B.lng - A.lng,
  };
  const AP = {
    lat: P.lat - A.lat,
    lng: P.lng - A.lng,
  };

  const ab_ab = AB.lat * AB.lat + AB.lng * AB.lng;
  const ap_ab = AP.lat * AB.lat + AP.lng * AB.lng;

  // 투영 비율
  const t = Math.max(0, Math.min(1, ap_ab / ab_ab));

  // 선분 위의 가장 가까운 점
  const closestPoint = {
    lat: A.lat + t * AB.lat,
    lng: A.lng + t * AB.lng,
  };

  // 점과 가장 가까운 점 사이의 거리
  return calculateDistance(P.lat, P.lng, closestPoint.lat, closestPoint.lng);
}

/**
 * 스팟이 코리도 내부에 있는지 확인
 */
export function isInCorridor(
  spot: { latitude: number; longitude: number },
  corridor: TravelCorridor
): boolean {
  const distance = distanceFromPointToLine(
    { lat: spot.latitude, lng: spot.longitude },
    { lat: corridor.centerLine.lat1, lng: corridor.centerLine.lng1 },
    { lat: corridor.centerLine.lat2, lng: corridor.centerLine.lng2 }
  );

  return distance <= corridor.radiusKm;
}

/**
 * 코리도 필터링: 후보 스팟들 중 코리도 내부에 있는 것만 반환
 */
export function filterSpotsByCorridor(
  places: Place[],
  corridor: TravelCorridor
): CandidateSpot[] {
  return places
    .filter((place) => place.location) // 위치 정보가 있는 것만
    .map((place) => {
      const distance = distanceFromPointToLine(
        { lat: place.location!.latitude, lng: place.location!.longitude },
        { lat: corridor.centerLine.lat1, lng: corridor.centerLine.lng1 },
        { lat: corridor.centerLine.lat2, lng: corridor.centerLine.lng2 }
      );

      return {
        place,
        relevanceScore: 0, // AI가 나중에 계산
        distanceFromCorridor: distance,
        inCorridor: distance <= corridor.radiusKm,
      };
    })
    .filter((candidate) => candidate.inCorridor);
}

/**
 * 방향성 점수 계산
 * 현재 위치에서 스팟으로 이동하는 것이 최종 목적지 방향으로 얼마나 효율적인지 평가
 * @returns 0-100 점수 (높을수록 좋음)
 */
export function calculateDirectionScore(
  currentLocation: SpotLocation,
  candidateSpot: SpotLocation,
  finalDestination: SpotLocation
): number {
  // 현재 위치 -> 목적지 직선 거리
  const directDistance = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    finalDestination.latitude,
    finalDestination.longitude
  );

  // 현재 위치 -> 후보 스팟 거리
  const distanceToSpot = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    candidateSpot.latitude,
    candidateSpot.longitude
  );

  // 후보 스팟 -> 목적지 거리
  const spotToDestination = calculateDistance(
    candidateSpot.latitude,
    candidateSpot.longitude,
    finalDestination.latitude,
    finalDestination.longitude
  );

  // 전진 거리: 현재에서 목적지까지의 거리 - 스팟에서 목적지까지의 거리
  const progress = directDistance - spotToDestination;

  // 우회 거리: (현재->스팟 + 스팟->목적지) - 현재->목적지
  const detour = distanceToSpot + spotToDestination - directDistance;

  // 역방향인 경우 (목적지로부터 더 멀어지는 경우)
  if (progress < 0) {
    return 0;
  }

  // 전진 효율성 계산
  // 전진 거리 대비 우회 거리 비율
  const efficiency = detour <= 0 ? 100 : Math.max(0, 100 - (detour / directDistance) * 100);

  // 전진 비율 (얼마나 목적지에 가까워지는가)
  const progressRatio = (progress / directDistance) * 100;

  // 최종 점수: 전진 효율성 70% + 전진 비율 30%
  return Math.min(100, efficiency * 0.7 + progressRatio * 0.3);
}

/**
 * Phase 2: 다음 방문 스팟 결정
 * AI 점수 + 방향성 점수 + 이동 시간 + 영업시간 등을 종합하여 최적의 다음 스팟 선정
 */
import type { SpotEvaluation, ItineraryRequest } from '../types';
import { getDistanceMatrix } from './googleMapsService';

export interface NextSpotDecisionRequest {
  currentLocation: SpotLocation;
  finalDestination: SpotLocation;
  candidateSpots: CandidateSpot[]; // AI가 이미 점수를 매긴 후보들
  currentTime: Date; // 현재 시간 (영업시간 체크용)
  maxTravelTimeMinutes: number; // 최대 허용 이동 시간 (예: 40분)
  fixedSpotIds?: string[]; // 필수 방문지 ID들
  lastVisitedCategory?: string; // 직전 방문 카테고리 (식사 후 카페 로직용)
}

/**
 * 영업시간 체크 (간단 버전)
 */
function isSpotOpenAt(spot: Place, time: Date): boolean {
  // operating_hours가 없으면 항상 오픈으로 간주
  if (!spot.public_info?.operating_hours) {
    return true;
  }

  // TODO: 실제로는 operating_hours 문자열 파싱 필요
  // 여기서는 간단히 true 반환
  return true;
}

/**
 * 시간대별 선호 카테고리 정의
 */
interface TimeSlotPreference {
  startHour: number;
  endHour: number;
  preferredCategories: string[];
  avoidCategories?: string[];
  description: string;
}

const TIME_BASED_PREFERENCES: TimeSlotPreference[] = [
  {
    startHour: 9,
    endHour: 11,
    preferredCategories: ['관광지', '자연', '오름', '포토존', '박물관'],
    avoidCategories: ['맛집', '카페'],
    description: '오전 - 관광/자연 활동',
  },
  {
    startHour: 11,
    endHour: 13,
    preferredCategories: ['맛집', '식당'],
    avoidCategories: ['카페'],
    description: '점심시간 - 식사',
  },
  {
    startHour: 13,
    endHour: 15,
    preferredCategories: ['카페', '디저트'],
    avoidCategories: ['맛집', '식당'],
    description: '식후 - 카페/디저트',
  },
  {
    startHour: 15,
    endHour: 17,
    preferredCategories: ['관광지', '포토존', '쇼핑', '자연'],
    avoidCategories: ['맛집'],
    description: '오후 - 관광/쇼핑',
  },
  {
    startHour: 17,
    endHour: 19,
    preferredCategories: ['일몰명소', '포토존', '해변', '카페'],
    avoidCategories: [],
    description: '일몰시간 - 경치 감상',
  },
  {
    startHour: 19,
    endHour: 21,
    preferredCategories: ['맛집', '식당'],
    avoidCategories: ['카페', '관광지'],
    description: '저녁시간 - 저녁식사',
  },
  {
    startHour: 21,
    endHour: 23,
    preferredCategories: ['야경', '술집', '바'],
    avoidCategories: ['관광지', '오름'],
    description: '저녁 늦은시간 - 야경/바',
  },
];

/**
 * 현재 시간에 맞는 시간대 선호도 가져오기
 */
function getTimeSlotPreference(time: Date): TimeSlotPreference | null {
  const hour = time.getHours();

  for (const pref of TIME_BASED_PREFERENCES) {
    if (hour >= pref.startHour && hour < pref.endHour) {
      return pref;
    }
  }

  return null;
}

/**
 * 시간대별 카테고리 적합도 점수 계산
 * @returns 0-30 점수
 */
function calculateTimeCategoryScore(
  spot: Place,
  currentTime: Date,
  lastVisitedCategory?: string
): number {
  const timeSlot = getTimeSlotPreference(currentTime);

  if (!timeSlot || !spot.categories || spot.categories.length === 0) {
    return 15; // 중립 점수
  }

  let score = 0;

  // 선호 카테고리와 일치하는지 확인
  const hasPreferredCategory = spot.categories.some((cat) =>
    timeSlot.preferredCategories.some((pref) => cat.includes(pref))
  );

  if (hasPreferredCategory) {
    score += 30; // 최대 점수
  } else {
    score += 10; // 기본 점수
  }

  // 회피 카테고리인지 확인
  const hasAvoidCategory = spot.categories.some((cat) =>
    timeSlot.avoidCategories?.some((avoid) => cat.includes(avoid))
  );

  if (hasAvoidCategory) {
    score -= 20; // 페널티
  }

  // 연속된 같은 카테고리 방지 (맛집 -> 맛집 X, 카페 -> 카페 X)
  if (lastVisitedCategory && spot.categories.includes(lastVisitedCategory)) {
    score -= 10;
  }

  // 식사 후 카페 보너스 로직
  if (lastVisitedCategory?.includes('맛집') || lastVisitedCategory?.includes('식당')) {
    const timeSinceLastVisit = currentTime.getHours();
    if (timeSinceLastVisit >= 13 && timeSinceLastVisit < 15) {
      // 13-15시 사이에 카페 방문 시 보너스
      if (spot.categories.some((cat) => cat.includes('카페'))) {
        score += 15; // 식후 카페 보너스
      }
    }
  }

  return Math.max(0, Math.min(30, score)); // 0-30 범위로 제한
}

/**
 * 다음 방문할 최적의 스팟 결정
 */
export async function selectNextSpot(
  request: NextSpotDecisionRequest
): Promise<SpotEvaluation | null> {
  const {
    currentLocation,
    finalDestination,
    candidateSpots,
    currentTime,
    maxTravelTimeMinutes,
    fixedSpotIds = [],
  } = request;

  if (candidateSpots.length === 0) {
    return null;
  }

  // 1단계: Distance Matrix API로 모든 후보까지의 실제 이동 시간 계산
  console.log(`📍 현재 위치에서 ${candidateSpots.length}개 후보까지 이동시간 계산 중...`);

  const destinations = candidateSpots.map((c) => ({
    name: c.place.place_name,
    latitude: c.place.location!.latitude,
    longitude: c.place.location!.longitude,
  }));

  const distanceResults = await getDistanceMatrix({
    origins: [currentLocation],
    destinations,
    departureTime: currentTime,
  });

  // 2단계: 각 후보 스팟 평가
  const evaluations: SpotEvaluation[] = [];

  for (let i = 0; i < candidateSpots.length; i++) {
    const candidate = candidateSpots[i];
    const distanceResult = distanceResults[i];
    const travelTime = distanceResult.durationMinutes;

    // 필터 1: 방향성 확인
    const directionScore = calculateDirectionScore(
      currentLocation,
      {
        name: candidate.place.place_name,
        latitude: candidate.place.location!.latitude,
        longitude: candidate.place.location!.longitude,
      },
      finalDestination
    );

    // 역방향인 경우 즉시 탈락
    if (directionScore < 20) {
      continue;
    }

    // 필터 2: 이동 시간 확인
    if (travelTime > maxTravelTimeMinutes) {
      continue;
    }

    // 필터 3: 영업시간 확인
    const isOpen = isSpotOpenAt(candidate.place, currentTime);

    // 필수 방문지 여부
    const isMandatory = fixedSpotIds.includes(candidate.place.place_id);

    // 시간대별 카테고리 적합도 점수 (새로 추가!)
    const timeCategoryScore = calculateTimeCategoryScore(
      candidate.place,
      currentTime,
      request.lastVisitedCategory
    );

    // 최종 점수 계산
    // - AI 관련성 점수 (30%) - 비중 감소
    // - 방향성 점수 (25%) - 비중 감소
    // - 이동 효율 점수 (15%): 이동 시간이 짧을수록 높음
    // - 시간대 적합도 점수 (20%): 새로 추가! 시간대에 맞는 카테고리 보너스
    // - 영업 중 보너스 (10%)
    const travelEfficiency = Math.max(
      0,
      100 - (travelTime / maxTravelTimeMinutes) * 100
    );
    const openBonus = isOpen ? 10 : 0;

    let totalScore =
      candidate.relevanceScore * 0.3 +
      directionScore * 0.25 +
      travelEfficiency * 0.15 +
      timeCategoryScore * 0.2 +
      openBonus;

    // 필수 방문지는 최우선
    if (isMandatory) {
      totalScore += 50;
    }

    // 디버깅용 로그
    const timeSlot = getTimeSlotPreference(currentTime);
    if (timeSlot) {
      console.log(
        `  📊 ${candidate.place.place_name}: 총점=${totalScore.toFixed(1)} (AI=${candidate.relevanceScore}, 방향=${directionScore.toFixed(1)}, 시간대=${timeCategoryScore}) [${timeSlot.description}]`
      );
    }

    const evaluation: SpotEvaluation = {
      candidate,
      travelTimeMinutes: travelTime,
      directionScore,
      preferenceScore: candidate.relevanceScore,
      isOpenNow: isOpen,
      isMandatory,
      totalScore,
    };

    evaluations.push(evaluation);
  }

  // 점수순 정렬
  evaluations.sort((a, b) => b.totalScore - a.totalScore);

  console.log(
    `✅ ${evaluations.length}개 후보 평가 완료. 최고점: ${evaluations[0]?.totalScore.toFixed(1)}점`
  );

  // 최고 점수 스팟 반환
  return evaluations.length > 0 ? evaluations[0] : null;
}

/**
 * 전체 여행 일정 생성 (모든 Phase 통합)
 */
import type {
  ItineraryRequest,
  TravelItinerary,
  DayPlan,
  ItinerarySpot,
} from '../types';
import { scoreCandidateSpots } from './geminiService';
import { getDirections } from './googleMapsService';

export async function generateItinerary(
  request: ItineraryRequest,
  allPlaces: Place[] // Firestore에서 가져온 전체 스팟 DB
): Promise<TravelItinerary> {
  console.log('🚀 여행 일정 생성 시작');

  const plans: DayPlan[] = [];
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // 날짜별로 일정 생성
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + dayIndex);

    console.log(`\n📅 ${dayIndex + 1}일차 (${currentDate.toLocaleDateString('ko-KR')})`);

    // Phase 0: 이동 코리도 설정
    const startLocation =
      dayIndex === 0
        ? request.startPoint
        : request.accommodations?.[dayIndex - 1]?.location || request.startPoint;

    const endLocation =
      dayIndex === totalDays - 1
        ? request.endPoint
        : request.accommodations?.[dayIndex]?.location || request.endPoint;

    const corridor = createTravelCorridor(startLocation, endLocation);
    console.log(
      `🛣️ 코리도 생성: ${startLocation.name} → ${endLocation.name} (반경 ${corridor.radiusKm}km)`
    );

    // Phase 1: 코리도 내부 스팟 필터링
    const spotsInCorridor = filterSpotsByCorridor(allPlaces, corridor);
    console.log(`✅ 코리도 내부 스팟: ${spotsInCorridor.length}개`);

    // AI로 점수 매기기
    const spotScores = await scoreCandidateSpots(
      spotsInCorridor.map((c) => c.place),
      {
        interests: request.interests,
        companions: request.companions,
        pace: request.pace,
        budget: request.budget,
        preferRainyDay: request.preferRainyDay,
        preferHiddenGems: request.preferHiddenGems,
        avoidCrowds: request.avoidCrowds,
        fixedSpotNames: request.fixedSpots?.map((s) => s.name),
      }
    );

    // 점수를 CandidateSpot에 반영
    spotsInCorridor.forEach((candidate) => {
      const score = spotScores.find(
        (s) => s.place_id === candidate.place.place_id
      );
      if (score) {
        candidate.relevanceScore = score.relevanceScore;
      }
    });

    // 점수순 정렬
    spotsInCorridor.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Phase 2: 하루 일정 채우기 (반복)
    const daySpots: ItinerarySpot[] = [];
    let currentLocation = startLocation;
    let currentTime = new Date(currentDate);
    currentTime.setHours(9, 0, 0, 0); // 오전 9시 시작
    let remainingCandidates = [...spotsInCorridor];
    let totalTravelTime = 0;
    let totalActivityTime = 0;
    let lastVisitedCategory: string | undefined; // 직전 방문 카테고리 추적

    while (
      totalTravelTime + totalActivityTime < request.dailyTravelHours * 60 &&
      remainingCandidates.length > 0
    ) {
      const nextSpotEval = await selectNextSpot({
        currentLocation,
        finalDestination: endLocation,
        candidateSpots: remainingCandidates,
        currentTime,
        maxTravelTimeMinutes: 40,
        fixedSpotIds: request.fixedSpots?.map((s) => s.placeId),
        lastVisitedCategory, // 직전 카테고리 전달
      });

      if (!nextSpotEval) {
        console.log('⚠️ 더 이상 추천할 스팟이 없습니다.');
        break;
      }

      // 스팟 추가
      const spot = nextSpotEval.candidate.place;
      const travelTime = nextSpotEval.travelTimeMinutes;
      const stayDuration = spot.average_duration_minutes || 60; // 기본 1시간

      const arrivalTime = new Date(currentTime);
      arrivalTime.setMinutes(arrivalTime.getMinutes() + travelTime);

      const departureTime = new Date(arrivalTime);
      departureTime.setTime(departureTime.getTime() + stayDuration * 60 * 1000);

      daySpots.push({
        spot,
        arrivalTime: arrivalTime.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        departureTime: departureTime.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        durationMinutes: stayDuration,
        travelTimeToNext: travelTime,
      });

      console.log(
        `  ✅ ${daySpots.length}. ${spot.place_name} (도착: ${arrivalTime.toLocaleTimeString('ko-KR')}, 체류: ${stayDuration}분)`
      );

      // 상태 업데이트
      currentLocation = {
        name: spot.place_name,
        latitude: spot.location!.latitude,
        longitude: spot.location!.longitude,
      };
      currentTime = departureTime;
      totalTravelTime += travelTime;
      totalActivityTime += stayDuration;

      // 직전 방문 카테고리 업데이트 (식사 후 카페 로직용)
      if (spot.categories && spot.categories.length > 0) {
        lastVisitedCategory = spot.categories[0]; // 첫 번째 카테고리 사용
      }

      // 방문한 스팟은 후보에서 제거
      remainingCandidates = remainingCandidates.filter(
        (c) => c.place.place_id !== spot.place_id
      );
    }

    // DayPlan 생성
    const dayPlan: DayPlan = {
      date: currentDate.toISOString(),
      dayNumber: dayIndex + 1,
      startLocation,
      endLocation,
      spots: daySpots,
      totalTravelTimeMinutes: totalTravelTime,
      totalActivityTimeMinutes: totalActivityTime,
      corridor,
    };

    plans.push(dayPlan);
  }

  // Phase 3: 전체 경로 생성 (Directions API)
  console.log('\n🗺️ 전체 경로 상세 정보 생성 중...');
  const allWaypoints: SpotLocation[] = [];

  for (const plan of plans) {
    allWaypoints.push(plan.startLocation);
    for (const spot of plan.spots) {
      allWaypoints.push({
        name: spot.spot.place_name,
        latitude: spot.spot.location!.latitude,
        longitude: spot.spot.location!.longitude,
      });
    }
  }
  allWaypoints.push(plans[plans.length - 1].endLocation);

  const routes = await getDirections({ waypoints: allWaypoints });

  // 최종 여행 일정 객체 생성
  const itinerary: TravelItinerary = {
    request,
    plans,
    routes,
    summary: {
      totalDays,
      totalSpots: plans.reduce((sum, p) => sum + p.spots.length, 0),
      totalTravelTimeMinutes: plans.reduce(
        (sum, p) => sum + p.totalTravelTimeMinutes,
        0
      ),
      coverageRegions: [
        ...new Set(
          plans.flatMap((p) =>
            p.spots.map((s) => s.spot.region).filter(Boolean)
          )
        ),
      ] as string[],
    },
    generatedAt: new Date(),
  };

  console.log('\n✅ 여행 일정 생성 완료!');
  console.log(`📊 총 ${itinerary.summary.totalDays}일, ${itinerary.summary.totalSpots}개 스팟`);

  return itinerary;
}