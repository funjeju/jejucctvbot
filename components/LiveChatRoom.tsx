import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, WeatherSource, Place, OroomData, NewsItem, PointBox } from '../types';
import { collection, query, orderBy, limit, onSnapshot, addDoc, Timestamp as FirestoreTimestamp, where, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentWeather, JEJU_WEATHER_STATIONS } from '../services/weatherService';
import { claimPointBox, createPointBox, deletePointBox } from '../services/pointService';
import { fetchArchivedMessages, getPreviousTimeSlot, getTimeSlot } from '../services/archiveService';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// 다국어 텍스트
const chatTranslations = {
  KOR: {
    realTimeChat: '실시간 채팅',
    watching: '라이브 시청 중',
    locationOn: '위치 ON',
    locationOff: '위치 OFF',
    nickname: '닉네임',
    aiGuideHelp: '로 시작하면 AI 가이드가 답변합니다! (예: /아이와함께, /맛집)',
    noMessages: '아직 메시지가 없습니다. 첫 메시지를 보내보세요!',
    typeMessage: '메시지를 입력하세요...',
    send: '전송',
    pointBox: '포인트 박스',
    createPointBox: '포인트 박스 만들기',
    totalPoints: '총 포인트',
    maxClaims: '최대 수령 인원',
    distributionType: '분배 방식',
    equalDistribution: '균등 분배',
    randomDistribution: '랜덤 분배',
    create: '생성',
    cancel: '취소',
    claimPointBox: '받기',
    pointBoxClaimed: '포인트를 받았습니다!',
    pointBoxExpired: '만료된 포인트 박스입니다.',
    pointBoxEmpty: '포인트 박스가 소진되었습니다.',
    alreadyClaimed: '이미 받으셨습니다.',
    notEnoughPoints: '포인트가 부족합니다.',
    myPoints: '내 포인트',
  },
  ENG: {
    realTimeChat: 'Live Chat',
    watching: ' Live Viewing',
    locationOn: 'Location ON',
    locationOff: 'Location OFF',
    nickname: 'Nickname',
    aiGuideHelp: ' to get AI guide responses! (e.g., /family-friendly, /restaurants)',
    noMessages: 'No messages yet. Send the first message!',
    typeMessage: 'Type a message...',
    send: 'Send',
    pointBox: 'Point Box',
    createPointBox: 'Create Point Box',
    totalPoints: 'Total Points',
    maxClaims: 'Max Recipients',
    distributionType: 'Distribution Type',
    equalDistribution: 'Equal',
    randomDistribution: 'Random',
    create: 'Create',
    cancel: 'Cancel',
    claimPointBox: 'Claim',
    pointBoxClaimed: 'Points claimed!',
    pointBoxExpired: 'This point box has expired.',
    pointBoxEmpty: 'This point box is empty.',
    alreadyClaimed: 'You already claimed this.',
    notEnoughPoints: 'Not enough points.',
    myPoints: 'My Points',
  },
  CHN: {
    realTimeChat: '实时聊天',
    watching: ' 正在观看',
    locationOn: '位置开启',
    locationOff: '位置关闭',
    nickname: '昵称',
    aiGuideHelp: ' 开始即可获得AI导游回答！（例如：/亲子游，/餐厅）',
    noMessages: '还没有消息。发送第一条消息！',
    typeMessage: '输入消息...',
    send: '发送',
    pointBox: '积分盒',
    createPointBox: '创建积分盒',
    totalPoints: '总积分',
    maxClaims: '最大领取人数',
    distributionType: '分配方式',
    equalDistribution: '平均分配',
    randomDistribution: '随机分配',
    create: '创建',
    cancel: '取消',
    claimPointBox: '领取',
    pointBoxClaimed: '获得积分！',
    pointBoxExpired: '积分盒已过期。',
    pointBoxEmpty: '积分盒已空。',
    alreadyClaimed: '您已领取过。',
    notEnoughPoints: '积分不足。',
    myPoints: '我的积分',
  }
};

interface LiveChatRoomProps {
  cctv: WeatherSource;
  spots: Place[];
  orooms: OroomData[];
  news: NewsItem[];
  language: 'KOR' | 'ENG' | 'CHN';
  onNavigateToSpot?: (placeId: string) => void;
}

const LiveChatRoom: React.FC<LiveChatRoomProps> = ({ cctv, spots, orooms, news, language, onNavigateToSpot }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showPointBoxModal, setShowPointBoxModal] = useState(false);
  const [pointBoxTotal, setPointBoxTotal] = useState(100);
  const [pointBoxMaxClaims, setPointBoxMaxClaims] = useState(5);
  const [pointBoxDistType, setPointBoxDistType] = useState<'equal' | 'random'>('equal');
  const [activePointBoxes, setActivePointBoxes] = useState<PointBox[]>([]);
  const [claimingBoxId, setClaimingBoxId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // 무한 스크롤 관련 상태
  const [archivedMessages, setArchivedMessages] = useState<ChatMessage[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [loadedHours, setLoadedHours] = useState(0); // 로드된 시간 추적
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const t = chatTranslations[language];
  const { userProfile } = useAuth();

  // 사용자 ID 및 닉네임 초기화
  useEffect(() => {
    let storedUserId = localStorage.getItem('jejuChatUserId');
    let storedUsername = localStorage.getItem('jejuChatUsername');

    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('jejuChatUserId', storedUserId);
    }

    if (!storedUsername) {
      const randomNames = ['제주여행러', '감귤러버', '한라산등반가', '바다구경꾼', '오름탐험가', '제주맛집러'];
      storedUsername = `${randomNames[Math.floor(Math.random() * randomNames.length)]}${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('jejuChatUsername', storedUsername);
    }

    setUserId(storedUserId);
    setUsername(storedUsername);

    // 저장된 위치 정보 불러오기
    const storedLocation = localStorage.getItem('userLocation');
    if (storedLocation) {
      try {
        const coords = JSON.parse(storedLocation);
        setUserLocation(coords);
        setLocationEnabled(true);
      } catch (error) {
        console.error('저장된 위치 정보 파싱 실패:', error);
        localStorage.removeItem('userLocation');
      }
    }
  }, []);

  // 실시간 메시지 리스너 (통합 채팅방) - 최근 1시간 메시지만 로드 (나머지는 Storage에서 로드)
  useEffect(() => {
    console.log('통합 채팅방 리스너 설정 중 (1시간 메시지)...');
    const messagesRef = collection(db, 'global_chat_messages');

    // 최근 1시간 메시지만 로드 (나머지는 Storage에서 로드)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const cutoffTimestamp = FirestoreTimestamp.fromDate(oneHourAgo);

    const q = query(
      messagesRef,
      where('timestamp', '>=', cutoffTimestamp),
      orderBy('timestamp', 'asc'),
      limit(50) // 최근 50개만 로드
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesArray: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // 숨김 처리되지 않은 메시지만 표시 (관리자는 모두 볼 수 있음)
        if (!data.hidden || user?.role === 'admin') {
          messagesArray.push({
            id: doc.id,
            cctvId: data.cctvId || '',
            userId: data.userId,
            username: data.username,
            message: data.message,
            timestamp: data.timestamp,
            type: data.type || 'user',
            isSlashCommand: data.isSlashCommand || false,
            replyTo: data.replyTo,
            replyToUsername: data.replyToUsername,
            replyToMessage: data.replyToMessage,
            hidden: data.hidden || false,
            deletedBy: data.deletedBy,
            pointBoxId: data.pointBoxId,
          });
        }
      });
      setMessages(messagesArray);
      console.log(`최근 1시간 메시지 ${messagesArray.length}개 로드됨 (최대 50개)`);
    }, (error) => {
      console.error('메시지 리스너 에러:', error);
    });

    return () => unsubscribe();
  }, [user]); // user 의존성 추가 - 관리자 권한 확인용

  // 스크롤 이벤트 제거 - 수동 버튼으로 변경

  // 이전 1시간 메시지 로드 함수
  const loadOlderMessages = async () => {
    if (isLoadingOlder || !hasMoreMessages) return;

    // 제한 체크: 3시간 또는 1000개
    const totalMessages = archivedMessages.length + messages.length;
    if (loadedHours >= 3 || totalMessages >= 1000) {
      setHasMoreMessages(false);
      console.log('최대 로드 한도 도달 (3시간 또는 1000개)');
      return;
    }

    setIsLoadingOlder(true);

    try {
      // 1시간 전 시작 시간 계산
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - (loadedHours + 2)); // 현재 1시간 + 로드할 1시간
      const endTime = new Date();
      endTime.setHours(endTime.getHours() - (loadedHours + 1));

      console.log(`${loadedHours + 1}시간 전 메시지 로드 중...`);

      // 해당 시간대의 모든 30분 슬롯 로드
      const timeSlots: string[] = [];
      const current = new Date(startTime);

      while (current < endTime) {
        timeSlots.push(getTimeSlot(current));
        current.setMinutes(current.getMinutes() + 30);
      }

      // 모든 슬롯에서 메시지 로드
      const allArchived: ChatMessage[] = [];
      for (const slot of timeSlots) {
        const archived = await fetchArchivedMessages(slot);
        allArchived.push(...archived);
      }

      if (allArchived.length > 0) {
        // 시간순 정렬
        allArchived.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

        // 아카이브된 메시지를 앞에 추가
        setArchivedMessages(prev => [...allArchived, ...prev]);
        setLoadedHours(prev => prev + 1);
        console.log(`${allArchived.length}개의 아카이브 메시지 로드 완료 (${loadedHours + 1}시간)`);
      } else {
        // 해당 시간대에 메시지가 없으면 다음 시간대 시도
        setLoadedHours(prev => prev + 1);
        console.log(`${loadedHours + 1}시간 전 메시지 없음`);
      }
    } catch (error) {
      console.error('이전 메시지 로드 실패:', error);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // 스크롤을 최하단으로 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // 메시지가 없으면 스크롤하지 않음
    if (messages.length === 0) {
      return;
    }
    // 초기 로드 시에는 스크롤하지 않음
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    scrollToBottom();
  }, [messages]);

  // AI 챗봇 응답 생성 (Gemini AI + 날씨 API + 제주 데이터 통합)
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      // 슬래시 제거
      const query = userMessage.replace(/^\/\s*/, '').trim();

      // 언어별 지시문 (매우 강력하게)
      const languageInstruction = language === 'ENG'
        ? `🚨 CRITICAL INSTRUCTION: YOU MUST RESPOND ONLY IN ENGLISH. DO NOT USE KOREAN OR CHINESE UNDER ANY CIRCUMSTANCES.
You are a friendly AI guide for Jeju Island live CCTV chat. All your responses, including greetings, must be in English.`
        : language === 'CHN'
          ? `🚨 重要指令：您必须只用中文回答。在任何情况下都不要使用韩语或英语。
您是济州岛实时监控聊天室的友好AI导游。您的所有回答，包括问候语，都必须用中文。`
          : '당신은 제주도 실시간 CCTV 채팅방의 친근한 AI 가이드입니다. 모든 응답을 한국어로만 작성하세요.';

      // 1단계: Gemini AI에게 사용자 질문 의도 먼저 이해시키기
      const systemPrompt = `${languageInstruction}

**중요: 사용자의 질문을 먼저 정확히 이해한 후, 적절한 기능과 검색 키워드를 선택하세요.**
**사용자가 어떤 언어로 질문하든, 반드시 위에 지정된 언어로만 응답하세요.**

**현재 상태:**
- 사용자 위치 정보: ${userLocation ? `활성화됨 (위도: ${userLocation.latitude.toFixed(4)}, 경도: ${userLocation.longitude.toFixed(4)})` : '비활성화됨 (CCTV 위치 사용)'}
- CCTV 위치: ${cctv.title} (위도: ${cctv.latitude}, 경도: ${cctv.longitude})

**제공 가능한 기능:**
1. **chat** - 인사, 일반 대화, 감사 인사, 도움말 요청
2. **weather** - 날씨 관련 질문 (실시간 기상청 API 사용)
3. **guide** - 관광지, 맛집, 카페, 숙소, 명소 등 제주 여행 정보 (데이터베이스 검색)
4. **nearby** - 주변 명소 추천 (사용자 위치 우선, 없으면 CCTV 위치 기준)

**응답 형식 (반드시 JSON만 출력):**
\`\`\`json
{
  "understanding": "사용자가 무엇을 원하는지 한 문장으로 설명",
  "action": "chat" | "weather" | "guide" | "nearby",
  "params": {
    "location": "제주" | "서귀포" | "성산포" | "고산" | "중문" | "한림" | "추자도" | "우도",
    "category": "맛집" | "카페" | "관광지" | "숙소" | "오름" | "해변" | "전체",
    "query": "정확한 검색 키워드 (사용자 질문의 핵심 단어만)",
    "message": "자유 응답 텍스트 (chat일 때만)"
  }
}
\`\`\`

**예시 - 정확한 이해와 응답:**
- "하이" → {"understanding": "인사", "action": "chat", "params": {"message": "안녕하세요! 제주 라이브 CCTV AI 가이드입니다. 날씨, 관광지, 맛집 정보를 알려드릴 수 있어요!"}}
- "고마워" → {"understanding": "감사 인사", "action": "chat", "params": {"message": "천만에요! 제주 여행 즐기세요!"}}
- "도움말" → {"understanding": "사용법 문의", "action": "chat", "params": {"message": "날씨 정보, 관광지 추천, 맛집/카페 검색을 도와드려요! 예: '오늘 날씨', '성산일출봉', '흑돼지 맛집', '주변 카페'"}}
- "날씨 어때?" → {"understanding": "제주 날씨 문의", "action": "weather", "params": {"location": "제주"}}
- "서귀포 날씨" → {"understanding": "서귀포 날씨 문의", "action": "weather", "params": {"location": "서귀포"}}
- "맛집" → {"understanding": "맛집 추천 요청", "action": "guide", "params": {"category": "맛집", "query": ""}}
- "식당" → {"understanding": "식당/맛집 추천 요청", "action": "guide", "params": {"category": "맛집", "query": ""}}
- "음식점" → {"understanding": "음식점/맛집 추천 요청", "action": "guide", "params": {"category": "맛집", "query": ""}}
- "흑돼지 맛집" → {"understanding": "흑돼지 맛집 검색", "action": "guide", "params": {"category": "맛집", "query": "흑돼지"}}
- "고기집" → {"understanding": "고기 맛집 검색", "action": "guide", "params": {"category": "맛집", "query": "고기"}}
- "카페" → {"understanding": "카페 추천 요청", "action": "guide", "params": {"category": "카페", "query": ""}}
- "카페 추천" → {"understanding": "카페 추천 요청", "action": "guide", "params": {"category": "카페", "query": ""}}
- "성산일출봉" → {"understanding": "성산일출봉 정보 요청", "action": "guide", "params": {"category": "관광지", "query": "성산일출봉"}}
- "오름" → {"understanding": "오름 정보 요청", "action": "guide", "params": {"category": "오름", "query": ""}}
- "주변 뭐있어?" → {"understanding": "주변 명소 문의 (사용자 위치 또는 CCTV 위치 기준)", "action": "nearby", "params": {"category": "전체"}}
- "근처 식당" → {"understanding": "주변 맛집 검색 (사용자 위치 또는 CCTV 위치 기준)", "action": "nearby", "params": {"category": "맛집"}}
- "여기 주변 카페" → {"understanding": "주변 카페 검색 (사용자 위치 또는 CCTV 위치 기준)", "action": "nearby", "params": {"category": "카페"}}

**중요한 규칙:**
1. "맛집", "식당", "음식점", "고기집", "회집" 등은 모두 category를 "맛집"으로 설정
2. "카페", "커피숍", "디저트" 등은 category를 "카페"로 설정
3. "오름", "산", "등산" 등은 category를 "오름"으로 설정
4. 카테고리 단어만 입력한 경우 (예: "맛집", "카페", "오름") query는 빈 문자열("")로 설정
5. 특정 키워드가 있는 경우만 query에 입력 (예: "흑돼지 맛집" → query: "흑돼지")
6. understanding 필드로 사용자 의도를 명확히 파악했음을 보여줄 것

현재 CCTV 위치: ${cctv.title}
CCTV GPS: ${cctv.latitude}, ${cctv.longitude}`;

      const result = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n사용자 질문: ${query}` }]
            }]
          })
        }
      );

      const data = await result.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      // JSON 추출
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI 응답 파싱 실패');
      }

      const aiResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      // 기능 실행
      if (aiResponse.action === 'chat') {
        // 일반 대화
        return aiResponse.params?.message || '반갑습니다!';
      }

      else if (aiResponse.action === 'weather') {
        // 날씨 정보 가져오기
        const location = aiResponse.params?.location || '제주';
        const weatherData = await getCurrentWeather(location as keyof typeof JEJU_WEATHER_STATIONS);

        if (weatherData) {
          return `🌤 **${location} 실시간 날씨**\n\n` +
            `🌡 온도: ${weatherData.temperature}°C\n` +
            `💧 습도: ${weatherData.humidity}%\n` +
            `💨 풍속: ${weatherData.windSpeed}m/s (${weatherData.windDirection})\n` +
            `🌧 강수: ${weatherData.precipitation}mm\n` +
            `☁️ 날씨: ${weatherData.weather}\n` +
            `📊 기압: ${weatherData.pressure}hPa\n\n` +
            `⏰ 관측시간: ${weatherData.observationTime}`;
        } else {
          return `죄송합니다. ${location} 지역의 날씨 정보를 가져올 수 없습니다.`;
        }
      }

      else if (aiResponse.action === 'guide') {
        // 2단계: AI 기반 의미론적 검색
        const searchQuery = (aiResponse.params?.query || '').trim();
        const category = aiResponse.params?.category || '전체';
        const userIntent = aiResponse.understanding || query;

        console.log(`[AI 검색] 카테고리: ${category}, 키워드: "${searchQuery}", 의도: "${userIntent}"`);

        // 카테고리별 필터링
        let candidateSpots = spots.filter(spot => {
          if (category === '전체') return true;
          // 오름 카테고리는 spots에서 제외 (orooms만 사용)
          if (category === '오름') return false;
          return spot.categories?.some(cat => cat.includes(category)) ||
            (category === '맛집' && spot.categories?.some(cat => cat.includes('음식점') || cat.includes('식당') || cat.includes('한식') || cat.includes('중식') || cat.includes('일식') || cat.includes('양식'))) ||
            (category === '카페' && spot.categories?.some(cat => cat.includes('카페') || cat.includes('디저트') || cat.includes('베이커리')));
        });

        let candidateOrooms = (category === '오름' || category === '전체') ? orooms : [];

        // 검색어가 있으면 AI에게 의미론적 매칭 요청
        if (searchQuery.length > 0 && (candidateSpots.length > 0 || candidateOrooms.length > 0)) {
          console.log(`[AI 의미 검색] ${candidateSpots.length}개 장소, ${candidateOrooms.length}개 오름 분석 중...`);

          // AI에게 데이터베이스 제공하고 관련성 판단 요청
          const semanticPrompt = `사용자가 "${userIntent}"를 찾고 있습니다.

아래 데이터베이스에서 사용자의 요청과 관련있는 장소를 찾아주세요.

**데이터베이스:**
${candidateSpots.slice(0, 30).map((spot, idx) =>
            `${idx + 1}. ${spot.place_name} | 지역: ${spot.region || spot.address || '없음'} | 카테고리: ${spot.categories?.join(', ') || '없음'} | 설명: ${spot.description?.substring(0, 80) || '없음'}`
          ).join('\n')}

${candidateOrooms.slice(0, 10).map((oroom, idx) =>
            `${candidateSpots.length + idx + 1}. ${oroom.name} (오름) | 위치: ${oroom.location || '없음'} | 난이도: ${oroom.difficulty || '없음'}`
          ).join('\n')}

**요청사항:**
1. 위 데이터에서 사용자 요청 "${userIntent}"와 의미적으로 관련있는 장소를 찾으세요
2. **중요**: 사용자가 지역명(예: 애월, 서귀포, 한림 등)을 언급한 경우, 반드시 해당 지역의 장소만 선택하세요
3. 관련도가 높은 순서로 최대 5개만 선택하세요
4. 반드시 JSON 배열로만 응답하세요

**응답 형식 (JSON 배열만):**
\`\`\`json
[1, 5, 12]
\`\`\`

관련된 장소가 없으면 빈 배열 []을 반환하세요.`;

          try {
            const semanticResult = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: semanticPrompt }] }]
                })
              }
            );

            const semanticData = await semanticResult.json();
            const semanticText = semanticData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            const jsonMatch = semanticText.match(/```json\s*([\s\S]*?)\s*```/) || semanticText.match(/\[[\s\S]*?\]/);

            if (jsonMatch) {
              const selectedIndices: number[] = JSON.parse(jsonMatch[1] || jsonMatch[0]);
              console.log(`[AI 선택] ${selectedIndices.length}개 장소 선택됨:`, selectedIndices);

              let response = '';
              const allItems = [...candidateSpots.slice(0, 30), ...candidateOrooms.slice(0, 10)];

              selectedIndices.slice(0, 5).forEach(idx => {
                const item = allItems[idx - 1];
                if (!item) return;

                if ('difficulty' in item) {
                  // 오름
                  if (!response.includes('⛰ **추천 오름**')) {
                    response += `⛰ **추천 오름**\n\n`;
                  }
                  response += `• ${item.name}`;
                  if (item.difficulty) response += ` (난이도: ${item.difficulty})`;
                  if (item.location) response += `\n  위치: ${item.location}`;
                  response += '\n';
                } else {
                  // 일반 장소
                  if (!response.includes('🍽️') && !response.includes('☕') && !response.includes('📍')) {
                    const icon = category === '맛집' ? '🍽️' : category === '카페' ? '☕' : '📍';
                    response += `${icon} **추천 ${category}**\n\n`;
                  }
                  response += `• ${item.place_name}`;
                  if (item.region) response += ` (${item.region})`;
                  if (item.description) {
                    const shortDesc = item.description.substring(0, 50);
                    response += `\n  ${shortDesc}${item.description.length > 50 ? '...' : ''}`;
                  }
                  response += '\n';
                }
              });

              if (response) return response;
            }
          } catch (error) {
            console.error('[AI 의미 검색 실패]', error);
            // AI 실패 시 기존 키워드 검색으로 폴백
          }
        }

        // AI 실패 또는 검색어 없을 때 기존 방식
        let response = '';

        if (candidateSpots.length > 0) {
          let matchedSpots = candidateSpots;
          if (searchQuery.length > 0) {
            matchedSpots = matchedSpots.filter(spot =>
              spot.place_name.includes(searchQuery) ||
              spot.categories?.some(cat => cat.includes(searchQuery)) ||
              spot.tags?.some(tag => tag.includes(searchQuery)) ||
              spot.description?.includes(searchQuery)
            );
          }
          matchedSpots = matchedSpots.slice(0, 5);

          if (matchedSpots.length > 0) {
            const icon = category === '맛집' ? '🍽️' : category === '카페' ? '☕' : '📍';
            response += `${icon} **추천 ${category}**\n\n`;
            matchedSpots.forEach(spot => {
              response += `• ${spot.place_name}`;
              if (spot.region) response += ` (${spot.region})`;
              if (spot.description) {
                const shortDesc = spot.description.substring(0, 50);
                response += `\n  ${shortDesc}${spot.description.length > 50 ? '...' : ''}`;
              }
              response += '\n';
            });
            response += '\n';
          }
        }

        if (candidateOrooms.length > 0) {
          let matchedOrooms = candidateOrooms;
          if (searchQuery.length > 0) {
            matchedOrooms = matchedOrooms.filter(oroom =>
              oroom.name.includes(searchQuery) || oroom.location?.includes(searchQuery)
            );
          }

          // 위치 기반 정렬 (사용자 위치 우선, 없으면 CCTV 위치)
          const baseLocation = userLocation || (cctv.latitude && cctv.longitude ? { latitude: cctv.latitude, longitude: cctv.longitude } : null);

          if (baseLocation) {
            // Haversine 공식으로 거리 계산
            const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
              const R = 6371;
              const dLat = (lat2 - lat1) * Math.PI / 180;
              const dLon = (lon2 - lon1) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              return R * c;
            };

            matchedOrooms = matchedOrooms
              .map(oroom => ({
                oroom,
                distance: oroom.latitude && oroom.longitude
                  ? calculateDistance(baseLocation.latitude, baseLocation.longitude, oroom.latitude, oroom.longitude)
                  : 999999
              }))
              .sort((a, b) => a.distance - b.distance)
              .slice(0, 5)
              .map(item => item.oroom);
          } else {
            matchedOrooms = matchedOrooms.slice(0, 5);
          }

          if (matchedOrooms.length > 0) {
            const locationSource = userLocation ? '내 위치' : cctv.title;
            const locationIcon = userLocation ? '📍' : '📹';
            response += `⛰ **${locationIcon} ${locationSource} 기준 주변 오름**\n\n`;
            matchedOrooms.forEach(oroom => {
              response += `• ${oroom.name}`;
              if (oroom.difficulty) response += ` (난이도: ${oroom.difficulty})`;
              if (oroom.location) response += `\n  위치: ${oroom.location}`;
              response += '\n';
            });
            response += '\n';
          }
        }

        return response || (searchQuery.length > 0
          ? `"${searchQuery}"에 대한 ${category === '전체' ? '정보' : category}를 찾을 수 없습니다.`
          : `등록된 ${category}가 없습니다.`);
      }

      else if (aiResponse.action === 'nearby') {
        // 주변 명소 검색 (카테고리 필터링 포함)
        const category = aiResponse.params?.category || '전체';

        // 위치 우선순위: 1) 사용자 GPS 위치, 2) CCTV 위치
        const baseLocation = userLocation || (cctv.latitude && cctv.longitude ? { latitude: cctv.latitude, longitude: cctv.longitude } : null);
        const locationSource = userLocation ? '내 위치' : cctv.title;

        console.log(`[AI 주변 검색] 카테고리: ${category}, 기준 위치: ${locationSource}`);

        if (baseLocation) {
          const nearbySpots = spots.filter(spot => {
            if (!spot.location) return false;

            // 거리 필터
            const latDiff = Math.abs(spot.location.latitude - baseLocation.latitude);
            const lngDiff = Math.abs(spot.location.longitude - baseLocation.longitude);
            const isNearby = latDiff < 0.1 && lngDiff < 0.1;

            if (!isNearby) return false;

            // 카테고리 필터
            if (category === '전체') return true;
            return spot.categories?.some(cat => cat.includes(category)) ||
              (category === '맛집' && spot.categories?.some(cat => cat.includes('음식점'))) ||
              (category === '카페' && spot.categories?.some(cat => cat.includes('카페')));
          }).slice(0, 5);

          if (nearbySpots.length > 0) {
            const icon = category === '맛집' ? '🍽️' : category === '카페' ? '☕' : '📹';
            const locationIcon = userLocation ? '📍' : '📹';
            let response = `${icon} **${locationIcon} ${locationSource} 기준 주변 ${category === '전체' ? '명소' : category}**\n\n`;
            nearbySpots.forEach(spot => {
              response += `• ${spot.place_name}`;
              if (spot.region) response += ` (${spot.region})`;
              if (spot.categories && spot.categories.length > 0) {
                response += `\n  카테고리: ${spot.categories.slice(0, 2).join(', ')}`;
              }
              response += '\n';
            });
            return response;
          }
        }
        return `주변 ${category === '전체' ? '명소' : category} 정보를 찾을 수 없습니다.`;
      }

      return '죄송합니다. 요청을 이해하지 못했습니다. 다시 시도해주세요.';

    } catch (error) {
      console.error('AI 응답 생성 실패:', error);
      return '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.';
    }
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !userId || !username) return;

    const isSlashCommand = inputMessage.trim().startsWith('/');

    setIsLoading(true);

    try {
      const messagesRef = collection(db, 'global_chat_messages');

      // 사용자 메시지 저장
      const userMessage: Omit<ChatMessage, 'id'> = {
        cctvId: cctv.id, // 어떤 CCTV를 보면서 채팅했는지 참고용
        userId,
        username,
        message: inputMessage.trim(),
        timestamp: FirestoreTimestamp.now() as any,
        type: 'user',
        isSlashCommand,
        // 답글 정보 추가
        ...(replyingTo && {
          replyTo: replyingTo.id,
          replyToUsername: replyingTo.username,
          replyToMessage: replyingTo.message.substring(0, 50), // 미리보기용 50자
        }),
      };

      await addDoc(messagesRef, userMessage);

      // 슬래시 명령어면 AI 응답 생성
      if (isSlashCommand) {
        const aiResponse = await generateAIResponse(inputMessage);

        const aiMessage: Omit<ChatMessage, 'id'> = {
          cctvId: cctv.id,
          userId: 'ai_bot',
          username: 'AI 가이드',
          message: aiResponse,
          timestamp: FirestoreTimestamp.now() as any,
          type: 'ai',
          isSlashCommand: false,
        };

        await addDoc(messagesRef, aiMessage);
      }

      setInputMessage('');
      setReplyingTo(null); // 답글 모드 해제
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키로 전송
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 닉네임 변경
  const handleChangeUsername = () => {
    const newUsername = prompt('새로운 닉네임을 입력하세요:', username);
    if (newUsername && newUsername.trim()) {
      setUsername(newUsername.trim());
      localStorage.setItem('jejuChatUsername', newUsername.trim());
    }
  };

  // 위치 권한 요청
  const requestLocation = async (isRetry: boolean = false) => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setUserLocation(coords);
      setLocationEnabled(true);
      localStorage.setItem('userLocation', JSON.stringify(coords));
      alert(`위치 기반 검색이 활성화되었습니다.\n위도: ${coords.latitude.toFixed(4)}, 경도: ${coords.longitude.toFixed(4)}`);
      return true;
    } catch (error: any) {
      console.error('위치 권한 오류:', error);

      // 재시도가 아닌 경우(최초 시도)에만 에러 메시지를 보여주지 않음
      // 재시도인 경우에만 에러 메시지 표시
      if (isRetry) {
        if (error.code === 1) { // PERMISSION_DENIED
          alert('위치 권한이 여전히 거부되었습니다.\n브라우저 설정에서 위치 접근을 허용해주세요.');
        } else {
          alert('위치 정보를 가져올 수 없습니다. 다시 시도해주세요.');
        }
      }
      return false;
    }
  };

  // 위치 토글 핸들러
  const handleLocationToggle = async () => {
    if (locationEnabled) {
      // 위치 비활성화
      setLocationEnabled(false);
      setUserLocation(null);
      localStorage.removeItem('userLocation');
      alert('위치 기반 검색이 비활성화되었습니다.');
    } else {
      // 위치 활성화 요청
      await requestLocation();
    }
  };

  // 답글 모드 시작
  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  // 답글 모드 취소
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // 최근 포인트 박스 리스너 (활성/비활성 모두 포함하여 상태 표시)
  useEffect(() => {
    const boxesRef = collection(db, 'pointBoxes');
    const q = query(
      boxesRef,
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const boxes: PointBox[] = [];
      snapshot.forEach((doc) => {
        boxes.push({ id: doc.id, ...doc.data() } as PointBox);
      });
      setActivePointBoxes(boxes);
    });

    return () => unsubscribe();
  }, []);

  // 포인트 박스 생성
  const handleCreatePointBox = async () => {
    if (!user || !userProfile) {
      alert('로그인이 필요합니다.');
      return;
    }

    const currentPoints = userProfile.points || 0;
    if (currentPoints < pointBoxTotal) {
      alert(t.notEnoughPoints);
      return;
    }

    try {
      const boxId = await createPointBox(
        user.uid,
        userProfile.displayName || username,
        pointBoxTotal,
        pointBoxMaxClaims,
        pointBoxDistType
      );

      if (boxId) {
        // 로컬 상태에 즉시 추가 (레이스 컨디션 방지)
        const expiredAt = new Date();
        expiredAt.setHours(expiredAt.getHours() + 24);

        const newBox: PointBox = {
          id: boxId,
          creatorId: user.uid,
          creatorName: userProfile.displayName || username,
          totalPoints: pointBoxTotal,
          remainingPoints: pointBoxTotal,
          maxClaims: pointBoxMaxClaims,
          claimedCount: 0,
          claimedBy: [],
          distributionType: pointBoxDistType,
          isActive: true,
          createdAt: new Date() as any,
          expiredAt: expiredAt as any,
        };
        setActivePointBoxes(prev => [newBox, ...prev]);

        // 채팅에 포인트 박스 알림 메시지 추가
        const messagesRef = collection(db, 'global_chat_messages');
        await addDoc(messagesRef, {
          cctvId: cctv.id,
          userId: user.uid,
          username: userProfile.displayName || username,
          message: `🎁 포인트 박스를 열었습니다! (${pointBoxTotal}P, ${pointBoxMaxClaims}명)`,
          timestamp: FirestoreTimestamp.now(),
          type: 'pointbox',
          pointBoxId: boxId,
        });

        setShowPointBoxModal(false);
        setPointBoxTotal(100);
        setPointBoxMaxClaims(5);
        setPointBoxDistType('equal');
      }
    } catch (error) {
      console.error('포인트 박스 생성 실패:', error);
      alert('포인트 박스 생성에 실패했습니다.');
    }
  };

  // 포인트 박스 수령
  const handleClaimPointBox = async (boxId: string) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 본인이 만든 박스인지 확인
    const box = activePointBoxes.find(b => b.id === boxId);
    if (box && box.creatorId === user.uid) {
      alert('본인이 만든 포인트 박스는 받을 수 없습니다.');
      return;
    }

    setClaimingBoxId(boxId);

    try {
      const result = await claimPointBox(boxId, user.uid);

      if (result.success) {
        const claimedPoints = result.claimedPoints;
        // 로컬 상태 업데이트 (즉시 UI 반영)
        setActivePointBoxes(prev => prev.map(box => {
          if (box.id === boxId) {
            const newClaimedCount = box.claimedCount + 1;
            return {
              ...box,
              claimedBy: [...box.claimedBy, user.uid],
              claimedCount: newClaimedCount,
              remainingPoints: box.remainingPoints - claimedPoints,
              isActive: newClaimedCount < box.maxClaims && (box.remainingPoints - claimedPoints) > 0,
            };
          }
          return box;
        }));

        alert(`${t.pointBoxClaimed} +${claimedPoints}P`);
      } else {
        // Use specific error messages from the service
        alert(result.message);
      }
    } catch (error) {
      console.error('포인트 박스 수령 실패:', error);
      alert('포인트 박스 수령에 실패했습니다.');
    } finally {
      setClaimingBoxId(null);
    }
  };

  // 포인트 박스 삭제
  const handleDeletePointBox = async (boxId: string) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!confirm('포인트 박스를 삭제하시겠습니까? 남은 포인트는 환불됩니다.')) {
      return;
    }

    try {
      const result = await deletePointBox(boxId, user.uid, user.role || 'user');

      if (result.success) {
        // 로컬 상태에서 제거
        setActivePointBoxes(prev => prev.filter(box => box.id !== boxId));
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('포인트 박스 삭제 실패:', error);
      alert('포인트 박스 삭제에 실패했습니다.');
    }
  };

  // 메시지 숨김 처리 (관리자 전용)
  const handleHideMessage = async (messageId: string) => {
    if (user?.role !== 'admin') {
      alert('관리자만 메시지를 숨길 수 있습니다.');
      return;
    }

    if (!confirm('이 메시지를 숨기시겠습니까?')) return;

    try {
      const messageRef = doc(db, 'global_chat_messages', messageId);
      await updateDoc(messageRef, {
        hidden: true,
      });
      console.log('메시지 숨김 처리 완료:', messageId);
    } catch (error) {
      console.error('메시지 숨김 실패:', error);
      alert('메시지 숨김에 실패했습니다.');
    }
  };

  // 메시지 삭제 (관리자 전용)
  const handleDeleteMessage = async (messageId: string) => {
    if (user?.role !== 'admin') {
      alert('관리자만 메시지를 삭제할 수 있습니다.');
      return;
    }

    if (!confirm('이 메시지를 완전히 삭제하시겠습니까?')) return;

    try {
      const messageRef = doc(db, 'global_chat_messages', messageId);
      await deleteDoc(messageRef);
      console.log('메시지 삭제 완료:', messageId);
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      alert('메시지 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg flex flex-col h-[500px] lg:h-[600px]">
      {/* 채팅방 헤더 */}
      <div className="bg-indigo-600 text-white p-3 sm:p-4 rounded-t-lg">
        <h3 className="text-base sm:text-lg font-bold mb-2">{t.realTimeChat}</h3>
        <p className="text-xs sm:text-sm text-indigo-100 mb-2">
          {cctv.title}{t.watching}
        </p>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            onClick={handleLocationToggle}
            className={`text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${locationEnabled
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-indigo-700 hover:bg-indigo-800 text-white'
              }`}
            title={locationEnabled ? '위치 기반 검색 활성화됨' : '위치 기반 검색 비활성화'}
          >
            📍<span className="hidden sm:inline">{locationEnabled ? t.locationOn : t.locationOff}</span><span className="sm:hidden">{locationEnabled ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={handleChangeUsername}
            className="text-xs bg-indigo-700 hover:bg-indigo-800 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
          >
            <span className="opacity-70">{t.nickname}</span>
            <span className="font-bold">{username}</span>
          </button>
          {/* 포인트 표시 및 박스 버튼 */}
          {user && userProfile && (
            <>
              <span className="text-xs bg-purple-600 px-2 py-1 rounded-md flex items-center gap-1">
                💰 {(userProfile.points || 0).toLocaleString()}P
              </span>
              <button
                onClick={() => setShowPointBoxModal(true)}
                className="text-xs bg-yellow-500 hover:bg-yellow-600 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
              >
                🎁 {t.pointBox}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-xs sm:text-sm text-yellow-800">
        💡 <strong>/</strong>{t.aiGuideHelp}
      </div>

      {/* 메시지 목록 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
      >
        {/* 이전 대화 내용 보기 버튼 */}
        {hasMoreMessages && !isLoadingOlder && (
          <div className="text-center py-4">
            <button
              onClick={loadOlderMessages}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-md"
            >
              📜 이전 대화 내용 보기 ({loadedHours < 3 ? `${3 - loadedHours}시간 더 가능` : '최대'})
            </button>
          </div>
        )}

        {/* 로딩 인디케이터 */}
        {isLoadingOlder && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-sm text-gray-600 mt-2">이전 메시지 로드 중...</p>
          </div>
        )}

        {/* 더 이상 메시지가 없을 때 */}
        {!hasMoreMessages && (archivedMessages.length > 0 || messages.length > 0) && (
          <div className="text-center py-3">
            <p className="text-xs text-gray-400">📜 최대 로드 한도 도달 (3시간 또는 1000개)</p>
          </div>
        )}

        {archivedMessages.length === 0 && messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p>{t.noMessages}</p>
          </div>
        )}

        {/* 아카이브된 메시지 + 현재 메시지 합쳐서 표시 */}
        {[...archivedMessages, ...messages].map((msg) => {
          const isMyMessage = msg.userId === userId;
          const isAI = msg.type === 'ai';
          const isPointBox = (msg as any).type === 'pointbox';
          const isHidden = msg.hidden && user?.role !== 'admin';

          if (isHidden) return null; // 일반 사용자에게는 숨김 메시지 표시 안 함

          // 포인트 박스 메시지 특별 렌더링
          if (isPointBox) {
            const boxId = (msg as any).pointBoxId;
            if (!boxId) return null; // boxId가 없으면 렌더링하지 않음

            const cachedBox = activePointBoxes.find(b => b.id === boxId);

            return (
              <PointBoxItem
                key={msg.id}
                boxId={boxId}
                cachedBox={cachedBox}
                username={msg.username}
                currentUser={user}
                claimingBoxId={claimingBoxId}
                onClaim={handleClaimPointBox}
                onDelete={handleDeletePointBox}
              />
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isMyMessage && !isAI ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[85%]">
                {/* 답글 대상 미리보기 (KakaoTalk 스타일) */}
                {msg.replyTo && msg.replyToUsername && (
                  <div className={`text-xs mb-1 ${isMyMessage && !isAI ? 'text-right' : 'text-left'}`}>
                    <div className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded-md">
                      <span className="font-semibold">↩ {msg.replyToUsername}:</span> {msg.replyToMessage}
                    </div>
                  </div>
                )}

                <div
                  className={`
                    rounded-lg p-3 shadow-sm relative
                    ${isAI
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                      : isMyMessage
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }
                    ${msg.hidden ? 'opacity-50 border-red-500 border-2' : ''}
                  `}
                >
                  {/* 사용자 이름 */}
                  {!isMyMessage && (
                    <p className={`text-xs font-semibold mb-1 ${isAI ? 'text-yellow-200' : 'text-gray-600'}`}>
                      {isAI && '🤖 '}{msg.username}
                      {msg.hidden && user?.role === 'admin' && <span className="ml-2 text-red-300">(숨김)</span>}
                    </p>
                  )}

                  {/* 메시지 내용 */}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>

                  {/* 시간 및 액션 버튼 */}
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <p className={`text-xs ${isAI || isMyMessage ? 'text-indigo-100' : 'text-gray-400'}`}>
                      {msg.timestamp?.seconds
                        ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        : '방금 전'}
                    </p>

                    <div className="flex gap-1">
                      {/* 답글 버튼 (AI 메시지가 아닐 때만) */}
                      {!isAI && (
                        <button
                          onClick={() => handleReply(msg)}
                          className={`text-xs px-2 py-0.5 rounded transition-colors ${isMyMessage
                            ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                          title="답글"
                        >
                          ↩
                        </button>
                      )}

                      {/* 관리자 전용 버튼 */}
                      {user?.role === 'admin' && (
                        <>
                          {!msg.hidden && (
                            <button
                              onClick={() => handleHideMessage(msg.id)}
                              className="text-xs px-2 py-0.5 rounded bg-yellow-500 hover:bg-yellow-600 text-white transition-colors"
                              title="숨기기"
                            >
                              👁
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-xs px-2 py-0.5 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                            title="삭제"
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 */}
      <div className="border-t border-gray-200 p-2 sm:p-3 bg-white rounded-b-lg">
        {/* 답글 모드 표시 */}
        {replyingTo && (
          <div className="mb-2 bg-indigo-50 border-l-4 border-indigo-500 p-2 rounded flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-700">↩ {replyingTo.username}에게 답글</p>
              <p className="text-xs text-gray-600 truncate">{replyingTo.message}</p>
            </div>
            <button
              onClick={cancelReply}
              className="ml-2 text-gray-500 hover:text-gray-700 text-sm"
              title="취소"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-1 sm:gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`${t.typeMessage} ( / ${language === 'KOR' ? '로 AI 호출' : 'for AI'} )`}
            className="flex-1 px-2 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-indigo-600 text-white px-3 sm:px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
          >
            {isLoading ? (language === 'KOR' ? '전송 중...' : language === 'ENG' ? 'Sending...' : '发送中...') : t.send}
          </button>
        </div>
      </div>

      {/* 포인트 박스 생성 모달 */}
      {showPointBoxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t.createPointBox}</h3>

            <div className="space-y-4">
              {/* 현재 보유 포인트 */}
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">{t.myPoints}</p>
                <p className="text-2xl font-bold text-purple-600">{(userProfile?.points || 0).toLocaleString()}P</p>
              </div>

              {/* 총 포인트 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.totalPoints}</label>
                <input
                  type="number"
                  value={pointBoxTotal}
                  onChange={(e) => setPointBoxTotal(Math.max(10, Number(e.target.value)))}
                  min={10}
                  max={userProfile?.points || 0}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 최대 인원 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.maxClaims}</label>
                <input
                  type="number"
                  value={pointBoxMaxClaims}
                  onChange={(e) => setPointBoxMaxClaims(Math.max(1, Math.min(100, Number(e.target.value))))}
                  min={1}
                  max={100}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 분배 방식 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.distributionType}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPointBoxDistType('equal')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${pointBoxDistType === 'equal'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {t.equalDistribution}
                  </button>
                  <button
                    onClick={() => setPointBoxDistType('random')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${pointBoxDistType === 'random'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {t.randomDistribution}
                  </button>
                </div>
              </div>

              {/* 미리보기 */}
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                {pointBoxDistType === 'equal' ? (
                  <p>1인당 {Math.floor(pointBoxTotal / pointBoxMaxClaims)}P씩 지급</p>
                ) : (
                  <p>랜덤하게 분배 (최소 1P ~ 최대 {Math.floor(pointBoxTotal * 0.7)}P)</p>
                )}
              </div>
            </div>

            {/* 포인트 부족 안내 */}
            {(userProfile?.points || 0) < 10 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {language === 'KOR'
                  ? '포인트가 부족합니다. 피드를 등록하거나 포인트 박스를 받아 포인트를 모아보세요!'
                  : language === 'ENG'
                    ? 'Insufficient points. Upload feeds or claim point boxes to earn points!'
                    : '积分不足。上传动态或领取积分盒来赚取积分！'}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPointBoxModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleCreatePointBox}
                disabled={pointBoxTotal > (userProfile?.points || 0) || pointBoxTotal < 10}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {t.create}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 별도 컴포넌트로 분리하여 개별 데이터 로딩 처리
function PointBoxItem({ boxId, cachedBox, username, currentUser, claimingBoxId, onClaim, onDelete }: {
  boxId: string;
  cachedBox?: PointBox;
  username: string;
  currentUser: any;
  claimingBoxId: string | null;
  onClaim: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [box, setBox] = useState<PointBox | undefined>(cachedBox);
  const [loading, setLoading] = useState(!cachedBox);

  useEffect(() => {
    if (cachedBox) {
      setBox(cachedBox);
      setLoading(false);
      return;
    }

    // 캐시된 데이터가 없으면 직접 구독
    const unsubscribe = onSnapshot(doc(db, 'pointBoxes', boxId), (doc) => {
      if (doc.exists()) {
        setBox({ id: doc.id, ...doc.data() } as PointBox);
      }
      setLoading(false);
    }, (error) => {
      console.error('포인트 박스 개별 로드 실패:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boxId, cachedBox]);

  if (loading) {
    return (
      <div className="flex justify-center w-full my-2">
        <div className="bg-gray-50 rounded-xl p-4 shadow-sm max-w-[320px] w-full border border-gray-200 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="flex justify-center w-full my-2">
        <div className="bg-gray-100 rounded-xl p-4 shadow-sm max-w-[320px] w-full border border-gray-200 text-center">
          <p className="text-gray-400 text-xs">삭제되거나 유효하지 않은 포인트 박스입니다.</p>
        </div>
      </div>
    );
  }

  const isExpired = box.expiredAt && (box.expiredAt.toDate ? box.expiredAt.toDate() : new Date(box.expiredAt.seconds * 1000)) < new Date();
  const isSoldOut = box.claimedCount >= box.maxClaims || box.remainingPoints <= 0;
  const claimedBy = box.claimedBy || [];
  const alreadyClaimed = claimedBy.includes(currentUser?.uid || '');

  return (
    <div className="flex justify-center w-full my-2">
      <div className={`rounded-xl p-4 shadow-lg max-w-[320px] w-full border-2 ${isSoldOut || isExpired
        ? 'bg-gray-100 border-gray-200'
        : 'bg-white border-yellow-400'
        }`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">{username}님의 포인트 박스</p>
              <p className="text-xs text-gray-500">
                {box.distributionType === 'random' ? '🎲 랜덤 박스' : '⚖️ 균등 박스'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 삭제 버튼 (생성자 또는 관리자만) */}
            {currentUser && (box.creatorId === currentUser.uid || currentUser.role === 'admin') && (
              <button
                onClick={() => onDelete(boxId)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="포인트 박스 삭제"
              >
                🗑️
              </button>
            )}
            <div className={`px-2 py-1 rounded text-xs font-bold ${isSoldOut ? 'bg-gray-200 text-gray-500' :
              isExpired ? 'bg-red-100 text-red-500' :
                'bg-yellow-100 text-yellow-600'
              }`}>
              {isSoldOut ? '마감됨' : isExpired ? '만료됨' : '진행중'}
            </div>
          </div>
        </div>

        {/* 내용 */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex justify-between items-end mb-2">
            <span className="text-gray-600 text-xs">남은 포인트</span>
            <span className="font-bold text-indigo-600">
              {box.remainingPoints.toLocaleString()} <span className="text-xs text-gray-500">/ {box.totalPoints.toLocaleString()} P</span>
            </span>
          </div>

          {/* 진행률 바 */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${isSoldOut ? 'bg-gray-400' : 'bg-yellow-400'}`}
              style={{ width: `${(box.claimedCount / box.maxClaims) * 100}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>참여 인원</span>
            <span>{box.claimedCount} / {box.maxClaims}명</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        {currentUser ? (
          !isSoldOut && !isExpired && !alreadyClaimed ? (
            <button
              onClick={() => onClaim(boxId)}
              disabled={claimingBoxId === boxId}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg shadow transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              {claimingBoxId === boxId ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>⚡ 포인트 받기</span>
                </>
              )}
            </button>
          ) : (
            <button
              disabled
              className={`w-full py-2 rounded-lg font-bold text-sm ${alreadyClaimed
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-200 text-gray-400'
                }`}
            >
              {alreadyClaimed ? '✅ 이미 받았습니다' : isSoldOut ? '❌ 선착순 마감' : '⏰ 기간 만료'}
            </button>
          )
        ) : (
          <p className="text-center text-xs text-gray-400">로그인 후 참여 가능</p>
        )}
      </div>
    </div>
  );
};

export default LiveChatRoom;
