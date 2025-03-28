import { useState } from 'react';

interface HeaderProps {
  userName: string;
  onLogout: () => void;
  onProfileClick: () => void;
}

export const Header = ({ userName, onLogout, onProfileClick }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <header className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">Scrum Poker</h1>
        </div>
        
        <div className="relative">
          <button 
            className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md transition duration-200"
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
                    onProfileClick();
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
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Профиль
                  </div>
                </button>
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
    </header>
  );
}; 