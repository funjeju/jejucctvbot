import React from 'react';

export const CATEGORIES = [
  "오름", "바다", "숲길", "올레길", "관광지",
  "포토존", "식당", "카페", "체험", "꽃", "역사문화", "숙소", "히든플레이스", "축제 및 행사"
];

export const TARGET_AUDIENCE_GROUPS: Record<string, string[]> = {
  "기본": ["누구나"],
  "관계": ["가족", "연인", "친구", "나홀로", "부모님"],
  "연령": ["아이", "10대", "20대", "30대", "40-50대", "60대 이상"]
};
export const TARGET_AUDIENCE_OPTIONS = Object.values(TARGET_AUDIENCE_GROUPS).flat();

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
export const RECOMMENDED_SEASONS_GROUPS: Record<string, string[]> = {
    "기본": ["아무때나"],
    "계절": ["봄", "여름", "가을", "겨울"],
    "월": MONTH_OPTIONS,
};
export const RECOMMENDED_SEASONS_OPTIONS = Object.values(RECOMMENDED_SEASONS_GROUPS).flat();


export const WITH_KIDS_OPTIONS = ["추천", "가능", "비추천"];
export const WITH_PETS_OPTIONS = ["가능", "일부가능", "불가"];
export const PARKING_DIFFICULTY_OPTIONS = ["쉬움", "보통", "어려움", "불가"];
export const ADMISSION_FEE_OPTIONS = ["무료", "유료", "정보없음"];
export const LINK_TYPE_OPTIONS = ["함께가기", "대체장소", "유사분위기"];
export const COMMENT_TYPE_OPTIONS = ["총평", "특징", "배경", "경치/분위기", "메뉴", "꿀팁", "주의사항", "전문가평가"];

// 숙소 관련 옵션들
export const ACCOMMODATION_TYPE_OPTIONS = ["호텔", "리조트", "게스트하우스", "펜션", "모텔", "스테이", "기타"];
export const ACCOMMODATION_PRICE_RANGE_OPTIONS = ["5만원 전후", "10만원 전후", "20만원 이상"];
export const ACCOMMODATION_VIEW_TYPE_OPTIONS = ["바다뷰", "먼바다뷰", "중산간"];
export const KID_FRIENDLY_OPTIONS = ["가능", "불가", "연령제한"];
export const PET_FRIENDLY_OPTIONS = ["가능", "불가", "일부가능"];
export const BREAKFAST_OPTIONS = ["제공", "미제공", "유료"];

export const REGIONS = [
  {
    label: '제주시권',
    options: ['제주시 동(洞) 지역'],
  },
  {
    label: '제주 서부',
    options: ['애월읍', '한림읍', '한경면', '대정읍'],
  },
  {
    label: '제주 동부',
    options: ['조천읍', '구좌읍', '성산읍', '우도면'],
  },
  {
    label: '서귀포시권',
    options: ['서귀포시 동(洞) 지역'],
  },
  {
    label: '제주 남부',
    options: ['안덕면', '남원읍', '표선면'],
  },
];

export const ALL_REGIONS = REGIONS.flatMap(group => group.options);


// FIX: Renamed 'K LokalLogo' to 'KLokalLogo' to be a valid JavaScript identifier.
// FIX: Rewrote SVG component using React.createElement to avoid JSX parsing errors in a .ts file.
export const KLokalLogo = () => React.createElement(
    'svg',
    { width: "40", height: "40", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
    React.createElement('path', { d: "M12 2L2 7L12 12L22 7L12 2Z", stroke: "#4F46E5", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }),
    React.createElement('path', { d: "M2 17L12 22L22 17", stroke: "#4F46E5", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }),
    React.createElement('path', { d: "M2 12L12 17L22 12", stroke: "#4F46E5", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })
);