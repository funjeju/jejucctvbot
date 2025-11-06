# 제주 라이브 CCTV 실시간 채팅 시스템

## 시스템 개요

제주도 관광지 CCTV 실시간 스트리밍과 AI 챗봇 기반 채팅을 통합한 인터랙티브 플랫폼입니다.

### 주요 기능

1. **실시간 CCTV 스트리밍** - HLS 프로토콜 기반 라이브 영상
2. **실시간 채팅** - Firestore 기반 실시간 채팅방
3. **AI 챗봇** - 슬래시(/) 명령어로 제주 관광 정보 제공
4. **제주 데이터 통합** - 스팟, 오름, 뉴스 데이터 기반 컨텍스트 답변

---

## 시스템 구조

```
┌─────────────────────────────────────────────┐
│           제주 라이브 CCTV 뷰어              │
├─────────────────────────────────────────────┤
│  [CCTV 목록 선택]                           │
│  성산일출봉 | 한라산 | 협재해수욕장 | ...    │
├─────────────────────────────────────────────┤
│                                             │
│  [영상 플레이어]     │  [실시간 채팅]        │
│  HLS 스트리밍        │  - 일반 채팅          │
│  (2/3 너비)         │  - AI 챗봇 (/)       │
│                     │  (1/3 너비)          │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 데이터 구조

### 1. CCTV 소스 (Firestore: `cctvs` 컬렉션)

```typescript
interface CCTVSource {
  id: string;
  name: string;                    // "성산일출봉 라이브"
  streamUrl: string;                // HLS 스트림 URL
  location?: Geopoint;              // GPS 좌표
  region?: string;                  // "서귀포시"
  description?: string;             // 설명
  thumbnailUrl?: string;            // 썸네일
  isActive: boolean;                // 활성화 상태
  viewCount: number;                // 조회수
  relatedSpotIds?: string[];        // 연관 스팟
  keywords?: string[];              // AI 검색용 키워드
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### 2. 채팅 메시지 (Firestore: `cctv_chats/{cctvId}/messages`)

```typescript
interface ChatMessage {
  id: string;
  cctvId: string;                   // CCTV 방 ID
  userId: string;                   // 사용자 ID
  username: string;                 // 닉네임
  message: string;                  // 메시지 내용
  timestamp: Timestamp;
  type: 'user' | 'ai';              // 사용자 vs AI
  isSlashCommand?: boolean;         // 슬래시 명령어 여부
}
```

---

## 사용 방법

### 1. CCTV 시청

1. 메인 페이지에서 **"📹 제주 라이브 CCTV"** 버튼 클릭
2. 또는 직접 URL 접근: `http://localhost:5173/cctv`
3. 상단에서 원하는 CCTV 선택
4. 영상 자동 재생

### 2. 일반 채팅

- 하단 채팅창에서 메시지 입력 후 전송
- 다른 사용자와 실시간 대화 가능
- 닉네임 변경: 헤더의 "닉네임" 버튼 클릭

### 3. AI 챗봇 사용

**슬래시(/) 명령어로 AI 호출:**

```
/성산일출봉          → 성산일출봉 관련 정보
/맛집                → 맛집 추천
/오름                → 오름 정보
/축제                → 현재 진행 중인 축제
/해변                → 해변/해수욕장 정보
```

**AI 응답 예시:**

```
📍 추천 관광지
• 성산일출봉 (서귀포시) - 자연경관, 유네스코 세계자연유산

⛰ 추천 오름
• 새별오름 (난이도: 쉬움, 정상뷰: 상)

📰 최신 소식
• 성산일출봉 유채꽃 개화 시작

📹 현재 CCTV 주변 명소
• 광치기 해변
```

---

## Firestore 설정

### 1. CCTV 데이터 추가

**Firestore Console → `cctvs` 컬렉션 생성**

```javascript
// 예시 CCTV 문서
{
  "id": "cctv_seongsan",
  "name": "성산일출봉 라이브",
  "streamUrl": "https://example.com/stream/seongsan.m3u8",
  "region": "서귀포시",
  "description": "성산일출봉 정상 전망 실시간 영상",
  "isActive": true,
  "viewCount": 0,
  "relatedSpotIds": ["P_20250101120000_AB"],
  "keywords": ["성산", "일출", "일출봉", "해돋이"],
  "location": {
    "latitude": 33.4593,
    "longitude": 126.9424
  },
  "created_at": Timestamp,
  "updated_at": Timestamp
}
```

### 2. 채팅 컬렉션 구조

```
cctvs/
  └── {cctvId}/

cctv_chats/
  └── {cctvId}/
      └── messages/
          ├── {messageId1}
          ├── {messageId2}
          └── ...
```

### 3. Firestore 규칙 (개발용)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // CCTV 목록 읽기 전용
    match /cctvs/{cctvId} {
      allow read: if true;
      allow write: if false; // 관리자만 수정
    }

    // 채팅 메시지 읽기/쓰기 허용
    match /cctv_chats/{cctvId}/messages/{messageId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

---

## AI 챗봇 로직

### 검색 알고리즘

1. **키워드 매칭** - 사용자 입력에서 키워드 추출
2. **스팟 검색** - 이름, 카테고리, 태그, 지역 매칭
3. **오름 검색** - 이름, 주소 매칭
4. **뉴스 검색** - 제목, 키워드, 내용 매칭
5. **CCTV 주변 명소** - 현재 보고 있는 CCTV의 relatedSpotIds 기반

### AI 응답 생성 (LiveChatRoom.tsx)

```typescript
const generateAIResponse = async (userMessage: string): Promise<string> => {
  const query = userMessage.replace(/^\/\s*/, '').trim().toLowerCase();

  // 1. 스팟 검색
  const matchedSpots = spots.filter(spot =>
    spot.place_name.toLowerCase().includes(query) ||
    spot.categories?.some(cat => cat.includes(query)) ||
    spot.tags?.some(tag => tag.toLowerCase().includes(query))
  ).slice(0, 3);

  // 2. 오름 검색
  const matchedOrooms = orooms.filter(oroom =>
    oroom.name.toLowerCase().includes(query)
  ).slice(0, 2);

  // 3. 뉴스 검색
  const matchedNews = news.filter(newsItem =>
    newsItem.keywords?.some(keyword => keyword.includes(query))
  ).slice(0, 2);

  // 4. CCTV 주변 명소
  const relatedSpots = spots.filter(s =>
    cctv.relatedSpotIds!.includes(s.place_id)
  );

  // 응답 조합
  return formatResponse(matchedSpots, matchedOrooms, matchedNews, relatedSpots);
};
```

---

## 개발 및 테스트

### 로컬 실행

```bash
npm run dev
```

- 메인 앱: `http://localhost:5173`
- CCTV 뷰어: `http://localhost:5173/cctv`

### 테스트 CCTV 추가

Firebase Console에서 테스트 CCTV 데이터 추가:

```javascript
// Firestore Console
컬렉션: cctvs
문서 ID: test_cctv_1

{
  "name": "테스트 CCTV",
  "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "region": "제주시",
  "isActive": true,
  "viewCount": 0,
  "keywords": ["테스트"],
  "created_at": [현재 Timestamp],
  "updated_at": [현재 Timestamp]
}
```

### HLS 스트림 테스트

무료 테스트 스트림:
- `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`
- `https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8`

---

## 주요 컴포넌트

### 1. CCTVViewer (메인 페이지)

- **경로**: [components/CCTVViewer.tsx](components/CCTVViewer.tsx)
- **역할**: CCTV 목록, 영상, 채팅 통합 UI

### 2. CCTVList (CCTV 선택)

- **경로**: [components/CCTVList.tsx](components/CCTVList.tsx)
- **역할**: 상단 CCTV 목록 표시 및 선택

### 3. HLSVideoPlayer (영상 플레이어)

- **경로**: [components/HLSVideoPlayer.tsx](components/HLSVideoPlayer.tsx)
- **역할**: HLS 스트리밍 재생

### 4. LiveChatRoom (실시간 채팅)

- **경로**: [components/LiveChatRoom.tsx](components/LiveChatRoom.tsx)
- **역할**: 채팅 + AI 챗봇

---

## 향후 개선 사항

1. **고급 AI 통합**
   - Gemini API 활용 (현재는 간단한 키워드 매칭)
   - 자연어 이해 및 대화형 응답

2. **사용자 인증**
   - Firebase Auth 통합
   - 닉네임 영구 저장

3. **채팅 기능 강화**
   - 이모지 지원
   - 이미지 공유
   - 사용자 차단

4. **CCTV 관리 대시보드**
   - 관리자 페이지에서 CCTV 추가/수정/삭제
   - 통계 및 분석

5. **모바일 최적화**
   - 반응형 레이아웃 개선
   - 터치 제스처 지원

---

## 문제 해결

### CCTV가 재생되지 않을 때

1. 스트림 URL 확인 (HLS `.m3u8` 형식)
2. CORS 설정 확인
3. HTTP vs HTTPS 혼합 콘텐츠 확인
4. 브라우저 콘솔에서 에러 로그 확인

### 채팅이 전송되지 않을 때

1. Firestore 연결 확인
2. Firebase 규칙 확인
3. 사용자 ID/닉네임 초기화 확인

### AI가 응답하지 않을 때

1. 슬래시(/) 입력 확인
2. 스팟/오름/뉴스 데이터 로드 확인
3. 키워드 매칭 로직 디버깅

---

## 라이선스

MIT License

## 문의

프로젝트 관련 문의는 이슈를 등록해주세요.
