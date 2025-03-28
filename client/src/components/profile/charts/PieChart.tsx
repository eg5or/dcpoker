import React, { useEffect, useRef } from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface PieChartProps {
  data: ChartData[];
}

// Массив цветов для секторов
const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#6366F1', // indigo-500
  '#F97316', // orange-500
  '#14B8A6', // teal-500
  '#8B5CF6', // violet-500
  '#DB2777', // pink-600
  '#A855F7', // purple-500
  '#9333EA', // purple-600
  '#D946EF', // fuchsia-500
];

export const PieChart: React.FC<PieChartProps> = ({ data }) => {
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
      const minWidth = 250;
      const maxWidth = 500;
      
      // Выбираем ширину в пределах ограничений
      const width = Math.min(maxWidth, Math.max(minWidth, containerWidth));
      
      // Для круговой диаграммы лучше использовать квадратную форму
      // или адаптировать размер так, чтобы диаграмма выглядела круглой
      const height = Math.min(containerHeight, width);
      
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
      
      // Вычисляем общую сумму значений
      const total = data.reduce((sum, item) => sum + item.value, 0);
      if (total === 0) {
        // Если нет данных, показываем сообщение
        ctx.fillStyle = '#aaa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '16px Arial';
        ctx.fillText('Нет данных для отображения', canvas.width / 2, canvas.height / 2);
        return;
      }
      
      // Определяем центр и радиус круговой диаграммы
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.7; // Используем 70% от минимального измерения
      
      // Рисуем секторы
      let startAngle = 0;
      data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        
        // Выбираем цвет из массива, зацикливаем, если индекс больше длины массива
        const colorIndex = index % CHART_COLORS.length;
        const color = CHART_COLORS[colorIndex];
        
        // Рисуем сектор
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        
        // Добавляем обводку
        ctx.strokeStyle = '#1F2937'; // gray-800
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Вычисляем позицию для метки (на середине дуги)
        const labelAngle = startAngle + sliceAngle / 2;
        
        // Расположение текста зависит от размера сектора
        // Для небольших секторов метки располагаем снаружи
        const labelRadius = item.value / total < 0.1 
          ? radius + 25 // Вынесем метку наружу для маленьких секторов
          : radius * 0.7; // Для больших секторов - внутри
        
        const labelX = centerX + labelRadius * Math.cos(labelAngle);
        const labelY = centerY + labelRadius * Math.sin(labelAngle);
        
        // Стиль текста зависит от расположения
        ctx.fillStyle = item.value / total < 0.1 ? '#fff' : '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px Arial';
        
        // Для небольших секторов добавляем соединительную линию
        if (item.value / total < 0.1) {
          ctx.beginPath();
          ctx.moveTo(centerX + radius * Math.cos(labelAngle), centerY + radius * Math.sin(labelAngle));
          ctx.lineTo(labelX, labelY);
          ctx.strokeStyle = '#aaa';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Добавляем подложку для текста
          const textMetrics = ctx.measureText(item.label);
          ctx.fillStyle = 'rgba(31, 41, 55, 0.7)'; // gray-800 с прозрачностью
          ctx.fillRect(
            labelX - textMetrics.width / 2 - 4,
            labelY - 8,
            textMetrics.width + 8,
            16
          );
          
          ctx.fillStyle = '#fff';
        }
        
        // Отображаем метку (emoji или текст)
        ctx.fillText(item.label, labelX, labelY);
        
        // Обновляем начальный угол для следующего сектора
        startAngle = endAngle;
      });
      
      // Создаем эффект "дырки" в центре для лучшего визуального восприятия
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
      ctx.fillStyle = '#1F2937'; // gray-800
      ctx.fill();
      
      // Добавляем обводку для внутреннего круга
      ctx.strokeStyle = '#111827'; // gray-900
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Добавляем общую сумму в центр
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(total.toString(), centerX, centerY - 10);
      
      ctx.font = '12px Arial';
      ctx.fillText('всего', centerX, centerY + 10);
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