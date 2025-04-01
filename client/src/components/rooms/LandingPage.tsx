import { Room } from '../../types';

interface LandingPageProps {
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
}

export const LandingPage = ({ rooms, onSelectRoom }: LandingPageProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <h1 className="text-3xl font-bold text-center mb-6">Добро пожаловать в Scrum Poker!</h1>
      
      <p className="text-gray-400 text-center max-w-2xl mb-8">
        Scrum Poker помогает командам эффективно и справедливо оценивать задачи. Выберите комнату, чтобы начать голосование или присоединиться к существующей сессии.
      </p>
      
      <div className="w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Доступные комнаты</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <button
                key={room.id}
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg transition flex items-center"
                onClick={() => onSelectRoom(room.id)}
              >
                <span className="text-3xl mr-4">{room.emoji}</span>
                <div>
                  <h3 className="font-bold">{room.name}</h3>
                  <p className="text-sm text-gray-400">
                    Активность: {new Date(room.lastActivityAt).toLocaleString()}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-2 bg-gray-700 p-6 rounded-lg text-center">
              <p className="text-gray-400 mb-2">Комнаты отсутствуют.</p>
              <p>Создайте новую комнату, используя селектор комнат в заголовке.</p>
            </div>
          )}
        </div>
        
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Как это работает?</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Создайте комнату или присоединитесь к существующей</li>
            <li>Голосуйте, выбирая карты со значениями</li>
            <li>Когда все проголосуют, откройте карты для просмотра результатов</li>
            <li>Анализируйте согласованность команды</li>
            <li>Начните новое голосование для следующей задачи</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 