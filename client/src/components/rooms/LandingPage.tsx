import { useState } from 'react';
import { authService } from '../../services/auth.service';
import { roomService } from '../../services/room.service';
import { Room } from '../../types';
import { EditRoomModal } from './EditRoomModal';

interface LandingPageProps {
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  isLoading: boolean;
}

export const LandingPage = ({ rooms, onSelectRoom, onCreateRoom, isLoading }: LandingPageProps) => {
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  const currentUser = authService.getUser();
  
  // Проверяем, есть ли доступные комнаты
  const hasRooms = Array.isArray(rooms) && rooms.length > 0;
  
  // Функция для обновления комнаты
  const handleUpdateRoom = async (roomId: string, updates: Partial<Room>): Promise<Room | null> => {
    try {
      console.log('[LandingPage] Отправляем запрос на обновление комнаты:', roomId, updates);
      
      const updatedRoom = await roomService.updateRoom(roomId, updates);
      if (updatedRoom) {
        console.log('[LandingPage] Комната успешно обновлена:', updatedRoom);
        // В реальном приложении лучше было бы обновить глобальное состояние комнат
        window.location.reload(); // Простой способ обновить данные - перезагрузить страницу
        return updatedRoom;
      } else {
        console.error('[LandingPage] Не удалось обновить комнату');
        return null;
      }
    } catch (error: any) {
      console.error('[LandingPage] Ошибка при обновлении комнаты:', error);
      throw error; // Передаем ошибку дальше для обработки в EditRoomModal
    }
  };

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
                  
                  // Проверяем, является ли текущий пользователь создателем комнаты
                  let isCreator = false;
                  
                  if (room.createdBy && currentUser) {
                    // Используем приведение типов для безопасного доступа к полям
                    const roomCreator = room.createdBy as any;
                    const user = currentUser as any;
                    
                    // Основное сравнение по полю id
                    if (roomCreator.id === user.id) {
                      isCreator = true;
                    } 
                    // Проверка по полю _id, если оно есть
                    else if (roomCreator._id && roomCreator._id === user.id) {
                      isCreator = true;
                    }
                    // Еще один вариант сравнения, если у пользователя есть _id
                    else if (roomCreator._id && user._id && roomCreator._id === user._id) {
                      isCreator = true;
                    }
                  }
                  
                  // Логируем для отладки
                  console.log(`[LandingPage] Комната ${room.name} (${roomId}):`, {
                    createdById: room.createdBy?.id,
                    currentUserId: currentUser?.id,
                    isCreator: isCreator
                  });
                  
                  return (
                    <div 
                      key={roomId || `room-${Math.random()}`}
                      className="relative bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-left transition hover:shadow-xl"
                    >
                      {/* Кнопка редактирования (только для создателя) */}
                      {isCreator && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomToEdit(room);
                          }}
                          className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 p-1.5 rounded-full transition"
                          title="Редактировать комнату"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      
                      <button
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
                        className="w-full text-left"
                      >
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-2">{room.emoji || room.code.substring(0, 2)}</span>
                          <h3 className="text-xl font-semibold text-white">{room.name}</h3>
                        </div>
                        {room.description && (
                          <p className="text-gray-400 mb-2 line-clamp-2">{room.description}</p>
                        )}
                        
                        <div className="flex flex-col space-y-1">
                          {room.createdBy && (
                            <p className="text-gray-400 text-sm">
                              Создатель: {room.createdBy.name}
                            </p>
                          )}
                          <p className="text-gray-500 text-sm">
                            Последняя активность: {new Date(room.lastActivity).toLocaleString()}
                          </p>
                          {room.onlineUsersCount && room.onlineUsersCount > 0 ? (
                            <p className="text-green-500 text-sm flex items-center">
                              <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              {room.onlineUsersCount} пользователей онлайн 
                              {room.onlineUsers && room.onlineUsers.length > 0 && (
                                <span className="text-gray-300 ml-1 text-xs font-mono truncate max-w-[100px]" title={room.onlineUsers.join(', ')}>
                                  ({room.onlineUsers.join(', ')})
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="text-gray-400 text-sm italic">
                              Комната пуста
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
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
      
      {/* Модальное окно редактирования комнаты */}
      {roomToEdit && (
        <EditRoomModal
          room={roomToEdit}
          onClose={() => setRoomToEdit(null)}
          onUpdateRoom={handleUpdateRoom}
        />
      )}
    </div>
  );
}; 