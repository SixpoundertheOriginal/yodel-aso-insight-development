import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import type { ExecutiveSummaryNarrative } from '@/services/narrative-engine.service';

interface CompactExecutiveSummaryProps {
  narrative: ExecutiveSummaryNarrative | null;
  overallScore: number;
}

export const CompactExecutiveSummary: React.FC<CompactExecutiveSummaryProps> = ({
  narrative,
  overallScore
}) => {
  if (!narrative) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <p className="text-zinc-400 text-center">Executive summary not available</p>
        </CardContent>
      </Card>
    );
  }

  const scoreColor =
    overallScore >= 80 ? 'text-green-400' :
    overallScore >= 60 ? 'text-blue-400' :
    overallScore >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Headline */}
      <Card className="bg-gradient-to-br from-yodel-orange/10 to-zinc-900 border-yodel-orange/30">
        <CardContent className="p-6">
          <h3 className={`text-2xl font-bold ${scoreColor} mb-3`}>
            {narrative.headline}
          </h3>
          <p className="text-zinc-300 text-base leading-relaxed">
            {narrative.overviewParagraph}
          </p>
        </CardContent>
      </Card>

      {/* Key Findings - Compact */}
      <div className="grid grid-cols-1 gap-2">
        {narrative.keyFindings.slice(0, 3).map((finding, index) => (
          <div
            key={index}
            className="flex items-start space-x-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50"
          >
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-zinc-300 text-sm leading-snug">{finding}</p>
          </div>
        ))}
      </div>

      {/* Priority Recommendation */}
      <Card className="bg-gradient-to-r from-yodel-orange/5 to-transparent border-l-4 border-yodel-orange">
        <CardContent className="p-4">
          <p className="text-xs text-yodel-orange font-semibold uppercase tracking-wide mb-1">
            Priority Action
          </p>
          <p className="text-zinc-200 text-sm leading-relaxed">
            {narrative.priorityRecommendation}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
