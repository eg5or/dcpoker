import { useEffect, useState } from 'react';
import { statsService } from '../services/stats.service';
import { GlobalStats } from '../types/stats';

export const GlobalStatsPanel = () => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const globalStats = await statsService.getGlobalStats();
        setStats(globalStats);
      } catch (err) {
        console.error('Ошибка при загрузке общей статистики:', err);
        setError('Не удалось загрузить статистику');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStats();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-500 bg-opacity-20 text-red-500 p-4 rounded-lg text-center">
        {error}
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="bg-yellow-500 bg-opacity-20 text-yellow-500 p-4 rounded-lg text-center">
        Статистика не доступна
      </div>
    );
  }
  
  // Найдем наиболее популярную оценку
  const mostPopularVote = stats.votesStats.values.length > 0 
    ? stats.votesStats.values.reduce((prev, current) => prev.count > current.count ? prev : current) 
    : null;
  
  // Найдем наиболее популярный эмодзи
  const mostPopularEmoji = stats.emojisStats.topEmojis.length > 0 
    ? stats.emojisStats.topEmojis[0] 
    : null;
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 mt-8 animate-fadeIn">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Общая статистика</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <h3 className="text-gray-400 text-sm">Всего голосований</h3>
          <p className="text-2xl font-bold text-white mt-2">{stats.votesStats.total}</p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <h3 className="text-gray-400 text-sm">Средняя оценка</h3>
          <p className="text-2xl font-bold text-white mt-2">
            {stats.votesStats.averagePerSession.toFixed(1)}
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <h3 className="text-gray-400 text-sm">Самая частая оценка</h3>
          <p className="text-2xl font-bold text-white mt-2">
            {mostPopularVote ? mostPopularVote.value : 'Н/Д'}
          </p>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <h3 className="text-gray-400 text-sm">Самый популярный эмодзи</h3>
          <p className="text-2xl font-bold text-white mt-2">
            {mostPopularEmoji ? mostPopularEmoji.emoji : 'Н/Д'}
          </p>
        </div>
      </div>
      
      {/* Дополнительная секция с согласованностью */}
      <div className="bg-blue-500 bg-opacity-20 rounded-lg p-4 text-center mt-4">
        <h3 className="text-blue-300 text-sm">Согласованность команды</h3>
        <p className="text-lg text-white mt-1">
          {stats.votesStats.changedAfterReveal > 0 
            ? `${((stats.votesStats.changedAfterReveal / stats.votesStats.total) * 100).toFixed(1)}% участников меняют своё мнение после раскрытия карт`
            : 'Недостаточно данных для оценки согласованности'
          }
        </p>
      </div>
      
      <div className="text-right text-xs text-gray-500 mt-4">
        Обновлено: {new Date(stats.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}; 