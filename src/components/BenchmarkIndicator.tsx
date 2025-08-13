import React from 'react';

interface BenchmarkIndicatorProps {
  clientValue: number;
  benchmarkValue: number;
}

const BenchmarkIndicator: React.FC<BenchmarkIndicatorProps> = ({
  clientValue,
  benchmarkValue,
}) => {
  if (!benchmarkValue) {
    return <div className="text-xs text-muted-foreground">No benchmark data</div>;
  }

  const difference = ((clientValue - benchmarkValue) / benchmarkValue) * 100;
  const isAbove = clientValue > benchmarkValue;
  const color = isAbove ? 'text-green-500' : 'text-red-500';
  const arrow = isAbove ? '↗' : '↘';
  const comparison = isAbove ? 'above' : 'below';

  return (
    <div className={`text-xs flex items-center gap-1 ${color}`}>
      {arrow} {Math.abs(difference).toFixed(0)}% {comparison} industry
    </div>
  );
};

export default BenchmarkIndicator;
