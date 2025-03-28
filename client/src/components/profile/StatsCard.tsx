import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: ReactNode;
}

export const StatsCard = ({ title, value, icon }: StatsCardProps) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 transition-transform hover:scale-105 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
          <p className="text-white text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="bg-blue-500 bg-opacity-20 rounded-full p-3 text-blue-500">
          {icon}
        </div>
      </div>
    </div>
  );
}; 