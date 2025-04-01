import { useRef, useState } from 'react';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { Room } from '../../types';
import { CreateRoomModal } from './CreateRoomModal';

// Вспомогательная функция для получения ID комнаты
const getRoomId = (room: Room): string | undefined => {
  if (room.id && typeof room.id === 'string') {
    return room.id;
  }
  if (room._id && typeof room._id === 'string') {
    return room._id;
  }
  return undefined;
};

interface RoomSelectorProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: (name: string, description?: string, settings?: object, code?: string, emoji?: string) => Promise<Room | null>;
}

export const RoomSelector = ({ rooms, selectedRoom, onSelectRoom, onCreateRoom }: RoomSelectorProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => {
    setIsOpen(false);
  });

  const handleRoomSelect = (roomId: string) => {
    console.log('[RoomSelector] Выбрана комната с ID:', roomId);
    
    // Проверка, что roomId - это валидная строка
    if (!roomId || typeof roomId !== 'string' || roomId === 'undefined' || roomId === 'null') {
      console.error('[RoomSelector] Передан невалидный ID комнаты:', roomId);
      return;
    }
    
    onSelectRoom(roomId);
    setIsOpen(false);
  };

  const openCreateRoomModal = () => {
    setShowCreateModal(true);
    setIsOpen(false);
  };

  const handleCreateRoom = async (name: string, description?: string, settings?: object, code?: string, emoji?: string) => {
    console.log('[RoomSelector] Создание комнаты с параметрами:', { name, description, code, emoji });
    const newRoom = await onCreateRoom(name, description, settings, code, emoji);
    console.log('[RoomSelector] Результат создания комнаты:', newRoom);
    if (newRoom) {
      const roomId = getRoomId(newRoom);
      if (roomId) {
        console.log('[RoomSelector] Переход в созданную комнату:', roomId);
        onSelectRoom(roomId);
        setShowCreateModal(false);
      } else {
        console.error('[RoomSelector] Не удалось получить ID созданной комнаты:', newRoom);
      }
    }
  };

  return (
    <>
      <div className="relative mx-4" ref={dropdownRef}>
        <button
          className="flex items-center bg-gray-700 hover:bg-gray-600 rounded-md px-3 py-2 text-white transition"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="mr-2 flex items-center">
            {selectedRoom ? (
              <>
                <span className="mr-2 text-lg">{selectedRoom.emoji || selectedRoom.code.substring(0, 2)}</span>
                <span className="font-medium">{selectedRoom.name}</span>
              </>
            ) : (
              <span className="font-medium">Выберите комнату</span>
            )}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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

        {/* Выпадающий список комнат */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full min-w-[200px] bg-gray-700 rounded-md shadow-lg animate-fadeIn">
            <div className="py-1 max-h-60 overflow-y-auto">
              {rooms.length > 0 ? (
                rooms.map((room) => {
                  const roomId = getRoomId(room);
                  const selectedRoomId = selectedRoom ? getRoomId(selectedRoom) : null;
                  
                  return (
                    <button
                      key={roomId || `room-${Math.random()}`}
                      className={`w-full text-left px-4 py-2 text-white hover:bg-gray-600 transition flex items-center ${
                        selectedRoomId === roomId ? 'bg-gray-600' : ''
                      }`}
                      onClick={() => roomId && handleRoomSelect(roomId)}
                    >
                      <span className="mr-2 text-lg">{room.emoji || room.code.substring(0, 2)}</span>
                      <span>{room.name}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-2 text-gray-400 italic">Нет доступных комнат</div>
              )}
              
              {/* Кнопка создания новой комнаты */}
              <button
                className="w-full text-left px-4 py-2 text-white hover:bg-green-600 bg-green-700 transition mt-1 flex items-center"
                onClick={openCreateRoomModal}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Создать новую комнату</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно создания комнаты */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreateRoom={async (name, description, settings, code, emoji) => {
            return onCreateRoom(name, description, settings, code, emoji).then(newRoom => {
              if (newRoom) {
                const roomId = getRoomId(newRoom);
                if (roomId) {
                  console.log('[RoomSelector] Переход в созданную комнату:', roomId);
                  onSelectRoom(roomId);
                  setShowCreateModal(false);
                } else {
                  console.error('[RoomSelector] Не удалось получить ID созданной комнаты:', newRoom);
                }
              }
              return newRoom;
            });
          }}
        />
      )}
    </>
  );
}; 