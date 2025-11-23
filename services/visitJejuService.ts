// Visit Jeju API 서비스
const VISIT_JEJU_API_KEY = 'bfadd3cade95484d9eab9b686ff761ef';
const VISIT_JEJU_BASE_URL = 'https://api.visitjeju.net/vsjApi/contents/searchList';

interface VisitJejuPhoto {
    photoid: {
        imgpath: string;
        thumbnailpath?: string;
    };
}

interface VisitJejuItem {
    contentsid: string;
    title: string;
    roadaddress?: string;
    address?: string;
    introduction?: string;
    alltag?: string;
    phoneno?: string;
    latitude?: number;
    longitude?: number;
    repPhoto?: {
        photoid: {
            imgpath: string;
            thumbnailpath?: string;
        };
    };
}

interface VisitJejuResponse {
    resultCode: number;
    resultMessage: string;
    items: VisitJejuItem[];
    pageInfo?: {
        page: number;
        size: number;
        totalCount: number;
    };
}

/**
 * Visit Jeju API 호출 (재시도 로직 포함)
 * @param locale 언어 코드 (kr, en, zh 등)
 * @param page 페이지 번호 (기본 1)
 * @param maxRetries 최대 재시도 횟수 (기본 3)
 * @returns API 응답 데이터
 */
export const fetchVisitJejuData = async (
    locale: string = 'kr',
    page: number = 1,
    maxRetries: number = 3
): Promise<VisitJejuResponse | null> => {
    const url = `${VISIT_JEJU_BASE_URL}?apiKey=${VISIT_JEJU_API_KEY}&locale=${locale}&page=${page}`;

    // User-Agent 헤더 추가 (서버 차단 방지)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    let lastError: Error | null = null;

    // 재시도 로직
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Visit Jeju API] 시도 ${attempt}/${maxRetries}: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                // CORS 이슈가 있을 수 있으므로 mode 설정
                mode: 'cors',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: VisitJejuResponse = await response.json();
            console.log(`[Visit Jeju API] 성공! 아이템 ${data.items?.length || 0}개 받음`);
            return data;

        } catch (error) {
            lastError = error as Error;
            console.error(`[Visit Jeju API] 시도 ${attempt} 실패:`, error);

            // 마지막 시도가 아니면 2초 대기 후 재시도
            if (attempt < maxRetries) {
                console.log(`[Visit Jeju API] 2초 후 재시도...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    console.error(`[Visit Jeju API] 모든 재시도 실패:`, lastError);
    return null;
};

/**
 * 이미지 경로 추출 헬퍼 함수
 */
export const getImagePath = (item: VisitJejuItem): string | null => {
    return item.repPhoto?.photoid?.imgpath || null;
};

/**
 * 썸네일 경로 추출 헬퍼 함수
 */
export const getThumbnailPath = (item: VisitJejuItem): string | null => {
    return item.repPhoto?.photoid?.thumbnailpath || item.repPhoto?.photoid?.imgpath || null;
};
