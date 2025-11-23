import React, { useState, useEffect } from 'react';

interface DebugLog {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

const DebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // console.log 오버라이드
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      addLog(message, 'info');
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      addLog(message, 'error');
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error') => {
    const newLog: DebugLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('ko-KR'),
      message,
      type
    };

    setLogs(prev => [...prev.slice(-50), newLog]); // 최근 50개만 유지
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[9999] bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors text-sm font-medium"
      >
        🐛 디버그
      </button>
    );
  }

  return (
    <div className={`fixed z-[9999] bg-black bg-opacity-95 text-white shadow-2xl transition-all ${
      isMinimized
        ? 'bottom-4 right-4 w-48'
        : 'bottom-4 right-4 w-[90vw] md:w-[500px]'
    }`}
    style={{
      maxHeight: isMinimized ? '60px' : '70vh',
      borderRadius: '12px',
      border: '2px solid #8B5CF6'
    }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-purple-800 bg-purple-900">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐛</span>
          <h3 className="font-bold text-sm">디버그 로그</h3>
          <span className="text-xs text-purple-300">({logs.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMinimized ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              )}
            </svg>
          </button>
          <button
            onClick={clearLogs}
            className="text-purple-300 hover:text-white transition-colors text-xs"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-purple-300 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 로그 리스트 */}
      {!isMinimized && (
        <div className="overflow-y-auto p-2 space-y-1" style={{ maxHeight: 'calc(70vh - 60px)' }}>
          {logs.length === 0 ? (
            <div className="text-center text-purple-400 py-8 text-sm">
              로그가 없습니다
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded text-xs font-mono break-all ${
                  log.type === 'error'
                    ? 'bg-red-900 bg-opacity-30 border-l-4 border-red-500'
                    : log.type === 'success'
                    ? 'bg-green-900 bg-opacity-30 border-l-4 border-green-500'
                    : 'bg-purple-900 bg-opacity-30 border-l-4 border-purple-500'
                }`}
              >
                <div className="text-purple-300 mb-1">{log.timestamp}</div>
                <div className="whitespace-pre-wrap">{log.message}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
