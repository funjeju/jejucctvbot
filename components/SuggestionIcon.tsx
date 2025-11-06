import React from 'react';

interface SuggestionIconProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  hasPending: boolean;
  className?: string;
}

const SuggestionIcon: React.FC<SuggestionIconProps> = ({ onClick, hasPending, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`relative text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1 ${className}`}
      aria-label="View suggestions"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {hasPending && (
        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
      )}
    </button>
  );
};

export default SuggestionIcon;
