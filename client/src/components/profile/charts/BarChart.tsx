import { useEffect, useRef, useState } from 'react';

interface ChartDataItem {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartDataItem[];
}

export const BarChart = ({ data }: BarChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Функция для обновления размеров канваса
  const updateDimensions = () => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  };
  
  // Инициализация размеров и обработка изменения размера окна
  useEffect(() => {
    updateDimensions();
    
    const handleResize = () => {
      updateDimensions();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Отрисовка графика при изменении данных или размеров
  useEffect(() => {
    if (!canvasRef.current || data.length === 0 || dimensions.width === 0) return;
    
    const canvas = canvasRef.current;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Очищаем холст
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Находим максимальное значение для масштабирования
    const maxValue = Math.max(...data.map(item => item.value));
    
    // Настройки размеров
    const padding = Math.min(40, Math.max(20, dimensions.width * 0.08)); // Адаптивный отступ
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Вычисляем оптимальную ширину столбцов в зависимости от количества данных
    const barSpacing = Math.min(10, Math.max(2, dimensions.width * 0.02)); // Адаптивный отступ между столбцами
    const barWidth = Math.max(15, (chartWidth / data.length) - barSpacing);
    
    // Рисуем оси
    ctx.beginPath();
    ctx.strokeStyle = '#4B5563'; // gray-600
    ctx.lineWidth = 2;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Вычисляем масштаб для высоты столбцов
    const scale = maxValue > 0 ? chartHeight / maxValue : 0;
    
    // Рисуем данные
    data.forEach((item, index) => {
      const x = padding + index * (barWidth + barSpacing);
      const barHeight = item.value > 0 ? item.value * scale : 0;
      const y = canvas.height - padding - barHeight;
      
      // Рисуем столбец
      ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // blue-500 с прозрачностью
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Обводка столбца
      ctx.strokeStyle = '#3B82F6'; // blue-500
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
      
      // Подпись значения (только если хватает места)
      if (barHeight > 15) {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(12, Math.max(9, dimensions.width * 0.025))}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
      }
      
      // Подпись категории (с поворотом для экономии места при необходимости)
      ctx.save();
      ctx.fillStyle = '#D1D5DB'; // gray-300
      
      // Выбираем размер шрифта и способ отображения меток в зависимости от ширины
      const fontSize = Math.min(12, Math.max(9, dimensions.width * 0.025));
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      
      if (barWidth < 30 && data.length > 5) {
        // Если столбцы узкие, поворачиваем метки
        ctx.translate(x + barWidth / 2, canvas.height - padding + 5);
        ctx.rotate(Math.PI / 4);
        ctx.fillText(item.label, 0, 0);
      } else {
        // Обычное расположение меток
        ctx.fillText(item.label, x + barWidth / 2, canvas.height - padding + 15);
      }
      
      ctx.restore();
    });
    
    // Рисуем заголовок оси Y (только если есть место)
    if (dimensions.width > 300) {
      ctx.save();
      ctx.translate(15, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#9CA3AF'; // gray-400
      ctx.font = `${Math.min(12, Math.max(9, dimensions.width * 0.025))}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Количество', 0, 0);
      ctx.restore();
    }
    
    // Рисуем заголовок оси X (только если есть место)
    if (dimensions.height > 200) {
      ctx.fillStyle = '#9CA3AF'; // gray-400
      ctx.font = `${Math.min(12, Math.max(9, dimensions.width * 0.025))}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Оценка', canvas.width / 2, canvas.height - 10);
    }
    
  }, [data, dimensions]);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center"
      style={{ minHeight: '200px' }}
    >
      {data.length === 0 ? (
        <p className="text-gray-400">Нет данных для отображения</p>
      ) : (
        <canvas 
          ref={canvasRef}
          className="w-full h-full"
        />
      )}
    </div>
  );
}; 