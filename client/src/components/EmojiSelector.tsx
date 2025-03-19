import { useState } from 'react';
import { AVAILABLE_EMOJIS } from '../types';

interface EmojiSelectorProps {
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
}

export function EmojiSelector({ selectedEmoji, onSelectEmoji }: EmojiSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        className={`bg-gray-700 hover:bg-gray-600 p-3 rounded-lg flex items-center justify-center shadow transition-all ${
          isOpen ? 'ring-2 ring-blue-400' : ''
        }`}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-2xl mr-2">{selectedEmoji}</span>
        <span className="text-white">▼</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-14 left-0 w-48 bg-gray-800 rounded-lg p-2 shadow-xl z-10 grid grid-cols-5 gap-2">
          {AVAILABLE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className={`p-2 text-2xl rounded hover:bg-gray-700 transition-colors ${
                selectedEmoji === emoji ? 'bg-gray-600 ring-1 ring-blue-400' : ''
              }`}
              onClick={() => handleSelect(emoji)}
              aria-label={`Выбрать эмодзи ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 