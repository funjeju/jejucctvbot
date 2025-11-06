import React, { useState } from 'react';
import type { Suggestion, Timestamp } from '../types';
import Button from './common/Button';
import Textarea from './common/Textarea';

interface SuggestionPopoverProps {
  suggestions: Suggestion[];
  onAdd: (content: string) => void;
  onResolve: (suggestionId: string, resolution: 'accepted' | 'rejected') => void;
  onClose: () => void;
}

const SuggestionCard: React.FC<{ suggestion: Suggestion; onResolve: (id: string, res: 'accepted' | 'rejected') => void; }> = ({ suggestion, onResolve }) => {
    const statusMap = {
        pending: 'bg-yellow-100 text-yellow-800',
        accepted: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };
    return (
        <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-gray-700">{suggestion.author}</p>
                 <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusMap[suggestion.status]}`}>
                    {suggestion.status}
                </span>
            </div>
            <p className="text-sm text-gray-800 mb-3 whitespace-pre-wrap">{suggestion.content}</p>
            <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">
                    {new Date(suggestion.createdAt.seconds * 1000).toLocaleString()}
                </p>
                {suggestion.status === 'pending' && (
                     <div className="flex space-x-2">
                        <button onClick={() => onResolve(suggestion.id, 'rejected')} className="text-xs font-semibold text-red-600 hover:underline">거절</button>
                        <button onClick={() => onResolve(suggestion.id, 'accepted')} className="text-xs font-semibold text-green-600 hover:underline">수락</button>
                    </div>
                )}
            </div>
        </div>
    )
}

const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({ suggestions, onAdd, onResolve, onClose }) => {
  const [newSuggestion, setNewSuggestion] = useState('');

  const handleAddClick = () => {
    if (newSuggestion.trim()) {
      onAdd(newSuggestion.trim());
      setNewSuggestion('');
    }
  };

  return (
    <div className="absolute z-20 w-80 max-h-96 bg-white rounded-xl shadow-2xl border flex flex-col right-0 mt-2">
        <header className="p-3 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
             <h3 className="font-semibold text-gray-800">제안하기</h3>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-800">&times;</button>
        </header>
        
        <main className="p-3 space-y-3 overflow-y-auto">
            {suggestions.length > 0 ? (
                suggestions.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds).map(s => <SuggestionCard key={s.id} suggestion={s} onResolve={onResolve} />)
            ) : (
                <p className="text-sm text-gray-500 text-center py-4">아직 제안이 없습니다.</p>
            )}
        </main>
        
        <footer className="p-3 border-t bg-gray-50 rounded-b-xl sticky bottom-0">
            <Textarea 
                label="새로운 제안 남기기"
                value={newSuggestion}
                onChange={e => setNewSuggestion(e.target.value)}
                rows={3}
                placeholder="수정 또는 보완할 내용을 입력하세요."
            />
            <Button onClick={handleAddClick} size="normal" fullWidth className="mt-2">
                제안 등록
            </Button>
        </footer>
    </div>
  );
};

export default SuggestionPopover;
