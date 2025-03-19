interface VoteChangeAlertProps {
  changedUsers: string[];
  onRecalculate: () => void;
}

export function VoteChangeAlert({ changedUsers, onRecalculate }: VoteChangeAlertProps) {
  if (changedUsers.length === 0) return null;

  return (
    <div className="bg-yellow-500 text-black p-4 rounded-lg mb-8">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">
            {changedUsers.length === 1
              ? `Пользователь ${changedUsers[0]} изменил свою оценку`
              : `Пользователи ${changedUsers.join(', ')} изменили свои оценки`
            }
          </p>
          <p className="text-sm mt-1">Необходимо пересчитать среднее значение</p>
        </div>
        <button
          onClick={onRecalculate}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Пересчитать
        </button>
      </div>
    </div>
  );
} 