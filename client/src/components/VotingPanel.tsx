interface VotingPanelProps {
  currentVote: number | null;
  onVote: (value: number) => void;
  sequence: number[];
}

export function VotingPanel({ currentVote, onVote, sequence }: VotingPanelProps) {
  return (
    <div className="mt-8">
      <h3 className="text-lg text-white mb-3">
        {currentVote !== null 
          ? `Ваш текущий выбор: ${currentVote === 0.1 ? '☕️' : currentVote === 0.5 ? '½' : currentVote}`
          : 'Выберите карту для голосования:'
        }
      </h3>
      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4">
        {sequence.map((value) => (
          <button
            key={value}
            onClick={() => onVote(value)}
            className={`aspect-[2/3] text-white text-base sm:text-lg md:text-xl font-bold rounded-lg flex items-center justify-center transition-colors select-none ${
              currentVote === value 
                ? 'bg-blue-700 ring-2 ring-white transform scale-110 shadow-lg' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {value === 0.1 ? '☕️' : value === 0.5 ? '½' : value}
          </button>
        ))}
      </div>
    </div>
  );
} 