import { Room } from '../../types';

interface LandingPageProps {
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  isLoading: boolean;
}

export const LandingPage = ({ rooms, onSelectRoom, onCreateRoom, isLoading }: LandingPageProps) => {
  // Проверяем, есть ли доступные комнаты
  const hasRooms = Array.isArray(rooms) && rooms.length > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] bg-gray-900 px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Scrum Poker</h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          Удобный инструмент для оценки задач в команде с помощью
          Planning Poker
        </p>
      </div>

      <div className="w-full max-w-5xl">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white mb-4 sm:mb-0">Доступные комнаты</h2>
              <button
                onClick={onCreateRoom}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition flex items-center"
                aria-label="Создать новую комнату"
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
                Создать новую комнату
              </button>
            </div>

            {hasRooms ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  // Получаем ID комнаты (может быть id или _id)
                  const roomId = room.id || room._id;
                  
                  return (
                    <button
                      key={roomId || `room-${Math.random()}`}
                      onClick={() => {
                        console.log('[LandingPage] Выбрана комната:', room.name, 'ID:', roomId);
                        console.log('[LandingPage] Полная структура объекта комнаты:', room);
                        
                        // Проверка валидности ID
                        if (!roomId || typeof roomId !== 'string') {
                          console.error('[LandingPage] Комната имеет невалидный ID:', roomId);
                          return;
                        }
                        
                        onSelectRoom(roomId);
                      }}
                      className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition transform hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{room.emoji || room.code.substring(0, 2)}</span>
                        <h3 className="text-xl font-semibold text-white">{room.name}</h3>
                      </div>
                      {room.description && (
                        <p className="text-gray-400 mb-2 line-clamp-2">{room.description}</p>
                      )}
                      <p className="text-gray-500 text-sm">
                        Последняя активность: {new Date(room.lastActivity).toLocaleString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-300 text-xl mb-4">Нет доступных комнат</p>
                <p className="text-gray-400 mb-6">
                  Создайте новую комнату, чтобы начать планирование
                </p>
                <button
                  onClick={onCreateRoom}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-md transition"
                  aria-label="Создать комнату"
                >
                  Создать комнату
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 