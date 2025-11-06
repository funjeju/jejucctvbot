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
  }, []);

  // 실시간 메시지 리스너 (통합 채팅방)
  useEffect(() => {
    console.log('통합 채팅방 리스너 설정 중...');
    const messagesRef = collection(db, 'global_chat_messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          cctvId: data.cctvId || '',
          userId: data.userId,
          username: data.username,
          message: data.message,
          timestamp: data.timestamp,
          type: data.type || 'user',
          isSlashCommand: data.isSlashCommand || false,
        });
      });
      // 최신 메시지가 아래로 가도록 역순 정렬
      setMessages(newMessages.reverse());
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

      // Gemini AI에게 자연어로 질문하고 적절한 기능 선택
      const systemPrompt = `당신은 제주도 실시간 CCTV 채팅방의 친근한 AI 가이드입니다.
사용자의 질문 의도를 파악하여 적절하게 응답하세요.

**제공 가능한 기능:**
1. **chat** - 인사, 일반 대화, 도움말 요청
2. **weather** - 날씨 관련 질문 (실시간 기상청 API)
3. **guide** - 관광지, 맛집, 명소 정보 (제주 데이터베이스)
4. **nearby** - 현재 위치 주변 명소 추천

**응답 형식:**
사용자 의도를 분석하여 JSON으로만 응답하세요.

\`\`\`json
{
  "action": "chat" | "weather" | "guide" | "nearby",
  "params": {
    "location": "제주" | "서귀포" | "성산포" | "고산" | "중문" | "한림" | "추자도" | "우도",
    "query": "검색 키워드",
    "message": "자유 응답 텍스트 (chat일 때만)"
  }
}
\`\`\`

**예시:**
- "하이" → {"action": "chat", "params": {"message": "안녕하세요! 제주 라이브 CCTV AI 가이드입니다. 날씨, 관광지, 주변 명소 정보를 알려드릴 수 있어요!"}}
- "안녕" → {"action": "chat", "params": {"message": "반갑습니다! 무엇을 도와드릴까요?"}}
- "도움말" → {"action": "chat", "params": {"message": "날씨 정보, 관광지 추천, 주변 명소를 물어보세요! 예: '오늘 날씨', '성산일출봉', '주변 맛집'"}}
- "날씨 어때?" → {"action": "weather", "params": {"location": "제주"}}
- "성산일출봉" → {"action": "guide", "params": {"query": "성산일출봉"}}
- "주변 뭐있어?" → {"action": "nearby"}
- "고마워" → {"action": "chat", "params": {"message": "천만에요! 제주 여행 즐기세요!"}}

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
        // 관광지 가이드
        const searchQuery = aiResponse.params?.query || query;

        const matchedSpots = spots.filter(spot =>
          spot.place_name.includes(searchQuery) ||
          spot.categories?.some(cat => cat.includes(searchQuery)) ||
          spot.tags?.some(tag => tag.includes(searchQuery))
        ).slice(0, 3);

        const matchedOrooms = orooms.filter(oroom =>
          oroom.name.includes(searchQuery)
        ).slice(0, 2);

        const matchedNews = news.filter(newsItem =>
          newsItem.title.includes(searchQuery) ||
          newsItem.keywords?.some(keyword => keyword.includes(searchQuery))
        ).slice(0, 2);

        let response = '';

        if (matchedSpots.length > 0) {
          response += `📍 **추천 관광지**\n`;
          matchedSpots.forEach(spot => {
            response += `• ${spot.place_name}`;
            if (spot.region) response += ` (${spot.region})`;
            response += '\n';
          });
          response += '\n';
        }

        if (matchedOrooms.length > 0) {
          response += `⛰ **추천 오름**\n`;
          matchedOrooms.forEach(oroom => {
            response += `• ${oroom.name} (난이도: ${oroom.difficulty})\n`;
          });
          response += '\n';
        }

        if (matchedNews.length > 0) {
          response += `📰 **최신 소식**\n`;
          matchedNews.forEach(newsItem => {
            response += `• ${newsItem.title}\n`;
          });
          response += '\n';
        }

        return response || `"${searchQuery}"에 대한 정보를 찾을 수 없습니다.`;
      }

      else if (aiResponse.action === 'nearby') {
        // 주변 명소
        if (cctv.latitude && cctv.longitude) {
          const nearbySpots = spots.filter(spot => {
            if (!spot.location) return false;
            const latDiff = Math.abs(spot.location.latitude - cctv.latitude!);
            const lngDiff = Math.abs(spot.location.longitude - cctv.longitude!);
            return latDiff < 0.1 && lngDiff < 0.1;
          }).slice(0, 5);

          if (nearbySpots.length > 0) {
            let response = `📹 **${cctv.title} 주변 명소**\n\n`;
            nearbySpots.forEach(spot => {
              response += `• ${spot.place_name}`;
              if (spot.region) response += ` (${spot.region})`;
              response += '\n';
            });
            return response;
          }
        }
        return '주변 명소 정보를 찾을 수 없습니다.';
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
        <button
          onClick={handleChangeUsername}
          className="text-sm bg-indigo-700 hover:bg-indigo-800 px-3 py-1 rounded-md transition-colors"
        >
          닉네임: {username}
        </button>
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
