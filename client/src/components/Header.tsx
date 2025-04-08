import { useState } from 'react';
import { Room } from '../types';
import { EmojiSelector } from './EmojiSelector';
import { RoomSelector } from './rooms/RoomSelector';
import { Tooltip } from './Tooltip';

interface HeaderProps {
  userName: string;
  onLogout: () => void;
  onProfileClick: () => void;
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
  rooms: Room[];
  selectedRoom: Room | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: (name: string, description?: string, settings?: object, code?: string, emoji?: string) => Promise<Room | null>;
}

export const Header = ({
  userName,
  onLogout,
  onProfileClick,
  selectedEmoji,
  onSelectEmoji,
  rooms,
  selectedRoom,
  onSelectRoom,
  onCreateRoom,
}: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Общие классы для кнопок управления
  const buttonClasses =
    'h-10 px-3 flex items-center justify-center text-white rounded transition-colors';

  return (
    <header className="bg-gray-800 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex flex-col items-start mr-4">
          <h1 className="text-xl font-bold">Scrum Poker</h1>
          <span className="text-xs text-gray-400 font-mono select-none">
            by eg5or &amp; <span className="text-blue-400">Cursor AI</span>
          </span>
        </div>

        {/* Селектор комнаты */}
        <RoomSelector
          rooms={rooms}
          selectedRoom={selectedRoom}
          onSelectRoom={onSelectRoom}
          onCreateRoom={onCreateRoom}
        />

        <div className="flex items-center space-x-3">
          {/* Выбор эмодзи */}
          <div className="hidden md:flex items-center bg-gray-700 h-10 p-1.5 rounded-lg">
            <p className="text-white mr-2 text-sm whitespace-nowrap">Эмодзи:</p>
            <EmojiSelector selectedEmoji={selectedEmoji} onSelectEmoji={onSelectEmoji} />
          </div>

          {/* Кнопка профиля */}
          <Tooltip content="Профиль" position="bottom">
            <button
              onClick={onProfileClick}
              className={`${buttonClasses} bg-gray-700 hover:bg-gray-600 w-10`}
              aria-label="Профиль"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </Tooltip>

          <div className="relative">
            <button
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 h-10 px-3 py-2 rounded-md transition duration-200"
              onClick={toggleMenu}
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
            >
              <span className="font-medium">{userName}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10 animate-fadeIn">
                <div className="py-1">
                  <button
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-600 transition duration-200"
                    onClick={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 5a1 1 0 10-2 0v3H5a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V8z"
                          transform="rotate(45 10 10)"
                        />
                      </svg>
                      Выйти
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Мобильный выбор эмодзи */}
      <div className="sm:hidden container mx-auto px-4 py-2 border-t border-gray-700 flex justify-around">
        <div className="relative">
          <Tooltip content="Выбрать эмодзи" position="bottom">
            <button
              className={`${buttonClasses} bg-gray-700 hover:bg-gray-600 w-10`}
              aria-label="Выбрать эмодзи"
            >
              <div className="text-xl">{selectedEmoji}</div>
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
