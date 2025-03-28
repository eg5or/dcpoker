import { useState } from 'react';
import { EmojiSelector } from './EmojiSelector';
import { Tooltip } from './Tooltip';

interface HeaderProps {
  userName: string;
  onLogout: () => void;
  onProfileClick: () => void;
  onReveal: () => void;
  onReset: () => void;
  onResetUsers: () => void;
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
}

export const Header = ({ 
  userName, 
  onLogout, 
  onProfileClick, 
  onReveal, 
  onReset, 
  onResetUsers,
  selectedEmoji,
  onSelectEmoji
}: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Общие классы для кнопок управления
  const buttonClasses = "h-10 px-3 flex items-center justify-center text-white rounded transition-colors";
  
  return (
    <header className="bg-gray-800 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex flex-col items-start mr-4">
          <h1 className="text-xl font-bold">Scrum Poker</h1>
          <span className="text-xs text-gray-400 font-mono select-none">
            by eg5or &amp; <span className="text-blue-400">Cursor AI</span>
          </span>
        </div>
        
        {/* Кнопки управления игрой */}
        <div className="hidden sm:flex items-center space-x-2 mr-auto">
          <Tooltip content="Показать карты" position="bottom">
            <button
              onClick={onReveal}
              className={`${buttonClasses} bg-green-500 hover:bg-green-600 w-10`}
              aria-label="Показать карты"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </button>
          </Tooltip>
          
          <Tooltip content="Начать новое голосование" position="bottom">
            <button
              onClick={onReset}
              className={`${buttonClasses} bg-red-500 hover:bg-red-600 w-10`}
              aria-label="Начать новое голосование"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </Tooltip>
          
          <Tooltip content="Сбросить всех пользователей" position="bottom">
            <button
              onClick={onResetUsers}
              className={`${buttonClasses} bg-red-700 hover:bg-red-800 w-10`}
              aria-label="Сбросить всех пользователей"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </button>
          </Tooltip>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Выбор эмодзи */}
          <div className="hidden md:flex items-center bg-gray-700 h-10 p-1.5 rounded-lg">
            <p className="text-white mr-2 text-sm whitespace-nowrap">Эмодзи:</p>
            <EmojiSelector 
              selectedEmoji={selectedEmoji} 
              onSelectEmoji={onSelectEmoji} 
            />
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
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
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
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
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
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 5a1 1 0 10-2 0v3H5a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V8z" transform="rotate(45 10 10)" />
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
      
      {/* Мобильные кнопки управления */}
      <div className="sm:hidden container mx-auto px-4 py-2 border-t border-gray-700 flex justify-around">
        <Tooltip content="Показать карты" position="bottom">
          <button
            onClick={onReveal}
            className={`${buttonClasses} bg-green-500 hover:bg-green-600 w-10`}
            aria-label="Показать карты"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </button>
        </Tooltip>
        
        <Tooltip content="Начать новое голосование" position="bottom">
          <button
            onClick={onReset}
            className={`${buttonClasses} bg-red-500 hover:bg-red-600 w-10`}
            aria-label="Начать новое голосование"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </Tooltip>
        
        <Tooltip content="Сбросить всех пользователей" position="bottom">
          <button
            onClick={onResetUsers}
            className={`${buttonClasses} bg-red-700 hover:bg-red-800 w-10`}
            aria-label="Сбросить всех пользователей"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </button>
        </Tooltip>
        
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
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </button>
        </Tooltip>
        
        <div className="flex items-center h-10">
          <EmojiSelector 
            selectedEmoji={selectedEmoji} 
            onSelectEmoji={onSelectEmoji} 
          />
        </div>
      </div>
    </header>
  );
}; 