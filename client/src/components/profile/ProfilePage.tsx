import { useEffect, useState } from 'react';
import { statsService } from '../../services/stats.service';
import { FIBONACCI_SEQUENCE } from '../../types';
import { UserStats } from '../../types/stats';
import { BarChart } from './charts/BarChart';
import { PieChart } from './charts/PieChart';
import { StatsCard } from './StatsCard';

interface ProfilePageProps {
  userName: string;
  userId: string;
  onBack: () => void;
}

export const ProfilePage = ({ userName, userId, onBack }: ProfilePageProps) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const userStats = await statsService.getUserStats();
        setStats(userStats);
      } catch (err) {
        console.error('Ошибка при загрузке статистики:', err);
        setError('Не удалось загрузить статистику. Попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStats();
  }, [userId]);
  
  // Подготовка данных для графиков
  const prepareVotesChartData = () => {
    if (!stats) return [];
    
    // Сортируем значения по последовательности Фибоначчи
    return FIBONACCI_SEQUENCE.map(value => {
      const voteStat = stats.votesStats.values.find(v => v.value === value);
      return {
        label: value.toString(),
        value: voteStat?.count || 0
      };
    }).filter(item => item.value > 0);
  };
  
  const prepareSentEmojisChartData = () => {
    if (!stats) return [];
    
    return stats.emojisStats.sent.map(stat => ({
      label: stat.emoji,
      value: stat.count
    }));
  };
  
  const prepareReceivedEmojisChartData = () => {
    if (!stats) return [];
    
    return stats.emojisStats.received.map(stat => ({
      label: stat.emoji,
      value: stat.count
    }));
  };
  
  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button
            className="mr-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition duration-200 flex items-center"
            onClick={onBack}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-1" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Назад
          </button>
          <h1 className="text-2xl font-bold text-white">Профиль: {userName}</h1>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500 text-white p-4 rounded-md">
            {error}
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Общая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title="Всего голосований"
                value={stats.votesStats.total.toString()}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                }
              />
              <StatsCard
                title="Изменения оценки после раскрытия"
                value={stats.votesStats.changedAfterReveal.toString()}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                }
              />
              <StatsCard
                title="Всего отправлено эмодзи"
                value={stats.emojisStats.sent.reduce((acc, cur) => acc + cur.count, 0).toString()}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                  </svg>
                }
              />
            </div>
            
            {/* Статистика по оценкам */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Ваши оценки</h2>
              <div className="h-64">
                <BarChart data={prepareVotesChartData()} />
              </div>
            </div>
            
            {/* Статистика по эмодзи */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Отправленные эмодзи</h2>
                <div className="h-64">
                  <PieChart data={prepareSentEmojisChartData()} />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Полученные эмодзи</h2>
                <div className="h-64">
                  <PieChart data={prepareReceivedEmojisChartData()} />
                </div>
              </div>
            </div>
            
            {/* Дата последнего обновления */}
            <div className="text-gray-400 text-sm text-right">
              Последнее обновление: {new Date(stats.lastUpdated).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500 text-white p-4 rounded-md">
            Статистика не найдена
          </div>
        )}
      </div>
    </div>
  );
}; 