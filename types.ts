// FIX: Removed self-import of types to resolve declaration conflicts.
// A virtual representation of Firestore's Geopoint
export interface Geopoint {
  latitude: number;
  longitude: number;
}

// 사용자 위치 정보 타입
export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

// A virtual representation of Firestore's Timestamp
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface ImageInfo {
  url: string;
  caption: string;
  file?: File; // For local preview before upload
}

export interface Attributes {
  targetAudience: string[];
  recommendedSeasons: string[];
  withKids: string;
  withPets: string;
  parkingDifficulty: string;
  admissionFee: string;
  recommended_time_of_day?: string[];
  rainy_day_friendly?: boolean;
  is_hidden_gem?: boolean;
}

export interface CategorySpecificInfo {
  signatureMenu?: string;
  priceRange?: string;
  difficulty?: string;
}

// 숙소 전용 정보
export interface AccommodationInfo {
  accommodation_type: "호텔" | "리조트" | "게스트하우스" | "펜션" | "모텔" | "스테이" | "기타";
  price_range: "5만원 전후" | "10만원 전후" | "20만원 이상";
  view_type: "바다뷰" | "먼바다뷰" | "중산간";
  region: string; // 권역 정보
  kid_friendly: "가능" | "불가" | "연령제한";
  pet_friendly: "가능" | "불가" | "일부가능";
  breakfast_included: "제공" | "미제공" | "유료";
  check_in_time: string; // 예: "15:00"
  check_out_time: string; // 예: "11:00"
  google_maps_url?: string; // 구글 맵 링크
}

// 축제 및 행사 전용 정보
export interface EventInfo {
  event_type: "축제" | "공연" | "전시" | "문화행사" | "체험행사" | "기타";
  start_date?: string; // ISO 날짜 또는 "매년 3월"
  end_date?: string; // ISO 날짜 또는 "매년 3월"
  seasons?: string[]; // ["봄", "여름", "가을", "겨울"]
  months?: string[]; // ["1월", "2월", "3월", ...]
  is_annual: boolean; // 연례 행사 여부
  admission_fee?: string; // 입장료 정보
  reservation_required: boolean; // 예약 필요 여부
  target_audience?: string[]; // 대상 (가족, 연인, 친구 등)
  event_scale: "소규모" | "중규모" | "대규모"; // 행사 규모
  duration_days?: number; // 행사 기간 (일 수)
}

// 관심사 매핑을 위한 새로운 인터페이스들
export interface ViewInfo {
  ocean_view: boolean;
  mountain_view: boolean;
  city_view: boolean;
  nature_view: boolean;
}

export interface ShoppingInfo {
  has_souvenirs: boolean;
  has_local_products: boolean;
  has_fashion: boolean;
  shopping_type?: "대형몰" | "로컬샵" | "전통시장" | "아울렛" | "기타";
}

export interface CulturalInfo {
  historical_significance: boolean;
  cultural_experience: boolean;
  traditional_elements: boolean;
  modern_culture: boolean;
}

export interface ActivityInfo {
  activity_level: "휴식중심" | "가벼운활동" | "활동적" | "매우활동적";
  walking_required: boolean;
  physical_difficulty: "쉬움" | "보통" | "어려움";
  suitable_for_kids: boolean;
  suitable_for_elderly: boolean;
}

export interface TrendInfo {
  trend_status: "클래식" | "꾸준인기" | "요즘핫플" | "숨은명소";
  popularity_level: "한적함" | "보통" | "인기" | "매우인기";
  sns_hotspot: boolean;
  instagram_worthy: boolean;
}

export interface Comment {
  type: string;
  content: string;
}

export interface LinkedSpot {
  link_type: string;
  place_id: string;
  place_name: string;
}

export interface PublicInfo {
    operating_hours?: string;
    phone_number?: string;
    website_url?: string;
    closed_days?: string[];
    is_old_shop?: boolean;
}

export interface Suggestion {
  id: string;
  author: string;
  content: string;
  createdAt: Timestamp;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface EditLog {
    fieldPath: string;
    previousValue: any;
    newValue: any;
    acceptedBy: string;
    acceptedAt: Timestamp;
    suggestionId: string;
}


// 스팟 최신 업데이트 정보
export interface LatestUpdate {
  news_id: string;           // 연결된 뉴스 ID
  title: string;             // 업데이트 제목
  content: string;           // 업데이트 내용
  updated_at: Timestamp;     // 업데이트 날짜
  images?: string[];         // 관련 이미지 URL
  category: 'seasonal' | 'event' | 'new_spot' | 'trending'; // 카테고리
}

export interface Place {
  place_id: string;
  place_name: string;
  creator_id?: string;
  status: 'draft' | 'published' | 'rejected' | 'stub';
  categories?: string[];
  address?: string | null;
  region?: string | null;
  location?: Geopoint | null;
  images?: ImageInfo[];
  attributes?: Attributes | null;
  average_duration_minutes?: number | null;
  category_specific_info?: CategorySpecificInfo | null;
  expert_tip_raw?: string;
  expert_tip_final?: string | null;
  comments?: Comment[] | null;
  linked_spots?: LinkedSpot[];
  created_at?: Timestamp;
  updated_at?: Timestamp;
  public_info?: PublicInfo | null;
  tags?: string[] | null;
  import_url?: string;

  // 관심사 매핑을 위한 새로운 필드들
  interest_tags?: string[] | null; // ["자연", "오션뷰", "핫플", "쇼핑", "박물관", "역사", "액티비티", "걷기"]
  view_info?: ViewInfo | null;
  shopping_info?: ShoppingInfo | null;
  cultural_info?: CulturalInfo | null;
  activity_info?: ActivityInfo | null;
  trend_info?: TrendInfo | null;

  // 숙소 전용 정보
  accommodation_info?: AccommodationInfo | null;

  // 축제/행사 전용 정보
  event_info?: EventInfo | null;

  // 최신 업데이트 정보 (뉴스 연계)
  latest_updates?: LatestUpdate[] | null;

  // For collaboration and versioning
  suggestions?: Record<string, Suggestion[]>;
  edit_history?: EditLog[];
}

export interface InitialFormData {
    categories: string[];
    spotName: string;
    spotDescription: string;
    importUrl: string;
}

export interface WeatherSource {
  id: string;
  youtubeUrl: string;
  title: string;
  apiKey: string;
  direction?: '동' | '서' | '남' | '북' | '중앙';
  keywords?: string[];
  latitude?: number;
  longitude?: number;
}

export interface WeatherCardData {
  status: 'analyzing' | 'capturing' | 'overlaying' | 'done';
  sourceTitle: string;
  imageUrl: string;
  youtubeUrl?: string; // 유튜브 영상 URL 추가
  // Dummy weather data for simulation
  weatherData: {
    temp: string;
    humidity: string;
    wind: string;
  };
}

// 오름 관련 타입들
export interface OroomImage {
  id: string;
  url: string;
  file?: File;
  description?: string;
}

export interface OroomData {
  id: string;
  name: string; // 오름이름
  address: string; // 주소
  latitude?: number; // GPS 위도
  longitude?: number; // GPS 경도
  difficulty: '쉬움' | '보통' | '어려움' | '매우어려움'; // 난이도
  mainSeasons: string[]; // 주요계절
  mainMonths: string[]; // 주요월
  roundTripTime: string; // 왕복소요시간
  summitView: '상' | '중' | '하'; // 정상뷰
  expertTip: string; // 전문가 팁 (등반 팁, 주의사항 등)
  nearbyAttractions: string[]; // 주변 가볼만한곳
  nameOrigin: string; // 이름유래

  // 사진 관련
  cardImage?: OroomImage; // 오름 카드 이미지 (세로형 카드, 1장)
  parkingImages: OroomImage[]; // 주차장 (최대 3장)
  entranceImages: OroomImage[]; // 탐방로입구 (최대 3장)
  trailImages: OroomImage[]; // 탐방로 (최대 5장)
  summitImages: OroomImage[]; // 정상뷰 (최대 3장)
  summitVideoUrl?: string; // 정상뷰 유튜브 영상

  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published';
}

export interface OroomInitialFormData {
  description: string; // AI가 분석할 오름 설명 텍스트
}

// 여행일정 AI용 고정 스팟 타입
export interface FixedSpot {
  name: string;
  lat: number;
  lng: number;
  address: string;
  placeId: string;
  type: 'accommodation' | 'restaurant' | 'attraction';
}

// 여행일정 생성 관련 타입들
export interface ItineraryRequest {
  // 기본 정보
  startDate: string; // ISO 날짜
  endDate: string; // ISO 날짜
  dailyTravelHours: number; // 하루 여행 시간 (예: 8시간)

  // 시작점과 목적지
  startPoint: SpotLocation; // 첫날 시작점 (제주공항 등)
  endPoint: SpotLocation; // 마지막날 도착점 (제주공항 등)
  accommodations?: AccommodationByDate[]; // 날짜별 숙소 정보

  // 사용자 선호 정보
  interests: string[]; // 관심사 태그들
  companions: string[]; // 동행자 (가족, 연인, 친구 등)
  pace: 'slow' | 'moderate' | 'fast'; // 여행 페이스
  budget: 'low' | 'medium' | 'high'; // 예산

  // 고정 방문지
  fixedSpots?: FixedSpot[]; // 필수 방문지

  // 추가 옵션
  preferRainyDay?: boolean; // 비오는날 추천 여부
  preferHiddenGems?: boolean; // 히든플레이스 선호
  avoidCrowds?: boolean; // 혼잡한 곳 회피
}

export interface SpotLocation {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  placeId?: string;
}

export interface AccommodationByDate {
  date: string; // ISO 날짜
  location: SpotLocation;
}

// 이동 코리도 (Phase 0)
export interface TravelCorridor {
  startPoint: SpotLocation;
  endPoint: SpotLocation;
  radiusKm: number; // 코리도 반경 (km)
  centerLine: {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
  };
}

// 후보 스팟 (Phase 1)
export interface CandidateSpot {
  place: Place; // DB의 Place 정보
  relevanceScore: number; // AI가 계산한 관련성 점수 (0-100)
  distanceFromCorridor: number; // 코리도 중심선으로부터 거리 (km)
  inCorridor: boolean; // 코리도 내부 여부
}

// 다음 스팟 결정을 위한 평가 결과 (Phase 2)
export interface SpotEvaluation {
  candidate: CandidateSpot;
  travelTimeMinutes: number; // 현재 위치에서 이동 시간
  directionScore: number; // 방향성 점수 (0-100)
  preferenceScore: number; // 선호도 점수 (0-100)
  isOpenNow: boolean; // 현재 시간 영업 여부
  isMandatory: boolean; // 필수 방문지 여부
  totalScore: number; // 최종 종합 점수
}

// 하루 일정의 방문지
export interface ItinerarySpot {
  spot: Place;
  arrivalTime: string; // HH:mm 형식
  departureTime: string; // HH:mm 형식
  durationMinutes: number; // 체류 시간
  travelTimeToNext?: number; // 다음 장소까지 이동 시간
  notes?: string; // 추가 메모
}

// 하루 일정
export interface DayPlan {
  date: string; // ISO 날짜
  dayNumber: number; // 여행 N일차
  startLocation: SpotLocation; // 시작점 (전날 숙소 or 공항)
  endLocation: SpotLocation; // 종료점 (당일 숙소 or 공항)
  spots: ItinerarySpot[]; // 방문 장소들
  totalTravelTimeMinutes: number; // 총 이동 시간
  totalActivityTimeMinutes: number; // 총 활동 시간
  corridor: TravelCorridor; // 당일 이동 코리도
}

// 최종 경로 정보 (Phase 3 - Directions API)
export interface RouteSegment {
  origin: SpotLocation;
  destination: SpotLocation;
  durationMinutes: number;
  distanceKm: number;
  steps: RouteStep[]; // 상세 길 안내
  polyline?: string; // 지도 표시용 폴리라인
}

export interface RouteStep {
  instruction: string; // "해안 도로를 따라 직진"
  distanceMeters: number;
  durationSeconds: number;
}

// 전체 여행 일정
export interface TravelItinerary {
  request: ItineraryRequest; // 원래 요청
  plans: DayPlan[]; // 날짜별 일정
  routes: RouteSegment[]; // 전체 경로 세그먼트들
  summary: {
    totalDays: number;
    totalSpots: number;
    totalTravelTimeMinutes: number;
    coverageRegions: string[]; // 방문하는 권역들
  };
  generatedAt: Date;
  aiStory?: string; // AI가 생성한 여행 스토리
}

// 뉴스/최신 소식 시스템
export interface NewsItem {
  id: string;
  type: 'new_spot' | 'update' | 'closure' | 'seasonal' | 'event' | 'trending' | 'menu_change' | 'price_change';
  title: string;
  content: string;
  published_at: Timestamp;
  expires_at?: Timestamp; // 계절성 소식은 만료일 설정

  // 관련 스팟 연결 (자동 적용)
  related_spot_ids: string[]; // 여러 스팟 연결 가능
  auto_apply_to_spot: boolean; // true면 스팟 상세에 자동 표시

  // 시각적 요소
  thumbnail_url?: string;
  badge?: '신규' | '인기' | '계절한정' | '마감임박' | '핫플' | '개화중' | '폐업' | '휴업';

  // 우선순위
  priority: number; // 1-10, 높을수록 상단 노출
  is_pinned: boolean; // 상단 고정

  // 챗봇용 메타데이터
  keywords?: string[]; // 챗봇이 검색할 키워드 (예: ["벚꽃", "개화", "새별오름"])
  season?: string; // 계절 정보
  month?: string; // 월 정보
  region?: string; // 지역 정보

  // 위치 정보 (연계 스팟의 GPS 정보)
  location?: Geopoint | null; // 대표 스팟의 GPS 좌표 (위치 기반 추천용)

  // 메타
  tags?: string[];
  author?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// CCTV 및 실시간 채팅 시스템
export interface CCTVSource {
  id: string;
  name: string; // CCTV 이름 (예: "성산일출봉 라이브")
  streamUrl: string; // HLS 스트리밍 URL
  location?: Geopoint; // GPS 좌표
  region?: string; // 지역 (예: "서귀포시", "제주시")
  description?: string; // 설명
  thumbnailUrl?: string; // 썸네일 이미지
  isActive: boolean; // 활성화 상태
  viewCount: number; // 조회수
  relatedSpotIds?: string[]; // 연관된 관광지 ID
  keywords?: string[]; // 검색 키워드 (AI 챗봇용)
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ChatMessage {
  id: string;
  cctvId: string; // 어느 CCTV 방의 메시지인지
  userId: string; // 사용자 ID (익명: "user_xxx")
  username: string; // 표시될 닉네임
  message: string; // 메시지 내용
  timestamp: Timestamp;
  type: 'user' | 'ai'; // 사용자 메시지 vs AI 응답
  isSlashCommand?: boolean; // 슬래시 명령어 여부
}

export interface CCTVChatRoom {
  cctvId: string;
  activeUsers: number; // 현재 접속자 수
  messages: ChatMessage[]; // 최근 메시지 (최대 100개)
  lastActivity: Timestamp;
}
