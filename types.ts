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
  categories_kr?: string[];  // 한글 카테고리 ["카페", "맛집", "관광지"]
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

  // 데이터 완성도 표시
  data_completeness?: 'full' | 'partial' | 'basic';  // full: 모든 상세 필드, partial: 일부, basic: 기본만

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
  titleEng?: string;
  titleChn?: string;
  shortTitle?: string; // 모바일용 간략 별칭
  apiKey: string;
  direction?: '동부' | '서부' | '남부' | '북부';
  keywords?: string[];
  latitude?: number;
  longitude?: number;
  showInCamChat?: boolean; // Cam & Chat 페이지에 표시 여부
}

export interface Doodle {
  id: string;
  text?: string;
  type: 'speech' | 'thought' | 'shout' | 'drawing' | 'coupon';
  color: string;
  createdAt: number;
  imageData?: string; // base64 인코딩된 이미지 데이터 (drawing 타입용)
  duration: number; // 지속 시간 (밀리초)
  sessionId: string; // 작성자 세션 ID
  position?: { left: number; top: number }; // 말풍선 위치 (%)
  widthPercent?: number; // 말풍선 크기 - 화면 너비 대비 비율 (%, 기본값 15)

  // 쿠폰 전용 필드
  couponTitle?: string; // 쿠폰 제목
  couponDescription?: string; // 쿠폰 설명
  storeName?: string; // 매장명
  storeAddress?: string; // 매장 주소
  maxClaims?: number; // 최대 발급 개수
  claimedBy?: string[]; // 쿠폰을 받아간 세션 ID 목록
}

export interface DoodleCreateData {
  text?: string;
  type: 'speech' | 'thought' | 'shout' | 'drawing' | 'coupon';
  color: string;
  imageData?: string;
  duration: number;

  // 쿠폰 전용 필드
  couponTitle?: string;
  couponDescription?: string;
  storeName?: string;
  storeAddress?: string;
  maxClaims?: number;
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
  replyTo?: string; // 답글 대상 메시지 ID (KakaoTalk 스타일)
  replyToUsername?: string; // 답글 대상 사용자 닉네임
  replyToMessage?: string; // 답글 대상 메시지 내용 (미리보기용)
  hidden?: boolean; // 관리자에 의해 숨김 처리됨
  deletedBy?: string; // 삭제한 관리자 ID (삭제 시)
  pointBoxId?: string; // 포인트 박스 ID (type이 'pointbox'일 때)
}

export interface ChatArchive {
  id: string;
  startTime: Timestamp; // 24시간 시작 시간
  endTime: Timestamp; // 24시간 종료 시간
  messageCount: number; // 총 메시지 수
  summary: string; // AI 생성 요약
  txtFileUrl: string; // Firebase Storage txt 파일 URL
  createdAt: Timestamp;
}

export interface CCTVChatRoom {
  cctvId: string;
  activeUsers: number; // 현재 접속자 수
  messages: ChatMessage[]; // 최근 메시지 (최대 100개)
  lastActivity: Timestamp;
}

// Feed 관련 타입
export interface FeedMediaExif {
  latitude?: number;
  longitude?: number;
  dateTime?: string; // EXIF 날짜/시간 (포맷된 문자열)
  rawDateTime?: string; // EXIF 원본 날짜/시간 (24시간 보너스 체크용)
  camera?: string; // 카메라 모델
  location?: string; // 역지오코딩된 위치 이름
  // 상세 촬영 정보
  fNumber?: string; // 조리개 (f/2.8)
  iso?: number; // ISO
  exposureTime?: string; // 셔터스피드 (1/60)
  focalLength?: string; // 초점거리 (50mm)
}

export interface FeedMedia {
  id: string;
  type: 'image' | 'video';
  url: string; // Firebase Storage URL
  thumbnailUrl?: string; // 썸네일 URL (비디오용)
  exif: FeedMediaExif;
  width?: number;
  height?: number;
}

export interface FeedComment {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Timestamp;
}

export interface FeedPost {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string; // 최대 300자
  media: FeedMedia[]; // 이미지 최대 5개, 비디오 1개
  timestamp: Timestamp;
  createdAt: Timestamp;
  likes: number;
  comments: number;
  bookmarks: number; // 찜 개수
  likedBy?: string[]; // 좋아요 누른 사용자 ID 목록
  bookmarkedBy?: string[]; // 찜한 사용자 ID 목록
  commentList?: FeedComment[]; // 댓글 목록
  feedType?: 'live' | 'cctv'; // 피드 타입
  // GPS 기반 추천 장소
  nearbySpots?: {
    id: string;
    title: string;
    thumbnailUrl: string;
    distance: number; // 미터 단위
  }[];
}

// 사용자 역할 타입
export type UserRole = 'user' | 'store' | 'admin';

// 사용자 프로필 인터페이스
export interface UserProfile {
  uid: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole; // 사용자 역할

  // 매장 정보 (role이 'store'일 때)
  businessNumber?: string; // 사업자 번호
  businessName?: string; // 상호명
  businessAddress?: string; // 사업장 주소
  businessPhone?: string; // 연락처
  businessApproved?: boolean; // 관리자 승인 여부
  businessApprovedAt?: Timestamp; // 승인 날짜
  businessApprovedBy?: string; // 승인한 관리자 UID

  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // 통계
  feedCount?: number; // 작성한 피드 수
  couponIssuedCount?: number; // 발급한 쿠폰 수

  // 포인트 시스템
  points?: number; // 현재 보유 포인트
  totalEarnedPoints?: number; // 총 획득 포인트
  totalSpentPoints?: number; // 총 사용 포인트
}

// 포인트 로그 타입
export type PointLogType =
  | 'feed_photo'           // 피드 사진 등록
  | 'feed_video'           // 피드 동영상 등록
  | 'feed_24h_bonus'       // 24시간 내 촬영 보너스
  | 'cctv_capture_bonus'   // CCTV 캡처 인증 보너스
  | 'chat_pointbox'        // 채팅 포인트 박스에서 획득
  | 'chat_award_1st'       // 채팅 우수자 1등
  | 'chat_award_2nd'       // 채팅 우수자 2등
  | 'chat_award_3rd'       // 채팅 우수자 3등
  | 'point_spend'          // 포인트 사용
  | 'admin_grant'          // 관리자 지급
  | 'admin_deduct';        // 관리자 차감

// 포인트 로그 인터페이스
export interface PointLog {
  id: string;
  userId: string;
  type: PointLogType;
  amount: number; // 양수: 획득, 음수: 사용
  balance: number; // 변경 후 잔액
  description: string;
  relatedId?: string; // 관련 피드 ID, 채팅 ID 등
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Timestamp;
}

// 채팅 포인트 박스 인터페이스
export interface PointBox {
  id: string;
  creatorId: string; // 생성자 UID
  creatorName: string;
  totalPoints: number; // 총 포인트 양
  remainingPoints: number; // 남은 포인트
  maxClaims: number; // 최대 수령 인원
  claimedCount: number; // 현재 수령 인원
  claimedBy: string[]; // 수령한 사용자 UID 목록
  distributionType: 'equal' | 'random'; // 균등 분배 / 랜덤 분배
  isActive: boolean; // 활성 상태
  createdAt: Timestamp;
  expiredAt: Timestamp; // 만료 시간 (24시간 후 자동 만료)
}

// 포인트 지급 위치 기록 (중복 방지용)
export interface PointLocationRecord {
  id: string;
  userId: string;
  type: 'photo' | 'video';
  latitude: number;
  longitude: number;
  feedId: string;
  createdAt: Timestamp;
}

// 쿠폰 인터페이스 (Firestore 저장용)
export interface Coupon {
  id: string;
  type: 'coupon';
  videoId: string; // 연결된 CCTV 영상 ID

  // 쿠폰 정보
  couponTitle: string;
  couponDescription: string;
  storeName: string;
  storeAddress: string;

  // 발급 정보
  maxClaims: number; // 최대 발급 개수
  claimedBy: string[]; // 쿠폰을 받아간 사용자 UID 목록

  // 발행자 정보
  issuedBy: string; // 발행자 UID (store 또는 admin)
  issuerName: string; // 발행자 이름

  // 시간 정보
  createdAt: number;
  expiresAt: number; // 만료 시간
  duration: number; // 지속 시간 (밀리초)

  // 메타데이터
  color: string;
  sessionId: string; // 레거시 호환용
}

// 사용자가 받은 쿠폰 (Firestore 저장용)
export interface UserCoupon {
  id: string; // 쿠폰 ID (Coupon의 id와 동일)
  userId: string; // 사용자 UID
  couponTitle: string;
  couponDescription: string;
  storeName: string;
  storeAddress: string;

  // 수령 정보
  claimedAt: Timestamp;

  // 사용 정보
  used: boolean;
  usedAt?: Timestamp;
  usedLocation?: string; // 사용한 매장 위치 (선택)

  // 발행자 정보
  issuedBy: string; // 발행자 UID
  issuerName: string;

  // 원본 쿠폰 정보 (참조용)
  videoId: string;
  expiresAt: number;
}
