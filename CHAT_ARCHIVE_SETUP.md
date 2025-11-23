# 채팅 아카이브 시스템 설정 가이드

## 개요
24시간마다 자동으로 채팅 기록을 아카이브하고 AI 요약을 생성하는 시스템입니다.

## 주요 기능
1. **24시간 채팅 기록 유지**: 모든 사용자가 최근 24시간 동안의 채팅 내역을 볼 수 있습니다
2. **KakaoTalk 스타일 답글**: 특정 메시지에 대해 답글을 남길 수 있습니다
3. **관리자 모더레이션**: 관리자는 부적절한 메시지를 숨기거나 삭제할 수 있습니다
4. **자동 아카이브**: 매일 오전 3시에 지난 24시간의 채팅을 TXT 파일로 저장하고 AI가 요약합니다
5. **Tips 섹션에서 열람**: 저장된 채팅 아카이브는 Tips 페이지에서 확인 가능합니다

## 배포 방법

### 1. Firebase Functions 배포

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 2. Gemini API 키 설정

Cloud Functions에서 Gemini API를 사용하려면 환경 변수를 설정해야 합니다:

```bash
firebase functions:config:set gemini.apikey="YOUR_GEMINI_API_KEY"
```

설정 후 함수를 다시 배포:

```bash
firebase deploy --only functions
```

### 3. Firestore 인덱스 생성

Firebase Console에서 다음 인덱스를 생성하세요:

**Collection: `global_chat_messages`**
- Fields: `timestamp` (Ascending), `__name__` (Ascending)

**Collection: `chat_archives`**
- Fields: `endTime` (Descending), `__name__` (Ascending)

또는 앱을 실행하면 Firebase에서 자동으로 인덱스 생성 링크를 제공합니다.

### 4. Firebase Storage 권한 설정

Storage 버킷에 아카이브 파일을 저장하고 public 접근을 허용해야 합니다.
Firebase Console > Storage > Rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat_archives/{fileName} {
      allow read: if true;  // 모든 사용자가 아카이브 다운로드 가능
      allow write: if false; // Functions만 쓰기 가능
    }

    // 다른 파일들은 기존 규칙 유지
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Cloud Function 설명

### `archiveDailyChat`
- **스케줄**: 매일 오전 3시 (Asia/Seoul 시간대)
- **동작**:
  1. 지난 24시간의 모든 채팅 메시지를 Firestore에서 가져옵니다
  2. 메시지를 TXT 파일로 변환하여 Firebase Storage에 업로드합니다
  3. Gemini AI를 사용하여 채팅 내용을 3-5줄로 요약합니다
  4. `chat_archives` 컬렉션에 아카이브 문서를 생성합니다
  5. (선택사항) 24시간 이상 된 메시지를 삭제합니다

## 수동 테스트

아카이브 함수를 수동으로 테스트하려면:

```bash
# Firebase Console > Functions > archiveDailyChat > TEST 버튼 클릭
# 또는 Firebase CLI 사용:
firebase functions:shell
> archiveDailyChat()
```

## 채팅 기능 사용법

### 일반 사용자
1. **채팅 보기**: Cam & Chat 페이지에서 CCTV를 시청하며 채팅에 참여
2. **답글 작성**: 메시지 옆의 "↩" 버튼을 클릭하여 해당 메시지에 답글 작성
3. **아카이브 열람**: Tips 페이지에서 지난 채팅 기록 확인 및 TXT 파일 다운로드

### 관리자
1. **메시지 숨기기**: 부적절한 메시지 옆의 "👁" 버튼 클릭
2. **메시지 삭제**: 메시지 옆의 "🗑" 버튼 클릭하여 영구 삭제
3. **숨겨진 메시지 확인**: 관리자만 숨겨진 메시지를 볼 수 있습니다 (빨간 테두리로 표시)

## 데이터 구조

### Firestore Collections

#### `global_chat_messages`
```typescript
{
  id: string;
  cctvId: string;           // 참고용 (어느 CCTV를 보면서 작성했는지)
  userId: string;
  username: string;
  message: string;
  timestamp: Timestamp;
  type: 'user' | 'ai';
  isSlashCommand?: boolean;
  replyTo?: string;         // 답글 대상 메시지 ID
  replyToUsername?: string;
  replyToMessage?: string;  // 미리보기용
  hidden?: boolean;         // 관리자가 숨김 처리
  deletedBy?: string;       // 삭제한 관리자 ID
}
```

#### `chat_archives`
```typescript
{
  id: string;
  startTime: Timestamp;     // 24시간 시작 시간
  endTime: Timestamp;       // 24시간 종료 시간
  messageCount: number;
  summary: string;          // AI 생성 요약
  txtFileUrl: string;       // Firebase Storage URL
  createdAt: Timestamp;
}
```

## 비용 관리

### Firestore
- 24시간 동안 채팅 메시지가 누적됩니다
- 매일 자동 아카이브 후 오래된 메시지 삭제 가능 (functions/index.js의 주석 부분 활성화)

### Cloud Functions
- 매일 1회 실행 (무료 할당량 내)
- Gemini API 호출 1회 (요약 생성용)

### Storage
- TXT 파일 크기는 일반적으로 1MB 미만
- 월 5GB 무료 저장 공간 제공

## 문제 해결

### 아카이브가 생성되지 않는 경우
1. Firebase Console > Functions에서 `archiveDailyChat` 함수 로그 확인
2. Gemini API 키가 올바르게 설정되었는지 확인
3. Storage 버킷 권한이 올바른지 확인

### 채팅이 표시되지 않는 경우
1. Firestore 인덱스가 생성되었는지 확인
2. 브라우저 콘솔에서 에러 메시지 확인
3. Firebase Console에서 `global_chat_messages` 컬렉션 확인

### 답글이 작동하지 않는 경우
1. 브라우저를 새로고침
2. 메시지 ID가 올바르게 저장되는지 확인

## 향후 개선 사항

- [ ] 특정 키워드로 아카이브 검색 기능
- [ ] 아카이브 통계 (가장 활발한 시간대, 인기 키워드 등)
- [ ] 다국어 AI 요약 지원
- [ ] 이미지/파일 첨부 기능
- [ ] 채팅 알림 기능
