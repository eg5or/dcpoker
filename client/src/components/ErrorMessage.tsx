import { useEffect, useState } from 'react';

interface ErrorMessageProps {
  message: string | null;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setIsClosing(false);
    } else {
      setVisible(false);
    }
  }, [message]);

  // Автоматически скрываем сообщение об ошибке через 5 секунд
  useEffect(() => {
    if (!message) return;
    
    const timer = setTimeout(() => {
      setIsClosing(true);
      // Ждем завершения анимации
      setTimeout(() => setVisible(false), 300);
    }, 5000); // Уменьшаем время отображения до 5 секунд
    
    return () => clearTimeout(timer);
  }, [message]);

  const handleClose = () => {
    setIsClosing(true);
    // Ждем завершения анимации
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible || !message) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 max-w-sm bg-red-500 text-white p-4 rounded-lg shadow-lg flex items-center justify-between z-50 transition-all duration-300 ${
        isClosing ? 'opacity-0 transform -translate-y-2' : 'opacity-100'
      }`}
    >
      <div className="mr-3">{message}</div>
      <button
        onClick={handleClose}
        className="text-white hover:text-gray-200 focus:outline-none"
        aria-label="Закрыть сообщение"
      >
        ✕
      </button>
    </div>
  );
} 