import { FormEvent, useRef, useState } from 'react';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { AVAILABLE_EMOJIS, FIBONACCI_SEQUENCE, Room } from '../../types';

interface EditRoomModalProps {
  room: Room;
  onClose: () => void;
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => Promise<Room | null>;
}

export const EditRoomModal = ({ room, onClose, onUpdateRoom }: EditRoomModalProps) => {
  const roomId = room.id || room._id;
  const [roomName, setRoomName] = useState<string>(room.name);
  const [description, setDescription] = useState<string>(room.description || '');
  const [selectedEmoji, setSelectedEmoji] = useState<string>(room.emoji || AVAILABLE_EMOJIS[0]);
  const [allowObservers, setAllowObservers] = useState<boolean>(
    room.settings?.allowObservers !== undefined ? room.settings.allowObservers : true
  );
  const [autoReveal, setAutoReveal] = useState<boolean>(
    room.settings?.autoReveal !== undefined ? room.settings.autoReveal : false
  );
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
    
    if (!roomId) {
      setError('ID комнаты не определен');
      return;
    }
    
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

    const settings = {
      votingSequence: FIBONACCI_SEQUENCE,
      allowObservers,
      autoReveal
    };

    try {
      const updates: Partial<Room> = {
        name: roomName.trim(),
        description: description.trim() || undefined,
        emoji: selectedEmoji,
        settings
      };
      
      console.log('[EditRoomModal] Отправляем запрос на обновление комнаты:', roomId, updates);
      
      const updatedRoom = await onUpdateRoom(roomId as string, updates);
      if (updatedRoom) {
        console.log('[EditRoomModal] Комната успешно обновлена:', updatedRoom);
        onClose();
      } else {
        setError('Не удалось обновить комнату. Попробуйте еще раз');
      }
    } catch (e: any) {
      console.error('[EditRoomModal] Ошибка при обновлении комнаты:', e);
      setError(e?.message || 'Ошибка при обновлении комнаты. Попробуйте еще раз');
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
        <h2 className="text-xl text-white font-bold mb-4">Редактирование комнаты</h2>
        
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
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-white mb-2">
              Описание (необязательно):
            </label>
            <textarea
              id="description"
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание комнаты"
              rows={2}
            />
          </div>
          
          <div className="mb-4">
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
          
          <div className="mb-6">
            <h3 className="block text-white mb-2">Настройки комнаты:</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="allowObservers"
                  type="checkbox"
                  checked={allowObservers}
                  onChange={() => setAllowObservers(!allowObservers)}
                  className="mr-2 h-4 w-4"
                />
                <label htmlFor="allowObservers" className="text-white">
                  Разрешить наблюдателей
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="autoReveal"
                  type="checkbox"
                  checked={autoReveal}
                  onChange={() => setAutoReveal(!autoReveal)}
                  className="mr-2 h-4 w-4"
                />
                <label htmlFor="autoReveal" className="text-white">
                  Автоматическое раскрытие карт
                </label>
              </div>
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 