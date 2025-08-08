import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
  CreativeAnalysisWithAI,
  ScreenshotAnalysis
} from '@/services/creative-analysis.service';

interface FirstImpressionPanelProps {
  analysis: CreativeAnalysisWithAI;
}

export const FirstImpressionPanel: React.FC<FirstImpressionPanelProps> = ({ analysis }) => {
  const apps = useMemo(() => {
    const grouped = new Map<string, { appName: string; shots: ScreenshotAnalysis[] }>();
    analysis.individual.forEach(shot => {
      if (!grouped.has(shot.appId)) {
        grouped.set(shot.appId, { appName: shot.appName, shots: [] });
      }
      grouped.get(shot.appId)!.shots.push(shot);
    });
    return Array.from(grouped.values()).slice(0, 3);
  }, [analysis]);

  const primaryShots = useMemo(() => apps[0]?.shots.slice(0, 3) || [], [apps]);

  const coherence = useMemo(() => {
    if (primaryShots.length === 0) return 0;

    const keywordSets = primaryShots.map(s =>
      new Set((s.messageAnalysis.keywords || []).map(k => k.toLowerCase()))
    );
    const union = new Set<string>();
    keywordSets.forEach(set => set.forEach(k => union.add(k)));

    const intersection = keywordSets.reduce<Set<string> | null>((acc, set) => {
      if (acc === null) return new Set(set);
      return new Set(Array.from(acc).filter(k => set.has(k)));
    }, null);

    return union.size > 0 && intersection
      ? Math.round((intersection.size / union.size) * 100)
      : 0;
  }, [primaryShots]);

  if (apps.length === 0) {
    return <p className="text-zinc-400">No screenshots available for first impression.</p>;
  }

  const countValues = (values: Array<string | undefined>) => {
    const freq: Record<string, number> = {};
    values.forEach(v => {
      if (!v) return;
      freq[v] = (freq[v] || 0) + 1;
    });
    return freq;
  };

  return (
    <div className="space-y-6">
      {/* Competitive screenshot comparison */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          {apps.map(app => (
            <div key={app.appName} className="text-sm font-medium text-zinc-200 truncate">
              {app.appName}
            </div>
          ))}
        </div>
        {[0, 1, 2].map(idx => {
          const messageTypes = apps.map(app => app.shots[idx]?.messageAnalysis.messageType);
          const triggers = apps.map(app => app.shots[idx]?.messageAnalysis.psychologicalTrigger);
          const mtCounts = countValues(messageTypes);
          const trigCounts = countValues(triggers);
          return (
            <div key={idx} className="grid grid-cols-3 gap-4">
              {apps.map((app, colIdx) => {
                const shot = app.shots[idx];
                if (!shot) {
                  return (
                    <div
                      key={colIdx}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 h-48 flex items-center justify-center text-sm text-zinc-500"
                    >
                      N/A
                    </div>
                  );
                }

                const mt = shot.messageAnalysis.messageType;
                const trig = shot.messageAnalysis.psychologicalTrigger;
                const mtDiff = mt && mtCounts[mt] === 1 && apps.length > 1;
                const trigDiff = trig && trigCounts[trig] === 1 && apps.length > 1;

                return (
                  <div key={colIdx} className="space-y-2">
                    <img
                      src={shot.screenshotUrl}
                      alt={`Screenshot ${idx + 1} - ${app.appName}`}
                      className="w-full rounded-lg border border-zinc-800"
                    />
                    <div className="flex flex-col items-center gap-1 text-xs text-zinc-200">
                      <Badge
                        variant="outline"
                        className={mtDiff ? 'border-amber-500 bg-amber-500/20' : 'border-zinc-700'}
                      >
                        {mt}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={trigDiff ? 'border-blue-500 bg-blue-500/20' : 'border-zinc-700'}
                      >
                        {trig}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Messaging flow and coherence for primary app */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-foreground">Messaging Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-1 text-zinc-200">
            {primaryShots.map((shot, idx) => (
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
          <p className="text-sm text-zinc-400">
            Keyword overlap across first three screenshots
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

