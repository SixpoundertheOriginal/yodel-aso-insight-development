import React from 'react';
import { PremiumCard, PremiumCardHeader, PremiumCardContent, PremiumTypography } from '@/components/ui/premium';
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
  const deltaColor = clientDelta >= 0 ? 'text-emerald-400' : 'text-red-400';
  const deltaBg = clientDelta >= 0 ? 'bg-emerald-400/15 border-emerald-400/30' : 'bg-red-400/15 border-red-400/30';
  const deltaArrow = clientDelta >= 0 ? '↗' : '↘';
  const deltaSign = clientDelta >= 0 ? '+' : '';
  const hasBenchmark = benchmarkValue && benchmarkValue > 0;

  return (
    <PremiumCard variant="glass" intensity="medium" className="overflow-hidden">
      <PremiumCardHeader className="bg-zinc-900/70 border-b border-zinc-800/50">
        <PremiumTypography.SectionTitle>{title}</PremiumTypography.SectionTitle>
      </PremiumCardHeader>
      <PremiumCardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-semibold text-foreground">{clientValue.toFixed(1)}%</span>
          <span className={`text-xs px-2 py-0.5 rounded border ${deltaBg} ${deltaColor}`}>
            {deltaSign}{clientDelta.toFixed(1)}% {deltaArrow}
          </span>
        </div>
        <div className="pt-3 border-t border-zinc-800/50">
          <div className="text-xs text-muted-foreground mb-2">
            Industry Average: {hasBenchmark ? benchmarkValue.toFixed(1) : 'Loading...'}%
          </div>
          {hasBenchmark ? (
            <BenchmarkIndicator clientValue={clientValue} benchmarkValue={benchmarkValue} />
          ) : (
            <div className="text-xs text-muted-foreground">No benchmark data</div>
          )}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
};

export default ComparisonCard;
