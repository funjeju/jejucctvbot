import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { ChatArchive } from '../types';

interface ChatArchiveBoardProps {
  language: 'KOR' | 'ENG' | 'CHN';
}

const translations = {
  KOR: {
    title: '채팅 아카이브',
    subtitle: '30분 단위 저장 + 24시간 AI 브리핑',
    noArchives: '아직 보관된 채팅 기록이 없습니다',
    messages: '개 메시지',
    viewDetails: '상세보기',
    download: 'TXT 다운로드',
    summary: '요약',
    period: '기간',
    loading: '로딩 중...',
  },
  ENG: {
    title: 'Chat Archive',
    subtitle: 'Chat records saved every 24 hours',
    noArchives: 'No archived chats yet',
    messages: ' messages',
    viewDetails: 'View Details',
    download: 'Download TXT',
    summary: 'Summary',
    period: 'Period',
    loading: 'Loading...',
  },
  CHN: {
    title: '聊天存档',
    subtitle: '每24小时保存的聊天记录',
    noArchives: '还没有存档的聊天记录',
    messages: ' 条消息',
    viewDetails: '查看详情',
    download: '下载TXT',
    summary: '摘要',
    period: '时间段',
    loading: '加载中...',
  },
};

const ChatArchiveBoard: React.FC<ChatArchiveBoardProps> = ({ language }) => {
  const [archives, setArchives] = useState<ChatArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArchive, setSelectedArchive] = useState<ChatArchive | null>(null);
  const t = translations[language];

  // Firestore에서 아카이브 목록 로드
  useEffect(() => {
    console.log('채팅 아카이브 리스너 설정 중...');
    const archivesRef = collection(db, 'chat_archives');
    const q = query(
      archivesRef,
      orderBy('endTime', 'desc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const archivesArray: ChatArchive[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          archivesArray.push({
            id: doc.id,
            startTime: data.startTime,
            endTime: data.endTime,
            messageCount: data.messageCount,
            summary: data.summary,
            txtFileUrl: data.txtFileUrl,
            createdAt: data.createdAt,
          });
        });
        setArchives(archivesArray);
        setIsLoading(false);
        console.log(`${archivesArray.length}개의 아카이브 로드됨`);
      },
      (error) => {
        console.error('아카이브 로딩 실패:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString(language === 'KOR' ? 'ko-KR' : language === 'ENG' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString(language === 'KOR' ? 'ko-KR' : language === 'ENG' ? 'en-US' : 'zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 lg:pb-0">
      {/* 헤더 */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t.title}</h2>
            <p className="text-sm text-gray-600">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* 아카이브 목록 */}
      {archives.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t.noArchives}</h3>
          <p className="text-gray-600">채팅은 30분 단위로 자동 저장되며, AI가 24시간마다 브리핑합니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {archives.map((archive) => (
            <div
              key={archive.id}
              className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedArchive(archive)}
            >
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {formatDateShort(archive.startTime)}
                    </span>
                    <span className="text-xs text-gray-500">→</span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {formatDateShort(archive.endTime)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {archive.messageCount}{t.messages}
                  </p>
                </div>
                <a
                  href={archive.txtFileUrl}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t.download}
                </a>
              </div>

              {/* AI 요약 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t.summary}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {archive.summary || '요약이 생성되지 않았습니다.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세보기 모달 */}
      {selectedArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{t.title}</h3>
                <p className="text-sm text-gray-600">
                  {formatDate(selectedArchive.startTime)} - {formatDate(selectedArchive.endTime)}
                </p>
              </div>
              <button
                onClick={() => setSelectedArchive(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">{t.messages}</p>
                  <p className="text-lg font-bold text-indigo-600">{selectedArchive.messageCount}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t.summary}</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedArchive.summary || '요약이 생성되지 않았습니다.'}
                    </p>
                  </div>
                </div>

                <a
                  href={selectedArchive.txtFileUrl}
                  download
                  className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t.download}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArchiveBoard;
