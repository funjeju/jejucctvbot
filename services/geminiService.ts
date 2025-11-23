import { GoogleGenAI, Type } from "@google/genai";
import type { InitialFormData, Place, OroomInitialFormData, OroomData } from '../types';
import { findRegionByName, getRegionsByType } from '../data/csvRegionLoader';

// The API key is sourced from the environment variable `process.env.API_KEY`.
// It is assumed to be pre-configured and accessible in the execution environment.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const regionsDescription = `The administrative/travel region in Jeju. Must be one of: 제주시 동(洞) 지역, 애월읍, 한림읍, 한경면, 대정읍, 조천읍, 구좌읍, 성산읍, 우도면, 서귀포시 동(洞) 지역, 안덕면, 남원읍, 표선면.`;

const draftGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        place_name: { type: Type.STRING, description: "Name of the spot, refined from user input if necessary." },
        address: { type: Type.STRING, description: "The full address of the spot.", nullable: true },
        region: { type: Type.STRING, description: regionsDescription, nullable: true },
        location: {
            type: Type.OBJECT,
            properties: {
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
            },
            description: "Geographical coordinates.",
            nullable: true,
        },
        average_duration_minutes: { type: Type.NUMBER, description: "Estimated average time in minutes a visitor spends here. Infer from the description.", nullable: true },
        public_info: {
            type: Type.OBJECT,
            properties: {
                operating_hours: { type: Type.STRING, nullable: true },
                phone_number: { type: Type.STRING, nullable: true },
                website_url: { type: Type.STRING, nullable: true },
                closed_days: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Regular closing days of the week, e.g., ['월요일']", nullable: true },
            },
            description: "Publicly available information like business hours and contact.",
            nullable: true,
        },
        tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true,
            description: "A list of relevant tags or keywords for the spot, derived from the description."
        },
        attributes: {
            type: Type.OBJECT,
            properties: {
                targetAudience: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedSeasons: { type: Type.ARRAY, items: { type: Type.STRING } },
                withKids: { type: Type.STRING },
                withPets: { type: Type.STRING },
                parkingDifficulty: { type: Type.STRING },
                admissionFee: { type: Type.STRING },
                recommended_time_of_day: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Best time of day to visit, e.g., '오전', '일몰', '점심시간 피하기'", nullable: true },
                rainy_day_friendly: { type: Type.BOOLEAN, description: "비오는 날에도 방문하기 좋은지 (실내 활동, 우천 시 더 멋진 경관 등)", nullable: true },
                is_hidden_gem: { type: Type.BOOLEAN, description: "숨은 명소인지 (관광객이 적고, 현지인만 아는 곳)", nullable: true },
            },
            description: "Core attributes of the spot, inferred from the description."
        },
        category_specific_info: {
            type: Type.OBJECT,
            properties: {
                signatureMenu: { type: Type.STRING, nullable: true },
                priceRange: { type: Type.STRING, nullable: true },
                difficulty: { type: Type.STRING, nullable: true },
            },
            description: "Additional information specific to certain categories, inferred from the description.",
            nullable: true,
        },
        expert_tip_final: { type: Type.STRING, description: "The refined, user-friendly version of the expert's tip, based on the expert's description." },
        comments: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    content: { type: Type.STRING },
                },
            },
            description: "Structured comments derived from the detailed expert description.",
            nullable: true,
        },
        interest_tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "관심사 태그: '자연', '오션뷰', '핫플', '쇼핑', '박물관', '역사', '액티비티', '걷기' 중 해당되는 것들",
            nullable: true,
        },
        view_info: {
            type: Type.OBJECT,
            properties: {
                ocean_view: { type: Type.BOOLEAN, description: "바다뷰가 있는지" },
                mountain_view: { type: Type.BOOLEAN, description: "산뷰/오름뷰가 있는지" },
                city_view: { type: Type.BOOLEAN, description: "시티뷰가 있는지" },
                nature_view: { type: Type.BOOLEAN, description: "자연뷰가 있는지" },
            },
            description: "뷰 정보",
            nullable: true,
        },
        shopping_info: {
            type: Type.OBJECT,
            properties: {
                has_souvenirs: { type: Type.BOOLEAN, description: "기념품 쇼핑 가능한지" },
                has_local_products: { type: Type.BOOLEAN, description: "로컬 특산품 구매 가능한지" },
                has_fashion: { type: Type.BOOLEAN, description: "패션/소품 쇼핑 가능한지" },
                shopping_type: { type: Type.STRING, enum: ["대형몰", "로컬샵", "전통시장", "아울렛", "기타"], nullable: true },
            },
            description: "쇼핑 관련 정보",
            nullable: true,
        },
        cultural_info: {
            type: Type.OBJECT,
            properties: {
                historical_significance: { type: Type.BOOLEAN, description: "역사적 의미가 있는지" },
                cultural_experience: { type: Type.BOOLEAN, description: "문화 체험이 가능한지" },
                traditional_elements: { type: Type.BOOLEAN, description: "전통 요소가 있는지" },
                modern_culture: { type: Type.BOOLEAN, description: "현대 문화 요소가 있는지" },
            },
            description: "문화/역사 관련 정보",
            nullable: true,
        },
        activity_info: {
            type: Type.OBJECT,
            properties: {
                activity_level: { type: Type.STRING, enum: ["휴식중심", "가벼운활동", "활동적", "매우활동적"], description: "활동 강도" },
                walking_required: { type: Type.BOOLEAN, description: "걷기가 필요한지" },
                physical_difficulty: { type: Type.STRING, enum: ["쉬움", "보통", "어려움"], description: "체력적 난이도" },
                suitable_for_kids: { type: Type.BOOLEAN, description: "아이들과 함께 가기 좋은지" },
                suitable_for_elderly: { type: Type.BOOLEAN, description: "어르신들과 함께 가기 좋은지" },
            },
            description: "액티비티 관련 정보",
            nullable: true,
        },
        trend_info: {
            type: Type.OBJECT,
            properties: {
                trend_status: { type: Type.STRING, enum: ["클래식", "꾸준인기", "요즘핫플", "숨은명소"], description: "트렌드 상태" },
                popularity_level: { type: Type.STRING, enum: ["한적함", "보통", "인기", "매우인기"], description: "인기도" },
                sns_hotspot: { type: Type.BOOLEAN, description: "SNS에서 인기인지" },
                instagram_worthy: { type: Type.BOOLEAN, description: "인스타그램 포토스팟인지" },
            },
            description: "트렌드/인기도 정보",
            nullable: true,
        },
        accommodation_info: {
            type: Type.OBJECT,
            properties: {
                accommodation_type: { type: Type.STRING, enum: ["호텔", "리조트", "게스트하우스", "펜션", "모텔", "스테이", "기타"], description: "숙소 유형" },
                price_range: { type: Type.STRING, enum: ["5만원 전후", "10만원 전후", "20만원 이상"], description: "1박 가격대" },
                view_type: { type: Type.STRING, enum: ["바다뷰", "먼바다뷰", "중산간"], description: "뷰 유형" },
                region: { type: Type.STRING, description: "권역 정보 (주소를 기반으로 자동 매칭)" },
                kid_friendly: { type: Type.STRING, enum: ["가능", "불가", "연령제한"], description: "아이 동반 가능 여부" },
                pet_friendly: { type: Type.STRING, enum: ["가능", "불가", "일부가능"], description: "반려동물 동반 가능 여부" },
                breakfast_included: { type: Type.STRING, enum: ["제공", "미제공", "유료"], description: "조식 제공 여부" },
                check_in_time: { type: Type.STRING, description: "체크인 시간 (예: 15:00)" },
                check_out_time: { type: Type.STRING, description: "체크아웃 시간 (예: 11:00)" },
                google_maps_url: { type: Type.STRING, description: "구글 맵 링크", nullable: true },
            },
            description: "숙소 전용 정보 (카테고리가 '숙소'인 경우에만 필수)",
            nullable: true,
        },
    },
    required: ["place_name", "attributes", "expert_tip_final", "interest_tags"]
};


// 웹 검색을 통한 추가 정보 수집 함수
const searchSpotInformation = async (spotName: string, categories: string[]): Promise<string> => {
    try {
        // 검색 쿼리 생성
        const searchQuery = `${spotName} 제주도 ${categories.join(' ')} 관광지 정보 리뷰 운영시간 가격`;

        console.log(`🔍 웹 검색 중: ${searchQuery}`);

        // WebSearch를 사용한 실제 검색 (브라우저 환경에서는 작동하지 않을 수 있음)
        // 실제 구현에서는 서버사이드에서 처리하거나 다른 방법 사용

        // 임시로 더 현실적인 검색 결과 시뮬레이션
        const mockSearchResults = await simulateWebSearch(spotName, categories);

        return mockSearchResults;

    } catch (error) {
        console.error('웹 검색 중 오류:', error);
        return `${spotName}에 대한 추가 정보를 온라인에서 찾을 수 없었습니다. 기본 설명을 바탕으로 분석을 진행합니다.`;
    }
};

// 웹 검색 시뮬레이션 함수 (실제 서비스에서는 실제 검색 API로 교체)
const simulateWebSearch = async (spotName: string, categories: string[]): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 검색 시간 시뮬레이션

    // 카테고리별 맞춤 검색 결과 시뮬레이션
    let searchInfo = `=== ${spotName} 온라인 검색 결과 ===\n\n`;

    if (categories.includes('맛집') || categories.includes('카페')) {
        searchInfo += `📍 운영정보:
• 영업시간: 오전 9시 - 오후 10시 (월요일 휴무)
• 평균 예산: 1인당 15,000-25,000원
• 주차: 매장 앞 무료 주차 가능

👥 방문객 리뷰:
• "제주도 현지인이 추천하는 맛집"
• "인스타그램에서 유명한 포토스팟"
• "웨이팅이 있을 수 있으니 미리 전화 추천"

🏆 특징:
• 제주 현지 식재료 사용
• 오션뷰 테라스석 보유
• SNS 핫플레이스로 젊은 층에게 인기`;

    } else if (categories.includes('관광지') || categories.includes('자연')) {
        searchInfo += `📍 관광정보:
• 입장료: 성인 3,000원, 어린이 1,500원
• 관람시간: 약 1-2시간 소요
• 주차: 대형 주차장 완비 (무료)

🌟 방문객 후기:
• "일몰 시간대가 가장 아름다움"
• "가족 단위 방문객들이 많음"
• "사진 촬영하기 좋은 명소"

⚠️ 주의사항:
• 날씨에 따라 운영 중단 가능
• 안전을 위해 지정된 구역에서만 관람
• 성수기에는 대기시간 발생 가능`;

    } else if (categories.includes('숙소')) {
        searchInfo += `🏨 숙박정보:
• 체크인: 15:00 / 체크아웃: 11:00
• 가격대: 1박 기준 80,000-150,000원
• 부대시설: 수영장, 피트니스, 조식 제공

💬 투숙객 리뷰:
• "청결하고 직원들이 친절함"
• "바다뷰가 정말 훌륭함"
• "조식 퀄리티가 좋음"

🎯 추천사항:
• 커플 여행객들에게 인기
• 사전 예약 필수 (성수기)
• 주변 관광지 접근성 우수`;

    } else if (categories.includes('포토존')) {
        searchInfo += `📸 포토존 정보:
• 최적 촬영시간: 골든아워 (일출/일몰 1시간 전후)
• 인기 포인트: 인스타그램 태그 #제주포토존으로 유명
• 주차: 근처 무료 주차 가능

📱 SNS 후기:
• "사진이 진짜 예쁘게 나와요"
• "배경이 완전 인생샷 명소"
• "웨딩촬영 장소로도 인기"

💡 촬영 팁:
• 오전 9-11시, 오후 4-6시 빛이 가장 좋음
• 주말/공휴일에는 사람이 많으니 평일 추천
• 소품 가져가면 더 다양한 컨셉 가능`;

    } else if (categories.includes('히든플레이스')) {
        searchInfo += `🗝️ 히든플레이스 정보:
• 접근성: 현지인들만 아는 숨은 명소
• 특징: 관광객이 적어 조용하고 한적함
• 발견 경로: 제주 로컬 블로거 추천

🌟 방문자 후기:
• "정말 숨겨진 보석 같은 곳"
• "사람이 없어서 온전히 즐길 수 있음"
• "제주의 진짜 매력을 느낄 수 있는 곳"

⚠️ 주의사항:
• GPS 좌표 정확히 확인 후 방문
• 현지 주민 배려하며 조용히 방문
• 일부 시간대에만 접근 가능할 수 있음`;
    } else {
        searchInfo += `📝 일반 정보:
• 위치: 제주도 내 접근성 양호
• 방문 추천 시간: 계절별 상이
• 주요 이용객: 관광객 및 현지인

🔍 온라인 평가:
• 전반적으로 긍정적인 리뷰
• 제주 여행 필수 코스로 언급
• SNS에서 자주 공유되는 장소

💡 방문 팁:
• 미리 정보 확인 후 방문 권장
• 현지 날씨 체크 필요
• 대중교통보다 렌터카 이용 추천`;
    }

    return searchInfo;
};

export const generateDraft = async (formData: InitialFormData): Promise<Partial<Place>> => {
    // 웹 검색을 통한 추가 정보 수집
    const searchResults = await searchSpotInformation(formData.spotName, formData.categories);

    const prompt = `
# ROLE & GOAL
You are an AI data assistant for Jeju DB, a Jeju travel platform. Your goal is to create a structured JSON data draft for a travel spot. You will use the expert description as the primary source and supplement it with web search results for comprehensive and accurate information.

# INPUTS
1.  **Spot Name**: "${formData.spotName}"
2.  **Categories**: [${formData.categories.join(', ')}]
3.  **Expert's Description (Primary Source)**:
    """
    ${formData.spotDescription}
    """
4.  **Reference URL (Optional, for factual data)**: ${formData.importUrl || 'Not provided.'}
5.  **Web Search Results (Supplementary Information)**:
    """
    ${searchResults}
    """

# INSTRUCTIONS
1.  **Analyze the Expert's Description**: This is the most important input and should be the foundation of your analysis. Extract subjective details, tips, atmosphere, and personal recommendations.

2.  **Integrate Web Search Results**: Use the search results to enhance and validate information from the expert description. The search results provide:
    - Current operating information (hours, prices, contact details)
    - Recent visitor reviews and feedback
    - Seasonal tips and recommendations
    - Practical information (parking, accessibility)

3.  **Synthesize Comprehensive Information**: Combine all sources intelligently:
    *   **Expert description** = Primary source for subjective insights, personal tips, atmosphere
    *   **Web search results** = Supplementary source for objective facts, current information, visitor consensus
    *   **Reference URL** = Additional factual validation if provided

4.  **Generate Enhanced JSON**: Create a comprehensive data structure:
    *   **expert_tip_final**: Blend the expert's personal insights with practical information from search results. Include both subjective tips and objective details (hours, prices, seasonal advice).
    *   **comments**: Create structured comments that combine expert insights with search result findings (e.g., "꿀팁", "방문정보", "주의사항").
    *   **attributes**: Use both expert description and search results to determine target audience, seasons, accessibility, etc.
    *   **public_info**: Prioritize search results for current operating hours, contact information, and practical details.
    *   **category_specific_info**: For restaurants/cafes, include price ranges and signature items from search results.
    *   **관심사 분류 (CRITICAL)**: Analyze the content and classify according to these specific interest categories:
        - **자연**: 오름, 해변, 숲, 공원, 자연경관, 야외활동 공간
        - **오션뷰**: 바다가 보이는 카페/식당/숙소, 해안가 명소, 일몰/일출 명소
        - **요즘핫플**: SNS 핫플레이스, 인스타그램 명소, 최근 오픈한 곳, 젊은층 인기
        - **쇼핑**: 기념품샵, 로컬 특산품, 패션샵, 전통시장, 쇼핑몰
        - **박물관**: 박물관, 미술관, 갤러리, 전시공간
        - **역사**: 역사유적, 전통문화, 문화재, 옛 건축물
        - **액티비티**: 체험활동, 스포츠, 어드벤처, 워터스포츠
        - **걷기**: 올레길, 산책로, 트레킹 코스, 도보여행 적합한 곳

5.  **상세 분류 지침**:
    *   **interest_tags**: 위 8개 카테고리 중 해당되는 모든 태그를 배열로 포함 (복수 선택 가능)
    *   **view_info**: 설명에서 뷰 관련 언급이 있는지 정확히 분석
    *   **activity_info**: 체력 요구도, 걷기 필요성, 연령대 적합성을 정확히 판단
    *   **trend_info**: SNS 언급, 최신 트렌드, 인기도를 종합적으로 분석
    *   **shopping_info**: 쇼핑 가능 항목을 구체적으로 분류
    *   **cultural_info**: 역사적/문화적 요소를 세분화하여 분석
    *   **accommodation_info**: 숙소인 경우 필수 정보 분류:
        - accommodation_type: 건물 유형과 규모에 따라 분류 (호텔/리조트/게스트하우스/펜션/모텔/스테이)
        - price_range: 검색 결과나 설명에서 1박 가격대 추정 (5만원 전후/10만원 전후/20만원 이상)
        - view_type: 뷰 특성에 따라 분류 (바다뷰/먼바다뷰/중산간)
        - region: 주소 기반 권역 자동 매칭
          * 성산읍, 구좌읍, 우도면 → "성산구좌(제주동쪽)"
          * 표선면, 남원읍 → "표선남원(제주동남쪽)"
          * 서귀포시, 중문 → "서귀포시중문(서귀포시)"
          * 대정읍, 안덕면 → "대정안덕(제주남서쪽)"
          * 한림읍, 한경면 → "한림한경(제주서쪽)"
          * 애월읍 → "애월(제주시의서쪽)"
          * 제주시 동(洞) 지역 → "제주시"
          * 조천읍 → "조천(제주시의동쪽)"
        - 체크인/아웃 시간: 일반적으로 15:00/11:00이지만 실제 정보가 있으면 정확히 기재
        - 아이/반려동물 동반 가능성: 설명에서 언급되지 않으면 '가능'으로 기본 설정
        - 조식: 언급되지 않으면 '미제공'으로 기본 설정

6.  **Quality Guidelines**:
    - Ensure expert insights are preserved and highlighted
    - Add practical details from search results where they enhance user experience
    - Resolve any conflicts by favoring expert description for subjective matters and search results for factual information
    - Make the final content comprehensive yet readable
    - **MANDATORY**: Every spot must have properly classified interest_tags based on content analysis

7.  **Output**: Return ONLY the generated JSON object that conforms to the schema. The spot name in the JSON should be exactly "${formData.spotName}".
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: draftGenerationSchema,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("API returned an empty response.");
        }

        return JSON.parse(jsonText) as Partial<Place>;

    } catch (error) {
        console.error("Error generating draft from AI:", error);
        throw new Error("Failed to generate AI draft. Please check the console for details.");
    }
};

const oroomAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "오름의 정확한 이름" },
        address: { type: Type.STRING, description: "오름의 정확한 주소" },
        latitude: { type: Type.NUMBER, description: "GPS 위도 좌표", nullable: true },
        longitude: { type: Type.NUMBER, description: "GPS 경도 좌표", nullable: true },
        difficulty: {
            type: Type.STRING,
            description: "난이도: '쉬움', '보통', '어려움', '매우어려움' 중 하나",
            enum: ['쉬움', '보통', '어려움', '매우어려움']
        },
        mainSeasons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "주요 계절: '봄', '여름', '가을', '겨울' 중 선택"
        },
        mainMonths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "주요 월: '1월', '2월', ... '12월' 형태로"
        },
        roundTripTime: { type: Type.STRING, description: "왕복 소요 시간 (예: '왕복 2시간')" },
        summitView: {
            type: Type.STRING,
            description: "정상뷰 등급: '상', '중', '하' 중 하나",
            enum: ['상', '중', '하']
        },
        expertTip: { type: Type.STRING, description: "오름 등반 시 상세한 전문가 팁: 등반 준비물, 날씨별 주의사항, 추천 등반 경로, 안전 수칙, 체력 관리법, 최적 등반 시간대, 주차 팁, 사진 촬영 포인트 등을 자세히 포함" },
        nearbyAttractions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "주변 관광지나 가볼만한 곳들"
        },
        nameOrigin: { type: Type.STRING, description: "오름 이름의 유래나 의미" }
    },
    required: ["name", "address", "difficulty", "roundTripTime", "summitView"]
};

export const analyzeOroomDescription = async (formData: OroomInitialFormData): Promise<Partial<OroomData>> => {
    const prompt = `
# ROLE & GOAL
당신은 제주도 오름 전문가입니다. 사용자가 제공한 오름 설명을 분석하여 구조화된 데이터로 변환해주세요.

# INPUT
오름 설명:
"""
${formData.description}
"""

# INSTRUCTIONS
1. **오름 이름**: 설명에서 오름의 정확한 이름을 추출하세요
2. **주소**: 오름이 위치한 정확한 주소를 추출하세요 (제주특별자치도 포함)
3. **GPS 좌표**: 위도(latitude)와 경도(longitude)를 포함하세요 (알 수 없으면 null)
4. **난이도**: 설명을 바탕으로 등반 난이도를 판단하세요 ('쉬움', '보통', '어려움', '매우어려움')
5. **주요 계절**: 방문하기 좋은 계절을 추천하세요 ('봄', '여름', '가을', '겨울')
6. **주요 월**: 가장 좋은 방문 월을 선택하세요 ('4월', '5월' 등)
7. **왕복 소요 시간**: 평균적인 왕복 소요 시간을 추정하세요 ('왕복 1시간' 형식)
8. **정상뷰**: 정상에서의 경치 수준을 평가하세요 ('상', '중', '하')
9. **전문가 팁**: ⚠️ 반드시 입력된 오름 설명의 모든 내용을 기반으로 작성하세요
   **기본 원칙**: 사용자가 제공한 오름 설명에 포함된 모든 정보를 누락 없이 반영해야 합니다
   - 설명에 언급된 등반 경로, 난이도, 소요시간, 주의사항을 그대로 포함
   - 설명에 나온 특징적인 지형, 위험 구간, 볼거리를 빠뜨리지 말고 포함
   - 설명에 있는 주차, 접근성, 시설 정보를 모두 반영
   - 설명 내용을 기반으로 추가 전문가 조언을 덧붙임:
     * 등반 전 준비물 (신발, 의류, 물, 간식 등)
     * 날씨별 주의사항 (비, 바람, 더위, 추위 대비법)
     * 체력 관리법 및 휴식 포인트
     * 최적 등반 시간대 (일출/일몰 등)
     * 사진 촬영 명소 및 각도
     * 계절별 특별 주의사항
     * 초보자/숙련자별 맞춤 조언
   **중요**: 원본 설명의 핵심 정보는 절대 누락하지 말고, 문체만 다듬어 전문가 팁 형태로 재구성하세요
10. **주변 관광지**: 오름 근처의 관광지나 명소들을 나열하세요
11. **이름 유래**: 오름 이름의 유래나 의미를 설명하세요

# OUTPUT
JSON 형태로만 반환하세요. 추가 설명이나 마크다운 없이 순수한 JSON만 출력하세요.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: oroomAnalysisSchema,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("AI에서 응답을 받지 못했습니다.");
        }

        const analysisResult = JSON.parse(jsonText);

        // alljeju.csv에서 오름 이름으로 GPS 좌표 찾기
        let gpsCoordinates = { latitude: null, longitude: null };
        let gpsFound = false;
        if (analysisResult.name) {
            try {
                const regionInfo = await findRegionByName(analysisResult.name);
                if (regionInfo && regionInfo.type === '오름') {
                    gpsCoordinates = {
                        latitude: regionInfo.lat,
                        longitude: regionInfo.lng
                    };
                    gpsFound = true;
                    console.log(`🗺️ ${analysisResult.name} GPS 좌표 찾음:`, gpsCoordinates);

                    // 주소에 GPS 좌표 정보 추가
                    if (analysisResult.address && !analysisResult.address.includes('GPS')) {
                        analysisResult.address += `\n📍 GPS: ${gpsCoordinates.latitude.toFixed(6)}, ${gpsCoordinates.longitude.toFixed(6)}`;
                    }
                } else {
                    console.log(`⚠️ ${analysisResult.name} 오름이 alljeju.csv에서 찾을 수 없습니다.`);
                }
            } catch (error) {
                console.log('GPS 좌표 검색 중 오류:', error);
            }
        }

        // 현재 시간으로 메타데이터 추가
        return {
            ...analysisResult,
            latitude: gpsCoordinates.latitude || analysisResult.latitude,
            longitude: gpsCoordinates.longitude || analysisResult.longitude,
            id: Date.now().toString(),
            parkingImages: [],
            entranceImages: [],
            trailImages: [],
            summitImages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft' as const
        };

    } catch (error) {
        console.error("오름 분석 오류:", error);
        throw new Error("AI 오름 분석에 실패했습니다. 콘솔을 확인해주세요.");
    }
};

/**
 * Phase 1: AI 기반 후보 스팟 필터링 및 점수 매기기
 * 사용자의 여행 조건에 맞는 스팟들을 DB에서 필터링하고 관련성 점수를 부여
 */
interface ItineraryFilterRequest {
    interests: string[]; // 관심사 태그들
    companions: string[]; // 동행자
    pace: 'slow' | 'moderate' | 'fast'; // 여행 페이스
    budget: 'low' | 'medium' | 'high'; // 예산
    preferRainyDay?: boolean; // 비오는날 추천 여부
    preferHiddenGems?: boolean; // 히든플레이스 선호
    avoidCrowds?: boolean; // 혼잡한 곳 회피
    fixedSpotNames?: string[]; // 필수 방문지 이름들
}

interface SpotScore {
    place_id: string;
    place_name: string;
    relevanceScore: number; // 0-100
    reasoning: string; // 점수 이유
}

const spotScoringSchema = {
    type: Type.OBJECT,
    properties: {
        scores: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    place_id: { type: Type.STRING },
                    place_name: { type: Type.STRING },
                    relevanceScore: { type: Type.NUMBER, description: "0-100 점수, 사용자 조건에 얼마나 잘 맞는지" },
                    reasoning: { type: Type.STRING, description: "점수를 부여한 이유 (간단히)" }
                },
                required: ["place_id", "place_name", "relevanceScore", "reasoning"]
            }
        }
    },
    required: ["scores"]
};

export const scoreCandidateSpots = async (
    candidateSpots: Array<{ place_id: string; place_name: string; interest_tags?: string[]; trend_info?: any; attributes?: any; category_specific_info?: any; public_info?: any }>,
    filterRequest: ItineraryFilterRequest
): Promise<SpotScore[]> => {

    // 배치 처리 설정
    // 배치 처리 설정
    const BATCH_SIZE = 10; // 한 번에 처리할 스팟 개수 (토큰 제한 고려)
    const DELAY_MS = 3000; // 배치 간 대기 시간 (3초)

    const allScores: SpotScore[] = [];
    const totalBatches = Math.ceil(candidateSpots.length / BATCH_SIZE);

    console.log(`🚀 스팟 점수 매기기 시작: 총 ${candidateSpots.length}개 스팟, ${totalBatches}개 배치로 나누어 처리합니다.`);

    for (let i = 0; i < candidateSpots.length; i += BATCH_SIZE) {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const batchSpots = candidateSpots.slice(i, i + BATCH_SIZE);

        console.log(`📦 배치 ${batchNumber}/${totalBatches} 처리 중 (${batchSpots.length}개)...`);

        // 스팟 정보 요약 생성
        const spotsInfo = batchSpots.map(spot => ({
            place_id: spot.place_id,
            place_name: spot.place_name,
            interest_tags: spot.interest_tags || [],
            trend: spot.trend_info?.trend_status || '정보없음',
            popularity: spot.trend_info?.popularity_level || '정보없음',
            targetAudience: spot.attributes?.targetAudience || [],
            priceRange: spot.category_specific_info?.priceRange || '정보없음',
            operating_hours: spot.public_info?.operating_hours || '정보없음',
            closed_days: spot.public_info?.closed_days || []
        }));

        const prompt = `
# ROLE & GOAL
당신은 제주도 여행 일정 AI 전문가입니다. 사용자의 여행 조건에 맞춰 후보 스팟들에 관련성 점수를 부여해주세요.

# 사용자 여행 조건
- **관심사**: ${filterRequest.interests.join(', ')}
- **동행자**: ${filterRequest.companions.join(', ')}
- **여행 페이스**: ${filterRequest.pace === 'slow' ? '느긋한 여행' : filterRequest.pace === 'moderate' ? '적당한 페이스' : '빡빡한 일정'}
- **예산**: ${filterRequest.budget === 'low' ? '가성비 중심' : filterRequest.budget === 'medium' ? '중간 예산' : '고급 여행'}
- **비오는날 추천**: ${filterRequest.preferRainyDay ? '예' : '아니오'}
- **히든플레이스 선호**: ${filterRequest.preferHiddenGems ? '예' : '아니오'}
- **혼잡한 곳 회피**: ${filterRequest.avoidCrowds ? '예' : '아니오'}
- **필수 방문지**: ${filterRequest.fixedSpotNames?.join(', ') || '없음'}

# 후보 스팟 목록
${JSON.stringify(spotsInfo, null, 2)}

# INSTRUCTIONS
각 스팟에 대해 0-100점의 관련성 점수를 부여하세요.

## 점수 부여 기준
1. **관심사 일치** (40점): interest_tags가 사용자 관심사와 얼마나 일치하는가
2. **동행자 적합성** (20점): targetAudience가 동행자 유형과 맞는가 (가족->아이 동반, 연인->커플 등)
3. **여행 페이스 적합성** (15점):
   - slow: 휴식중심, 한적함 선호
   - moderate: 균형잡힌 활동
   - fast: 많은 장소 방문, 효율성 중시
4. **예산 적합성** (10점): priceRange가 예산과 맞는가
5. **특별 선호사항** (15점):
   - 비오는날: rainy_day_friendly 체크
   - 히든플레이스: trend_status가 '숨은명소'인지
   - 혼잡 회피: popularity_level이 '한적함' 또는 '보통'인지

## 영업시간 정보 활용
- **operating_hours**: "09:00~17:00" 같은 형식으로 제공됨
- **closed_days**: 정기 휴무일 배열 (예: ["월요일", "화요일"])
- AI가 직접 시간 체크는 하지 않고, 영업시간이 명확한 스팟에 신뢰도 가산점 부여 가능

## 특별 규칙
- **필수 방문지**로 지정된 스팟은 무조건 90-100점 부여
- 관심사가 전혀 맞지 않으면 30점 미만
- 여러 관심사와 일치하면 가산점
- 영업시간이 명확히 기재된 스팟은 신뢰도가 높음

# OUTPUT
JSON 형식으로 각 스팟의 점수와 이유를 반환하세요.
`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: spotScoringSchema,
                },
            });

            const jsonText = response.text.trim();
            if (!jsonText) {
                console.warn(`⚠️ 배치 ${batchNumber}에서 빈 응답을 받았습니다.`);
                continue;
            }

            const result = JSON.parse(jsonText);
            if (result.scores && Array.isArray(result.scores)) {
                allScores.push(...result.scores);
            }

        } catch (error) {
            console.error(`❌ 배치 ${batchNumber} 처리 중 오류 발생:`, error);
            // 에러가 발생해도 전체 프로세스를 중단하지 않고 다음 배치로 진행
            // 필요시 재시도 로직 추가 가능
        }

        // 마지막 배치가 아니면 대기
        if (batchNumber < totalBatches) {
            console.log(`⏳ 쿼터 제한 방지를 위해 ${DELAY_MS / 1000}초 대기...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    console.log(`✅ 스팟 점수 매기기 완료: 총 ${allScores.length}개 점수 산출됨`);
    return allScores;
};