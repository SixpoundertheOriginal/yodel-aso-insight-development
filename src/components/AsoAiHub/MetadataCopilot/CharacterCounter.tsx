
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface CharacterCounterProps {
  current: number;
  limit: number;
  label: string;
  className?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  current,
  limit,
  label,
  className = ''
}) => {
  const percentage = (current / limit) * 100;
  const isWarning = percentage > 80;
  const isError = percentage > 100;

  const getColorClass = () => {
    if (isError) return 'text-red-400';
    if (isWarning) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProgressColor = () => {
    if (isError) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getOptimizationMessage = () => {
    const remaining = limit - current;

    if (isError) {
      return (
        <p className="text-xs text-red-400">
          ❌ Exceeds limit by {Math.abs(remaining)} character{Math.abs(remaining) > 1 ? 's' : ''}
        </p>
      );
    }

    if (current === limit) {
      return (
        <p className="text-xs text-green-400">
          ✅ Perfect! All {limit} characters used for maximum indexing
        </p>
      );
    }

    if (remaining <= 3 && remaining > 0) {
      return (
        <p className="text-xs text-blue-400">
          💡 Add {remaining} more character{remaining > 1 ? 's' : ''} to maximize App Store indexing
        </p>
      );
    }

    if (remaining > 3) {
      return (
        <p className="text-xs text-zinc-400">
          {remaining} character{remaining > 1 ? 's' : ''} remaining - add more keywords for better indexing
        </p>
      );
    }

    return null;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className={`text-sm font-medium ${getColorClass()}`}>
          {current}/{limit}
        </span>
      </div>

      <div className="relative">
        <Progress
          value={Math.min(percentage, 100)}
          className="h-2 bg-zinc-700"
        />
        <div
          className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {getOptimizationMessage()}
    </div>
  );
};
