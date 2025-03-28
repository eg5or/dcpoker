import { useEffect, useRef } from 'react';

interface ChartDataItem {
  label: string;
  value: number;
}

interface PieChartProps {
  data: ChartDataItem[];
}

export const PieChart = ({ data }: PieChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Генерация цветов для секторов
  const getColorForIndex = (index: number) => {
    const colors = [
      '#3B82F6', // blue-500
      '#EC4899', // pink-500
      '#8B5CF6', // violet-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#6366F1', // indigo-500
      '#14B8A6', // teal-500
      '#F97316', // orange-500
      '#84CC16'  // lime-500
    ];
    return colors[index % colors.length];
  };
  
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Очищаем холст
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Вычисляем общую сумму для расчета процентов
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return;
    
    // Настройки для диаграммы
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    
    // Начинаем с верхней части круга
    let startAngle = -Math.PI / 2;
    
    // Рисуем каждый сектор
    data.forEach((item, index) => {
      const sliceAngle = (2 * Math.PI * item.value) / total;
      
      // Рисуем сектор
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      
      // Заливка сектора
      ctx.fillStyle = getColorForIndex(index);
      ctx.fill();
      
      // Обводка сектора
      ctx.strokeStyle = '#1F2937'; // gray-800
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Вычисляем позицию для метки
      const labelAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);
      
      // Рисуем метку (эмодзи)
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, labelX, labelY);
      
      // Переходим к следующему сектору
      startAngle += sliceAngle;
    });
    
    // Рисуем легенду
    const legendX = canvas.width - 100;
    const legendY = 20;
    
    data.forEach((item, index) => {
      const itemY = legendY + index * 20;
      
      // Цветной квадрат
      ctx.fillStyle = getColorForIndex(index);
      ctx.fillRect(legendX, itemY, 15, 15);
      
      // Обводка квадрата
      ctx.strokeStyle = '#1F2937'; // gray-800
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, itemY, 15, 15);
      
      // Текст метки
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const percentage = ((item.value / total) * 100).toFixed(1);
      ctx.fillText(`${item.label} ${percentage}%`, legendX + 20, itemY + 7);
    });
    
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