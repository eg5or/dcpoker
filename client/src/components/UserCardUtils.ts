// Вспомогательные функции для правильных окончаний
const getMinutesForm = (minutes: number): string => {
  if (minutes >= 11 && minutes <= 14) return 'минут';
  const lastDigit = minutes % 10;
  if (lastDigit === 1) return 'минуту';
  if (lastDigit >= 2 && lastDigit <= 4) return 'минуты';
  return 'минут';
};

const getHoursForm = (hours: number): string => {
  if (hours >= 11 && hours <= 14) return 'часов';
  const lastDigit = hours % 10;
  if (lastDigit === 1) return 'час';
  if (lastDigit >= 2 && lastDigit <= 4) return 'часа';
  return 'часов';
};

const getDaysForm = (days: number): string => {
  if (days >= 11 && days <= 14) return 'дней';
  const lastDigit = days % 10;
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
};

// Функция для форматирования относительного времени
export const getRelativeTimeString = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} ${getMinutesForm(minutes)} назад`;
  if (hours < 24) return `${hours} ${getHoursForm(hours)} назад`;
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} ${getDaysForm(days)} назад`;
  
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  });
}; 