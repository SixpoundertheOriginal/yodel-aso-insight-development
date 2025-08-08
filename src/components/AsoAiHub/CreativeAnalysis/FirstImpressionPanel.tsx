import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreativeAnalysisWithAI } from '@/services/creative-analysis.service';

interface FirstImpressionPanelProps {
  analysis: CreativeAnalysisWithAI;
}

export const FirstImpressionPanel: React.FC<FirstImpressionPanelProps> = ({ analysis }) => {
  const firstThree = analysis.individual.slice(0, 3);

  const coherence = useMemo(() => {
    if (firstThree.length === 0) return 0;

    const keywordSets = firstThree.map(s => new Set((s.messageAnalysis.keywords || []).map(k => k.toLowerCase())));
    const union = new Set<string>();
    keywordSets.forEach(set => set.forEach(k => union.add(k)));

    const intersection = keywordSets.reduce<Set<string> | null>((acc, set) => {
      if (acc === null) return new Set(set);
      return new Set(Array.from(acc).filter(k => set.has(k)));
    }, null);

    return union.size > 0 && intersection ? Math.round((intersection.size / union.size) * 100) : 0;
  }, [firstThree]);

  if (firstThree.length === 0) {
    return <p className="text-zinc-400">No screenshots available for first impression.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {firstThree.map((shot, idx) => (
          <div key={idx} className="space-y-2">
            <img
              src={shot.screenshotUrl}
              alt={`Screenshot ${idx + 1}`}
              className="w-full rounded-lg border border-zinc-800"
            />
            <p className="text-sm text-zinc-300">{shot.messageAnalysis.primaryMessage}</p>
          </div>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground">Messaging Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-1 text-zinc-200">
            {firstThree.map((shot, idx) => (
              <li key={idx}>{shot.messageAnalysis.primaryMessage}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground">Coherence Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-zinc-100">{coherence}%</p>
          <p className="text-sm text-zinc-400">Keyword overlap across first three screenshots</p>
        </CardContent>
      </Card>
    </div>
  );
};

