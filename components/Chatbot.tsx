import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { Place, OroomData, NewsItem, UserLocation } from '../types';
import Button from './common/Button';
import LocationPermissionModal from './LocationPermissionModal';
import { getCurrentLocation, formatLocationForDisplay, getLocationErrorMessage } from '../utils/locationUtils';
import { analyzeUserQuery, filterSpotsByRules, sortByDataQuality } from '../utils/chatbotFilters';

// API Key 설정 (Vite 환경 변수 사용)
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  spots: Place[];
  orooms: OroomData[];
  news: NewsItem[];
  onNavigateToSpot: (placeId: string) => void;
  onOpenNews?: (newsId: string) => void;
}

interface Recommendation {
  place_id: string;
  place_name: string;
  summary: string;
  image_url?: string;
  news_id?: string;
  updated_at?: string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  recommendations?: Recommendation[];
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, spots, orooms, news, onNavigateToSpot, onOpenNews }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLocationRequest = () => {
    setIsLocationModalOpen(true);
  };

  const handleAllowLocation = async () => {
    setIsLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setIsLocationModalOpen(false);

      setMessages(prev => [...prev, {
        role: 'ai',
        content: `📍 현재 위치가 반영되었습니다!\n${formatLocationForDisplay(location)}\n정확도: ${location.accuracy?.toFixed(0)}m\n측정시간: ${new Date(location.timestamp).toLocaleString()}\n\n⚠️ 위치가 정확하지 않다면 실외에서 다시 시도해주세요.\n\n이제 위치 기반 맞춤 추천을 제공할 수 있습니다. 무엇을 도와드릴까요?`
      }]);
    } catch (error: any) {
      alert(getLocationErrorMessage(error));
    } finally {
      setIsLocationLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !chat) {
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `
            You are a friendly and helpful conversational assistant for Jeju DB, a Jeju travel platform. Your name is 'Jeju DB AI 어시스턴트'.
            - Your answers MUST be in Korean.
            - Engage in natural, general conversation.
            - CRITICAL RULE: If a user's request for a recommendation is too vague or lacks context (e.g., "오름 추천해줘", "카페 찾아줘"), you MUST ask a clarifying question to get more information.
            - WHEN a user asks for travel recommendations and you have enough context, you MUST follow these steps:
              1. Use the provided JSON data of travel spots as your ONLY source of truth.
              2. Identify 1 to 3 relevant spots based on the user's query.
              3. Determine if this is a CURRENT STATUS QUERY (e.g., "억새 어때?", "꽃 피었어?", "요즘 어때?").
              4. For EACH recommended spot:
                  - If CURRENT STATUS QUERY and spot has latest_updates: Use image/news_id from latest_updates.
                  - If GENERAL RECOMMENDATION: Use the first image from spot's images array.
              5. Formulate your final response as a brief introductory sentence, followed by a JSON code block with "recommendations".
            - DO NOT recommend spots if they are not in the provided JSON data.
          `
        }
      });
      setChat(newChat);
      setMessages([
        { role: 'ai', content: '안녕하세요! Jeju DB AI 어시스턴트입니다. 라이브러리에 저장된 스팟 정보에 대해 무엇이든 물어보세요.' }
      ]);
    }
  }, [isOpen, chat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !chat) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    const currentInput = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 1단계: 사용자 질문 분석
      const queryAnalysis = analyzeUserQuery(currentInput);

      // 2단계: 전체 데이터 필터링 (지역/카테고리/키워드 등)
      let relevantSpots = filterSpotsByRules(spots, queryAnalysis);

      // 3단계: 품질순 정렬 후 상위 30개만 추출 (AI 비용 절감 핵심)
      relevantSpots = sortByDataQuality(relevantSpots).slice(0, 30);

      // 오름 데이터도 상위 20개로 제한
      const relevantOrooms = orooms.slice(0, 20);

      // 위치 기반 질문 여부 확인
      const isLocationBasedQuery = (queryAnalysis.regions && queryAnalysis.regions.length > 0) || (userLocation !== null && (currentInput.includes('근처') || currentInput.includes('주변')));

      const locationContext = userLocation ? `
        # USER LOCATION
        - Latitude: ${userLocation.latitude}
        - Longitude: ${userLocation.longitude}
        - Accuracy: ${userLocation.accuracy}m
      ` : '';

      const promptWithContext = `
        # AVAILABLE DATA (Jeju travel data)
        Here is the JSON data you can use to answer travel-related questions.
        ${isLocationBasedQuery ? '# FILTERED NEARBY DATA (within reasonable distance)' : '# ALL AVAILABLE DATA'}

        ## TRAVEL SPOTS (Top 30 relevant results)
        **IMPORTANT**: Each spot may have a 'latest_updates' field. Check it for current conditions.
        \`\`\`json
        ${JSON.stringify(relevantSpots.map(spot => ({
        ...spot,
        latest_updates: spot.latest_updates || []
      })), null, 2)}
        \`\`\`

        ## VOLCANIC CONES (Orooms - Top 20)
        \`\`\`json
        ${JSON.stringify(relevantOrooms, null, 2)}
        \`\`\`

        ## LATEST NEWS & UPDATES
        Check this section for seasonal updates, events, or closures.
        \`\`\`json
        ${JSON.stringify(news.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        related_spot_ids: n.related_spot_ids,
        location: n.location,
        published_at: n.published_at
      })), null, 2)}
        \`\`\`
        
        ${locationContext}

        # USER'S QUESTION
        ${currentInput}
      `;

      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      const stream = await chat.sendMessageStream({ message: promptWithContext });

      let fullResponseText = '';
      for await (const chunk of stream) {
        fullResponseText += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'ai') {
            lastMessage.content = fullResponseText;
          }
          return newMessages;
        });
      }

      // JSON 파싱 및 추천 목록 처리
      const jsonMatch = fullResponseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsedJson = JSON.parse(jsonMatch[1]);
          if (parsedJson.recommendations) {
            const introText = fullResponseText.substring(0, jsonMatch.index).trim();
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'ai') {
                lastMessage.content = introText;
                lastMessage.recommendations = parsedJson.recommendations;
              }
              return newMessages;
            });
          }
        } catch (e) {
          console.error("Failed to parse JSON from AI response:", e);
        }
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'ai') {
          lastMessage.content = '죄송합니다, 답변을 가져오는 중 오류가 발생했습니다.';
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 transition-transform transform-gpu">
      <header className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl">
        <h3 className="text-lg font-bold text-gray-800">Jeju DB AI 어시스턴트</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocationRequest}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${userLocation ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
          >
            {userLocation ? '📍 위치 반영됨' : '📍 내 위치 반영'}
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto bg-gray-100">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index}>
              <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-sm break-words ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
              {msg.recommendations && (
                <div className="mt-2 space-y-2">
                  {msg.recommendations.map(rec => (
                    <div key={rec.place_id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                      {rec.image_url && (
                        <div className="w-full h-40 bg-gray-200 relative">
                          <img src={rec.image_url} alt={rec.place_name} className="w-full h-full object-cover" />
                          {rec.updated_at && <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">📅 {rec.updated_at}</div>}
                        </div>
                      )}
                      <div className="p-3">
                        <h4 className="font-bold text-gray-800">{rec.place_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{rec.summary}</p>
                        <div className="mt-3 flex gap-2">
                          <Button onClick={() => onNavigateToSpot(rec.place_id)} variant="secondary" size="normal" className="flex-1">자세히 보기</Button>
                          {rec.news_id && onOpenNews && (
                            <Button onClick={() => onOpenNews(rec.news_id!)} variant="primary" size="normal" className="flex-1">📰 최신 소식</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-3 border-t bg-white rounded-b-2xl">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} className="rounded-full !px-4 !py-2">전송</Button>
        </div>
      </footer>

      <LocationPermissionModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onAllowLocation={handleAllowLocation}
        isLoading={isLocationLoading}
      />
    </div>
  );
};

export default Chatbot;