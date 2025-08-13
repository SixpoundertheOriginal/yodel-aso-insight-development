import React from 'react';
import { Card } from '@/components/ui/card';

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
  const difference = benchmarkValue
    ? ((clientValue - benchmarkValue) / benchmarkValue) * 100
    : 0;
  const isAbove = clientValue > benchmarkValue;
  const deltaColor = clientDelta >= 0 ? 'text-green-500' : 'text-red-500';
  const deltaArrow = clientDelta >= 0 ? '↗' : '↘';
  const deltaSign = clientDelta >= 0 ? '+' : '';

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
          Industry Average: {benchmarkValue.toFixed(1)}%
        </div>
        <div
          className={`text-xs flex items-center gap-1 ${
            isAbove ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {isAbove ? '↗' : '↘'} {Math.abs(difference).toFixed(0)}% {
            isAbove ? 'above' : 'below'
          } industry
        </div>
      </div>
    </Card>
  );
};

export default ComparisonCard;
