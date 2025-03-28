import { useEffect, useRef, useState } from 'react';

interface ChartDataItem {
  label: string;
  value: number;
}

interface PieChartProps {
  data: ChartDataItem[];
}

export const PieChart = ({ data }: PieChartProps) => {
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
    if (!canvasRef.current || data.length === 0 || dimensions.width === 0) return;
    
    const canvas = canvasRef.current;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Очищаем холст
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Вычисляем общую сумму для расчета процентов
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return;
    
    // Настройки для диаграммы - адаптируем размер к контейнеру
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8; // 80% от доступного пространства
    
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
      
      // Рисуем метку (эмодзи) только для секторов достаточного размера
      if (sliceAngle > 0.2) { // Минимальный угол для отображения метки
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, labelX, labelY);
      }
      
      // Переходим к следующему сектору
      startAngle += sliceAngle;
    });
    
    // Определяем, нужно ли рисовать легенду отдельно или внутри графика
    const isSmallContainer = dimensions.width < 300 || dimensions.height < 200;
    
    if (isSmallContainer) {
      // Для маленьких контейнеров рисуем легенду под диаграммой
      const legendY = centerY + radius + 10;
      const itemsPerRow = Math.floor(dimensions.width / 100); // Определяем количество элементов в ряду
      const itemHeight = 20;
      
      data.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        
        const itemX = (dimensions.width / itemsPerRow) * col + 20;
        const itemY = legendY + row * itemHeight;
        
        // Цветной квадрат
        ctx.fillStyle = getColorForIndex(index);
        ctx.fillRect(itemX, itemY, 12, 12);
        
        // Обводка квадрата
        ctx.strokeStyle = '#1F2937'; // gray-800
        ctx.lineWidth = 1;
        ctx.strokeRect(itemX, itemY, 12, 12);
        
        // Текст метки
        ctx.fillStyle = '#D1D5DB'; // gray-300
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const percentage = ((item.value / total) * 100).toFixed(0);
        ctx.fillText(`${item.label} ${percentage}%`, itemX + 16, itemY + 6);
      });
    } else {
      // Для больших контейнеров рисуем легенду справа
      const legendX = canvas.width - Math.min(150, canvas.width * 0.3);
      const legendY = 20;
      
      // Фон для легенды
      ctx.fillStyle = 'rgba(31, 41, 55, 0.7)'; // gray-800 с прозрачностью
      ctx.fillRect(legendX - 10, legendY - 10, 160, data.length * 20 + 20);
      
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