import { useEffect, useRef } from 'react';

interface ChartDataItem {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartDataItem[];
}

export const BarChart = ({ data }: BarChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Очищаем холст
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Находим максимальное значение для масштабирования
    const maxValue = Math.max(...data.map(item => item.value));
    
    // Настройки размеров
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / data.length - 10;
    
    // Рисуем оси
    ctx.beginPath();
    ctx.strokeStyle = '#4B5563'; // gray-600
    ctx.lineWidth = 2;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Рисуем данные
    data.forEach((item, index) => {
      const x = padding + index * (barWidth + 10) + 5;
      const barHeight = item.value > 0 ? (item.value / maxValue) * chartHeight : 0;
      const y = canvas.height - padding - barHeight;
      
      // Рисуем столбец
      ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // blue-500 с прозрачностью
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Обводка столбца
      ctx.strokeStyle = '#3B82F6'; // blue-500
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
      
      // Подпись значения
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
      
      // Подпись категории
      ctx.fillText(item.label, x + barWidth / 2, canvas.height - padding + 15);
    });
    
    // Рисуем заголовок оси Y
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#9CA3AF'; // gray-400
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Количество', 0, 0);
    ctx.restore();
    
    // Рисуем заголовок оси X
    ctx.fillStyle = '#9CA3AF'; // gray-400
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Оценка', canvas.width / 2, canvas.height - 10);
    
  }, [data]);
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      {data.length === 0 ? (
        <p className="text-gray-400">Нет данных для отображения</p>
      ) : (
        <canvas 
          ref={canvasRef}
          width={500}
          height={250}
          className="w-full h-full"
        />
      )}
    </div>
  );
}; 