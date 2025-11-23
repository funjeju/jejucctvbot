// Chatbot 검색 로직 유틸리티 함수

/**
 * 사용자 질문 분석 (규칙 기반)
 */
export function analyzeUserQuery(input: string) {
    // 지역 추출
    const regions = [
        '애월', '한림', '성산', '서귀포', '제주시', '조천', '구좌',
        '한경', '대정', '남원', '표선', '안덕', '우도', '중문'
    ];
    const region = regions.find(r => input.includes(r));

    // 카테고리 추출 (한글-영문 매핑)
    const categoryMap: Record<string, { kr: string[], en: string[] }> = {
        '맛집': { kr: ['음식점', '맛집'], en: ['Restaurant'] },
        '음식점': { kr: ['음식점', '맛집'], en: ['Restaurant'] },
        '카페': { kr: ['카페'], en: ['Cafe', 'Restaurant'] },
        '관광지': { kr: ['관광지'], en: ['Attraction'] },
        '숙소': { kr: ['숙박', '호텔', '펜션', '게스트하우스', '리조트'], en: ['Accommodation'] },
        '호텔': { kr: ['호텔'], en: ['Accommodation'] },
        '펜션': { kr: ['펜션'], en: ['Accommodation'] },
        '해변': { kr: ['해변', '바다'], en: ['Beach', 'Attraction'] },
        '바다': { kr: ['해변', '바다'], en: ['Beach', 'Attraction'] },
        '오름': { kr: ['오름'], en: ['Oroom', 'Attraction'] },
        '박물관': { kr: ['박물관', '미술관'], en: ['Museum'] },
        '미술관': { kr: ['미술관', '박물관'], en: ['Museum'] },
        '전시': { kr: ['전시', '갤러리'], en: ['Exhibition', 'Gallery'] },
        '축제': { kr: ['축제', '행사'], en: ['Festival'] },
        '시장': { kr: ['시장', '전통시장'], en: ['Market'] },
    };

    const categories_kr: string[] = [];
    const categories_en: string[] = [];

    for (const [key, value] of Object.entries(categoryMap)) {
        if (input.includes(key)) {
            categories_kr.push(...value.kr.filter(c => !categories_kr.includes(c)));
            categories_en.push(...value.en.filter(c => !categories_en.includes(c)));
        }
    }

    // 키워드 추출
    const keywords = [
        '오션뷰', '바다뷰', '일몰', '억새', '브런치', '디저트',
        '인스타', '핫플', '힐링', '드라이브', '포토존', '야경',
        '가족', '아이', '데이트', '연인', '친구'
    ];
    const detectedKeywords = keywords.filter(k => input.includes(k));

    return {
        region,
        categories_kr,
        categories_en,
        keywords: detectedKeywords
    };
}

/**
 * 규칙 기반 스팟 필터링
 */
export function filterSpotsByRules(
    spots: any[],
    query: {
        region?: string,
        categories_kr: string[],
        categories_en: string[],
        keywords: string[]
    }
) {
    return spots.filter(spot => {
        // 지역 필터
        if (query.region && spot.region && !spot.region.includes(query.region)) {
            return false;
        }

        // 카테고리 필터 (한글 + 영문)
        if (query.categories_kr.length > 0 || query.categories_en.length > 0) {
            const matchesKr = query.categories_kr.some(cat =>
                spot.categories_kr?.includes(cat)
            );
            const matchesEn = query.categories_en.some(cat =>
                spot.categories?.includes(cat)
            );

            if (!matchesKr && !matchesEn) return false;
        }

        // 키워드 필터 (tags + interest_tags + place_name + summary)
        if (query.keywords.length > 0) {
            const matchesTag = query.keywords.some(k =>
                spot.tags?.some((tag: string) => tag.includes(k))
            );
            const matchesInterest = query.keywords.some(k =>
                spot.interest_tags?.includes(k)
            );
            const matchesText = query.keywords.some(k =>
                spot.place_name.includes(k) || spot.summary?.includes(k)
            );

            if (!matchesTag && !matchesInterest && !matchesText) return false;
        }

        return true;
    });
}

/**
 * 데이터 완성도별 정렬
 */
export function sortByDataQuality(spots: any[]) {
    const qualityOrder = { 'full': 0, 'partial': 1, 'basic': 2 };

    return spots.sort((a, b) => {
        const aQuality = qualityOrder[a.data_completeness || 'basic'];
        const bQuality = qualityOrder[b.data_completeness || 'basic'];
        return aQuality - bQuality;
    });
}
