import React from 'react';
import { Card } from '@/components/ui/card';
import BenchmarkIndicator from '@/components/BenchmarkIndicator';

interface ComparisonCardProps {
  title: string;
  clientValue: number;
  benchmarkValue: number;
  clientDelta: number;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({
  title,
  clientValue,
  benchmarkValue,
  clientDelta,
}) => {
  console.log(`${title} - Client: ${clientValue}, Benchmark: ${benchmarkValue}`);
  const deltaColor = clientDelta >= 0 ? 'text-green-500' : 'text-red-500';
  const deltaArrow = clientDelta >= 0 ? '↗' : '↘';
  const deltaSign = clientDelta >= 0 ? '+' : '';
  const hasBenchmark = benchmarkValue && benchmarkValue > 0;

  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground mb-2">{title}</div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl font-bold">{clientValue.toFixed(1)}%</span>
        <span className={`${deltaColor} text-sm`}>
          {deltaSign}
          {clientDelta.toFixed(1)}% {deltaArrow}
        </span>
      </div>
      <div className="border-t pt-3">
        <div className="text-xs text-muted-foreground mb-1">
          Industry Average: {hasBenchmark ? benchmarkValue.toFixed(1) : 'Loading...'}%
        </div>
        {hasBenchmark ? (
          <BenchmarkIndicator
            clientValue={clientValue}
            benchmarkValue={benchmarkValue}
          />
        ) : (
          <div className="text-xs text-muted-foreground">No benchmark data</div>
        )}
      </div>
    </Card>
  );
};

export default ComparisonCard;
