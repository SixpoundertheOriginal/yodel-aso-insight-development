import React from 'react';

interface BenchmarkIndicatorProps {
  clientValue: number;
  benchmark: number;
}

const BenchmarkIndicator: React.FC<BenchmarkIndicatorProps> = ({ clientValue, benchmark }) => {
  const performance = clientValue > benchmark ? 'above' : clientValue < benchmark ? 'below' : 'at';
  const color =
    performance === 'above'
      ? 'text-green-600'
      : performance === 'below'
      ? 'text-red-600'
      : 'text-yellow-600';
  const symbol = performance === 'above' ? '↗' : performance === 'below' ? '↘' : '→';
  const text = performance === 'above' ? 'Above' : performance === 'below' ? 'Below' : 'At';

  return (
    <div className="text-xs mt-1">
      <span className="text-muted-foreground">Industry: {benchmark}%</span>
      <span className={`ml-2 ${color}`}>
        {symbol} {text} benchmark
      </span>
    </div>
  );
};

export default BenchmarkIndicator;
