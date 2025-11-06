import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, WeatherSource, Place, OroomData, NewsItem } from '../types';
import { collection, query, orderBy, limit, onSnapshot, addDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GoogleGenAI } from '@google/genai';
import { getCurrentWeather, JEJU_WEATHER_STATIONS } from '../services/weatherService';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

interface LiveChatRoomProps {
  cctv: WeatherSource;
  spots: Place[];
  orooms: OroomData[];
  news: NewsItem[];
  onNavigateToSpot?: (placeId: string) => void;
}

const LiveChatRoom: React.FC<LiveChatRoomProps> = ({ cctv, spots, orooms, news, onNavigateToSpot }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  // 실시간 메시지 리스너 (통합 채팅방) - 접속 시점부터의 메시지만 표시
  useEffect(() => {
    console.log('통합 채팅방 리스너 설정 중...');
    const messagesRef = collection(db, 'global_chat_messages');

    // 현재 시간을 기준으로 저장
    const joinTime = Date.now();
    let isFirstLoad = true;

    const q = query(
      messagesRef,
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isFirstLoad) {
        // 첫 로드 시에는 기존 메시지를 무시
        isFirstLoad = false;
        console.log('첫 로드 완료 - 기존 메시지 무시');
        return;
      }

      // 두 번째 이후 스냅샷부터만 처리 (실시간 메시지만)
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const messageTimestamp = data.timestamp;

          // 접속 시점 이후의 메시지만 추가
          if (messageTimestamp && messageTimestamp.toMillis() >= joinTime) {
            const newMessage: ChatMessage = {
              id: change.doc.id,
              cctvId: data.cctvId || '',
              userId: data.userId,
              username: data.username,
              message: data.message,
              timestamp: data.timestamp,
              type: data.type || 'user',
              isSlashCommand: data.isSlashCommand || false,
            };

            setMessages((prev) => [...prev, newMessage]);
          }
        }
      });
    }, (error) => {
      console.error('메시지 리스너 에러:', error);
    });

    return () => unsubscribe();
  }, []); // cctv 의존성 제거 - 통합 채팅방이므로 한 번만 설정

  // 스크롤을 최하단으로 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI 챗봇 응답 생성 (Gemini AI + 날씨 API + 제주 데이터 통합)
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      // 슬래시 제거
      const query = userMessage.replace(/^\/\s*/, '').trim();

      // 1단계: Gemini AI에게 사용자 질문 의도 먼저 이해시키기
      const systemPrompt = `당신은 제주도 실시간 CCTV 채팅방의 친근한 AI 가이드입니다.

**중요: 사용자의 질문을 먼저 정확히 이해한 후, 적절한 기능과 검색 키워드를 선택하세요.**

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
  const requestLocation = async () => {
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
      console.error('위치 권한 거부:', error);

      // 권한이 거부된 경우 사용자에게 다시 시도할 수 있는 옵션 제공
      if (error.code === 1) { // PERMISSION_DENIED
        const retry = confirm('위치 권한이 거부되었습니다.\n\n브라우저 설정에서 위치 접근을 허용한 후 "확인"을 눌러 다시 시도해주세요.\n\n"취소"를 누르면 위치 기능을 사용하지 않습니다.');
        if (retry) {
          // 사용자가 확인을 누르면 다시 권한 요청
          return await requestLocation();
        }
      } else {
        alert('위치 정보를 가져올 수 없습니다. 다시 시도해주세요.');
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

  return (
    <div className="bg-white shadow-md rounded-lg flex flex-col h-[500px]">
      {/* 채팅방 헤더 */}
      <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">실시간 채팅</h3>
          <p className="text-sm text-indigo-100">
            {cctv.title} 라이브 시청 중
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocationToggle}
            className={`text-sm px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
              locationEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-indigo-700 hover:bg-indigo-800 text-white'
            }`}
            title={locationEnabled ? '위치 기반 검색 활성화됨' : '위치 기반 검색 비활성화'}
          >
            📍 {locationEnabled ? '위치 ON' : '위치 OFF'}
          </button>
          <button
            onClick={handleChangeUsername}
            className="text-sm bg-indigo-700 hover:bg-indigo-800 px-3 py-1 rounded-md transition-colors"
          >
            닉네임: {username}
          </button>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-sm text-yellow-800">
        💡 <strong>/</strong> 로 시작하면 AI 가이드가 답변합니다! (예: /성산일출봉, /맛집)
      </div>

      {/* 메시지 목록 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p>아직 메시지가 없습니다.</p>
            <p className="text-sm">첫 메시지를 남겨보세요!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMyMessage = msg.userId === userId;
          const isAI = msg.type === 'ai';

          return (
            <div
              key={msg.id}
              className={`flex ${isMyMessage && !isAI ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[70%] rounded-lg p-3 shadow-sm
                  ${isAI
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                    : isMyMessage
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                  }
                `}
              >
                {/* 사용자 이름 */}
                {!isMyMessage && (
                  <p className={`text-xs font-semibold mb-1 ${isAI ? 'text-yellow-200' : 'text-gray-600'}`}>
                    {isAI && '🤖 '}{msg.username}
                  </p>
                )}

                {/* 메시지 내용 */}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>

                {/* 시간 */}
                <p className={`text-xs mt-1 ${isAI || isMyMessage ? 'text-indigo-100' : 'text-gray-400'}`}>
                  {msg.timestamp?.seconds
                    ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '방금 전'}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 */}
      <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요... ( / 로 AI 호출 )"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '전송 중...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveChatRoom;
