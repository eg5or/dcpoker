interface GameControlsProps {
  currentVote: number | null;
  onReveal: () => void;
  onReset: () => void;
  onResetUsers: () => void;
}

export function GameControls({ onReveal, onReset, onResetUsers }: GameControlsProps) {
  return (
    <div className="w-full">
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between mb-4 sm:mb-0">
        <div className="relative">
          <h1 className="text-2xl md:text-3xl text-white font-bold mb-3 xs:mb-0">
            Scrum Poker
            <span className="absolute text-xs md:text-sm text-gray-400 font-mono ml-1 -bottom-4 xs:ml-2 xs:bottom-auto xs:relative select-none">
              by eg5or &amp; <span className="text-blue-400">Cursor AI</span>
            </span>
          </h1>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
        <button
          onClick={onReveal}
          className="text-sm md:text-base bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition-colors"
        >
          Показать карты
        </button>
        <button
          onClick={onReset}
          className="text-sm md:text-base bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 transition-colors"
        >
          Сбросить
        </button>
        <button
          onClick={onResetUsers}
          className="text-sm md:text-base bg-red-700 text-white px-3 py-1.5 rounded hover:bg-red-800 transition-colors"
        >
          Сбросить всех пользователей
        </button>
      </div>
    </div>
  );
} 