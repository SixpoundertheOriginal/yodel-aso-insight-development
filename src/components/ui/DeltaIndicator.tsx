import React from 'react';

interface DeltaIndicatorProps {
  value: number;
}

const DeltaIndicator: React.FC<DeltaIndicatorProps> = ({ value }) => {
  if (value === 999) {
    return <span className="text-green-600 font-bold">New</span>;
  }

  if (value === 0) {
    return <span className="text-gray-600">0%</span>;
  }

  const trend = value > 0 ? 'up' : 'down';
  const arrow = trend === 'up' ? '↑' : '↓';
  const color = trend === 'up' ? 'text-green-600' : 'text-red-600';

  return (
    <span className={`${color} font-bold`}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
};

export default DeltaIndicator;
