import { FormEvent, useRef, useState } from 'react';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { AVAILABLE_EMOJIS } from '../../types';

interface CreateRoomModalProps {
  onClose: () => void;
  onCreateRoom: (name: string, emoji: string) => Promise<void>;
}

export const CreateRoomModal = ({ onClose, onCreateRoom }: CreateRoomModalProps) => {
  const [roomName, setRoomName] = useState<string>('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>(AVAILABLE_EMOJIS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Закрываем модальное окно при клике вне его
  useOnClickOutside(modalRef, () => {
    if (!isSubmitting) {
      onClose();
    }
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Проверка на валидность введенного имени
    if (!roomName.trim()) {
      setError('Введите название комнаты');
      return;
    }

    if (roomName.trim().length < 3) {
      setError('Название комнаты должно содержать минимум 3 символа');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreateRoom(roomName.trim(), selectedEmoji);
    } catch (e) {
      setError('Ошибка при создании комнаты');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md animate-fadeIn"
      >
        <h2 className="text-xl text-white font-bold mb-4">Создание новой комнаты</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-300">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="roomName" className="block text-white mb-2">
              Название комнаты:
            </label>
            <input
              id="roomName"
              type="text"
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Введите название комнаты"
              autoFocus
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-white mb-2">
              Эмодзи комнаты:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`h-12 w-12 flex items-center justify-center text-2xl rounded transition-colors ${
                    selectedEmoji === emoji
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Создание...' : 'Создать комнату'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 