interface Consistency {
  emoji: string;
  description: string;
}

interface AverageScoreProps {
  averageVote: number | null;
  consistency: Consistency | null;
}

export function AverageScore({ averageVote, consistency }: AverageScoreProps) {
  if (averageVote === null) return null;

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-white mb-2">Средняя оценка</h2>
          <p className="text-4xl font-bold text-blue-500">
            {averageVote}
          </p>
        </div>
        {consistency && (
          <div className="text-center">
            <div className="text-6xl mb-2">{consistency.emoji}</div>
            <p className="text-white text-sm">{consistency.description}</p>
          </div>
        )}
      </div>
    </div>
  );
} 