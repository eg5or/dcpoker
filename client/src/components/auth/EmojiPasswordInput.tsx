import { useEffect, useState } from 'react';
import { AVAILABLE_EMOJIS } from '../../types';

interface EmojiPasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
  error?: boolean;
}

export function EmojiPasswordInput({
  id,
  value,
  onChange,
  maxLength = 3,
  required = false,
  error = false
}: EmojiPasswordInputProps) {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  
  // Обновление внутреннего состояния при изменении внешнего значения
  useEffect(() => {
    // Используем spread operator для правильного разделения эмодзи
    setSelectedEmojis([...value]);
  }, [value]);
  
  // Обновление внешнего значения при изменении выбранных эмодзи
  useEffect(() => {
    // Сравниваем текущее значение с новым для предотвращения циклических обновлений
    if (value !== selectedEmojis.join('')) {
      onChange(selectedEmojis.join(''));
    }
  }, [selectedEmojis, onChange, value]);
  
  const handleEmojiClick = (emoji: string) => {
    if (selectedEmojis.length < maxLength) {
      setSelectedEmojis([...selectedEmojis, emoji]);
    }
  };
  
  const handleRemoveLastEmoji = () => {
    if (selectedEmojis.length > 0) {
      setSelectedEmojis(selectedEmojis.slice(0, -1));
    }
  };
  
  const handleClearAll = () => {
    setSelectedEmojis([]);
  };
  
  // Создаем массив из maxLength элементов для отображения слотов пароля
  const emojiSlots = Array(maxLength).fill(null);
  
  return (
    <div className="emoji-input-container">
      {/* Поле с выбранными эмодзи - теперь в виде трех фиксированных ячеек */}
      <div className="relative">
        <div 
          className={`w-full py-3 px-4 rounded-lg bg-gray-700 text-white flex items-center justify-between h-[64px] ${error ? 'border-2 border-red-500' : ''}`}
          tabIndex={0}
          aria-label="Ввод эмодзи-пароля"
        >
          <div className="flex items-center justify-start gap-3 flex-1">
            {emojiSlots.map((_, index) => (
              <div 
                key={index} 
                className={`emoji-slot w-12 h-12 rounded-lg flex items-center justify-center ${selectedEmojis[index] ? 'filled' : ''}`}
              >
                {selectedEmojis[index] ? (
                  <span className="text-2xl animate-pop-in">{selectedEmojis[index]}</span>
                ) : (
                  <span className="text-gray-400 text-2xl">•</span>
                )}
              </div>
            ))}
          </div>
          
          {/* Контейнер для кнопок с фиксированной шириной */}
          <div className="emoji-controls-container flex items-center ml-3 min-w-[72px] justify-end">
            <div className={`emoji-controls flex items-center space-x-2 transition-opacity duration-200 ${selectedEmojis.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
              <button
                type="button"
                onClick={handleRemoveLastEmoji}
                className="text-xs bg-gray-800 hover:bg-gray-600 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Удалить последний"
                disabled={selectedEmojis.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.707 4.879A3 3 0 018.828 4H15a3 3 0 013 3v6a3 3 0 01-3 3H8.828a3 3 0 01-2.12-.879l-4.415-4.414a1 1 0 010-1.414l4.414-4.414zm4 2.414a1 1 0 00-1.414 1.414L10.586 10l-1.293 1.293a1 1 0 101.414 1.414L12 11.414l1.293 1.293a1 1 0 001.414-1.414L13.414 10l1.293-1.293a1 1 0 00-1.414-1.414L12 8.586l-1.293-1.293z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs bg-gray-800 hover:bg-gray-600 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Очистить все"
                disabled={selectedEmojis.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.5 9.5a.5.5 0 011 0V11h1.5a.5.5 0 010 1H7.5v1.5a.5.5 0 01-1 0V12H5a.5.5 0 010-1h1.5V9.5z" clipRule="evenodd" transform="rotate(45 10 10)" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Клавиатура эмодзи без рамки */}
      <div className="mt-3 w-full">
        <div className="emoji-keyboard-grid grid grid-cols-5 gap-2">
          {AVAILABLE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="emoji-keyboard-button text-xl p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={selectedEmojis.length >= maxLength}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      
      {/* Скрытое поле для работы с формой */}
      <input
        type="hidden"
        id={id}
        value={selectedEmojis.join('')}
        required={required}
      />
    </div>
  );
} 