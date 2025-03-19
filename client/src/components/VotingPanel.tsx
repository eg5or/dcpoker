interface VotingPanelProps {
  currentVote: number | null;
  onVote: (value: number) => void;
  sequence: number[];
}

export function VotingPanel({ currentVote, onVote, sequence }: VotingPanelProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
      {sequence.map((value) => (
        <button
          key={value}
          onClick={() => onVote(value)}
          className={`aspect-[2/3] text-white text-xl font-bold rounded-lg flex items-center justify-center transition-colors ${
            currentVote === value 
              ? 'bg-blue-700 ring-2 ring-white' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {value === 0.1 ? '☕️' : value === 0.5 ? '½' : value}
        </button>
      ))}
    </div>
  );
} 