import { useEffect, useState } from 'react';
import { statsService } from '../services/stats.service';
import { socket } from '../socket';
import { GlobalStats } from '../types/stats';

export const GlobalStatsPanel = () => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalStats = async () => {
    try {
      setLoading(true);
      const fetchedStats = await statsService.getGlobalStats();
      setStats(fetchedStats);
      setError(null);
    } catch (err) {
      console.error('Ошибка при загрузке глобальной статистики:', err);
      setError('Не удалось загрузить статистику. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStats();

    // Подписываемся на событие обновления статистики
    const handleStatsUpdated = () => {
      console.log('Получено событие stats:updated, обновляем статистику');
      fetchGlobalStats();
    };

    // Добавляем обработчик события обновления статистики
    socket.on('stats:updated', handleStatsUpdated);

    // Отписываемся при размонтировании компонента
    return () => {
      socket.off('stats:updated', handleStatsUpdated);
    };
  }, []);

  // Определяем наиболее популярную оценку
  const getMostPopularVote = () => {
    if (!stats?.votesStats.values.length) return null;
    
    const sorted = [...stats.votesStats.values].sort((a, b) => b.count - a.count);
    return sorted[0];
  };

  // Определяем наиболее популярный эмодзи
  const getMostPopularEmoji = () => {
    if (!stats?.emojisStats.topEmojis.length) return null;
    
    return stats.emojisStats.topEmojis[0];
  };

  // Определяем среднюю согласованность команды
  const getTeamConsistency = () => {
    if (!stats) return null;
    
    const averageVotesPerSession = stats.votesStats.averagePerSession;
    const totalUsers = stats.totalUsers;
    
    if (totalUsers === 0) return 0;
    
    // Вычисляем процент участия (сколько в среднем людей голосуют от общего числа)
    return Math.round((averageVotesPerSession / totalUsers) * 100);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-4">
        <h2 className="text-xl font-bold text-red-500 mb-2">Ошибка</h2>
        <p className="text-gray-300">{error}</p>
        <button 
          onClick={fetchGlobalStats}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const mostPopularVote = getMostPopularVote();
  const mostPopularEmoji = getMostPopularEmoji();
  const teamConsistency = getTeamConsistency();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-4 mb-6">
      <h2 className="text-xl font-bold text-white mb-4">Общая статистика голосований</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Всего голосований */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm">Всего голосований</h3>
          <div className="flex justify-between items-end">
            <div className="text-3xl font-bold text-white">{stats?.totalSessions || 0}</div>
            <div className="text-sm text-gray-400">
              Завершено: {stats?.completedSessions || 0}
            </div>
          </div>
        </div>
        
        {/* Средняя оценка */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm">Средняя оценка</h3>
          <div className="flex justify-between items-end">
            <div className="text-3xl font-bold text-white">
              {stats?.votesStats.averagePerSession ? stats.votesStats.averagePerSession.toFixed(1) : '—'}
            </div>
            <div className="text-sm text-gray-400">
              Голосов: {stats?.votesStats.total || 0}
            </div>
          </div>
        </div>
        
        {/* Популярная оценка */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm">Популярная оценка</h3>
          <div className="flex justify-between items-end">
            <div className="text-3xl font-bold text-white">
              {mostPopularVote ? mostPopularVote.value : '—'}
            </div>
            <div className="text-sm text-gray-400">
              {mostPopularVote ? `${mostPopularVote.count} раз(а)` : '—'}
            </div>
          </div>
        </div>
        
        {/* Популярный эмодзи */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm">Популярный эмодзи</h3>
          <div className="flex justify-between items-end">
            <div className="text-3xl font-bold">
              {mostPopularEmoji ? mostPopularEmoji.emoji : '—'}
            </div>
            <div className="text-sm text-gray-400">
              {mostPopularEmoji ? `${mostPopularEmoji.count} раз(а)` : '—'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Согласованность команды */}
      <div className="mt-6">
        <h3 className="text-gray-400 text-sm mb-2">Согласованность команды</h3>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-full bg-gray-600 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full" 
                style={{width: `${teamConsistency || 0}%`}}
              ></div>
            </div>
            <div className="ml-4 text-white font-bold">{teamConsistency || 0}%</div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            В среднем {stats?.votesStats.averagePerSession.toFixed(1) || '0'} из {stats?.totalUsers || '0'} пользователей участвуют в голосованиях
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-4 text-right">
        Обновлено: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : '—'}
      </div>
    </div>
  );
}; 