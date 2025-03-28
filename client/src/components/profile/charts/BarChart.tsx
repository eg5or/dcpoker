import React, { useEffect, useRef } from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Функция для масштабирования canvas под размер контейнера
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      // Получаем размер контейнера
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Устанавливаем минимальную и максимальную ширину
      const minWidth = 300;
      const maxWidth = 800;
      
      // Выбираем ширину в пределах ограничений
      const width = Math.min(maxWidth, Math.max(minWidth, containerWidth));
      
      // Ограничиваем соотношение сторон для предотвращения растягивания
      const aspectRatio = 16 / 9; // Стандартное соотношение сторон
      const height = Math.min(containerHeight, width / aspectRatio);
      
      // Устанавливаем размеры canvas
      canvas.width = width;
      canvas.height = height;
      
      // Устанавливаем стили для предотвращения растягивания
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.maxWidth = '100%';
      
      // Перерисовываем график после изменения размера
      drawChart();
    };
    
    // Функция отрисовки графика
    const drawChart = () => {
      if (!ctx || !canvas) return;
      
      // Очищаем canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Определяем размеры и отступы для графика
      const padding = 40;
      const chartWidth = canvas.width - padding * 2;
      const chartHeight = canvas.height - padding * 2;
      const barSpacing = Math.min(50, chartWidth / data.length / 2);
      const barWidth = Math.min(40, (chartWidth - barSpacing * (data.length + 1)) / data.length);
      
      // Находим максимальное значение для масштабирования
      const maxValue = Math.max(...data.map(item => item.value), 1);
      
      // Рисуем оси
      ctx.beginPath();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      
      // Ось Y
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding);
      
      // Ось X
      ctx.moveTo(padding, canvas.height - padding);
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      
      ctx.stroke();
      
      // Рисуем деления на оси Y
      const yAxisSteps = 5;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#aaa';
      ctx.font = '12px Arial';
      
      for (let i = 0; i <= yAxisSteps; i++) {
        const y = padding + (yAxisSteps - i) * (chartHeight / yAxisSteps);
        const value = Math.round(i * maxValue / yAxisSteps);
        
        ctx.beginPath();
        ctx.moveTo(padding - 5, y);
        ctx.lineTo(padding, y);
        ctx.stroke();
        
        ctx.fillText(value.toString(), padding - 10, y);
      }
      
      // Рисуем столбцы
      data.forEach((item, index) => {
        const x = padding + barSpacing + (barWidth + barSpacing) * index;
        const barHeight = (item.value / maxValue) * chartHeight;
        
        // Основной цвет столбца
        const gradient = ctx.createLinearGradient(0, padding, 0, canvas.height - padding);
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#1D4ED8');
        
        // Рисуем столбец
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          x,
          canvas.height - padding - barHeight,
          barWidth,
          barHeight,
          [4, 4, 0, 0]
        );
        ctx.fill();
        
        // Добавляем подпись оси X
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(item.label, x + barWidth / 2, canvas.height - padding + 10);
        
        // Добавляем значение над столбцом
        ctx.textBaseline = 'bottom';
        ctx.fillText(
          item.value.toString(),
          x + barWidth / 2,
          canvas.height - padding - barHeight - 5
        );
      });
    };
    
    // Вызываем функции масштабирования и отрисовки
    resizeCanvas();
    
    // Добавляем обработчик изменения размера окна
    window.addEventListener('resize', resizeCanvas);
    
    // Убираем обработчик при размонтировании компонента
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [data]);
  
  return (
    <div className="w-full h-full flex justify-center items-center">
      {data.length === 0 ? (
        <div className="text-gray-500">Нет данных для отображения</div>
      ) : (
        <canvas 
          ref={canvasRef} 
          className="max-w-full"
          style={{ maxHeight: '100%' }}
        />
      )}
    </div>
  );
}; 