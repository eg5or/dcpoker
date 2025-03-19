
interface GameControlsProps {
  currentVote: number | null;
  onReveal: () => void;
  onReset: () => void;
  onResetUsers: () => void;
}

export function GameControls({ currentVote, onReveal, onReset, onResetUsers }: GameControlsProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl text-white">Scrum Poker</h1>
        {currentVote !== null && (
          <div className="bg-blue-500 px-4 py-2 rounded">
            <span className="text-white">Ваш выбор: {currentVote}</span>
          </div>
        )}
      </div>
      <div className="flex gap-4">
        <button
          onClick={onReveal}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Показать карты
        </button>
        <button
          onClick={onReset}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Сбросить
        </button>
        <button
          onClick={onResetUsers}
          className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800"
        >
          Сбросить всех пользователей
        </button>
      </div>
    </div>
  );
} 