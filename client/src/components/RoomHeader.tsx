import { GameState, Room } from '../types';

interface RoomHeaderProps {
  selectedRoom: Room;
  gameState: GameState;
  onLeaveRoom?: () => void;
  onReveal?: () => void;
  onReset?: () => void;
  onResetUsers?: () => void;
}

export function RoomHeader({
  selectedRoom,
  onLeaveRoom,
  onReveal,
  onReset,
  onResetUsers
}: RoomHeaderProps) {
  return (
    <div className="mb-6 bg-gray-800 p-4 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {selectedRoom.emoji} {selectedRoom.name}
            </h1>
          </div>
          {selectedRoom.description && (
            <p className="text-gray-400 mt-2">{selectedRoom.description}</p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 items-start">
          {onReveal && (
            <button
              onClick={onReveal}
              className="text-sm md:text-base bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition-colors"
            >
              Показать карты
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="text-sm md:text-base bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 transition-colors"
            >
              Сбросить
            </button>
          )}
          {onResetUsers && (
            <button
              onClick={onResetUsers}
              className="text-sm md:text-base bg-red-700 text-white px-3 py-1.5 rounded hover:bg-red-800 transition-colors"
            >
              Сбросить всех
            </button>
          )}
          {onLeaveRoom && (
            <button 
              onClick={onLeaveRoom} 
              className="text-sm md:text-base bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition-colors"
              title="Выйти из комнаты"
            >
              Выйти
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 