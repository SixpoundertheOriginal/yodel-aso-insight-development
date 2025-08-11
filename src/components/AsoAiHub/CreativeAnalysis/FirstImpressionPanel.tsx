import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CreativeAnalysisWithAI,
  type AppInfo,
} from '@/services/creative-analysis.service';

interface MessagingComparison {
  commonThemes: string[];
  uniqueMessages: { appName: string; uniqueThemes: string[] }[];
  messagingStrategy: 'feature-focused' | 'benefit-focused' | 'emotional' | 'mixed';
  differentiationScore: number;
}

interface VisualDifferentiation {
  colorDiversity: number;
  layoutVariation: number;
  designApproaches: string[];
  standoutElements: { appName: string; elements: string[] }[];
}

interface PositioningInsights {
  marketPosition: {
    appName: string;
    position: 'premium' | 'mass-market' | 'niche' | 'innovative';
    reasoning: string;
  }[];
  recommendedStrategy: string;
  opportunityGaps: string[];
}

interface NarrativeFlowAnalysis {
  coherenceScore: number;
  storyArc:
    | 'problem-solution'
    | 'feature-showcase'
    | 'social-proof'
    | 'lifestyle'
    | 'onboarding'
    | 'mixed';
  narrativeStrength: 'excellent' | 'good' | 'weak' | 'disconnected';
  userJourneyFlow: {
    screenshot1Role: 'hook' | 'problem' | 'feature' | 'social-proof';
    screenshot2Role: 'development' | 'solution' | 'benefits' | 'proof';
    screenshot3Role: 'reinforcement' | 'cta' | 'outcome' | 'social-validation';
  };
  recommendations: {
    messaging: string[];
    visualFlow: string[];
    userExperience: string[];
  };
  confidence: number;
}

function compareMessaging(analyses: CreativeAnalysisWithAI[]): MessagingComparison {
  const themeSets = analyses.map(a => {
    const keywords = new Set<string>();
    a.individual.slice(0, 3).forEach(s => {
      (s.messageAnalysis.keywords || []).forEach(k => keywords.add(k.toLowerCase()));
    });
    return {
      appName: a.individual[0]?.appName || 'App',
      keywords,
      types: a.individual.slice(0, 3).map(s => s.messageAnalysis.messageType),
    };
  });

  const allThemes = new Set<string>();
  themeSets.forEach(t => t.keywords.forEach(k => allThemes.add(k)));

  const commonThemes = Array.from(allThemes).filter(theme =>
    themeSets.filter(t => t.keywords.has(theme)).length >= 2
  );

  const uniqueMessages = themeSets.map(t => ({
    appName: t.appName,
    uniqueThemes: Array.from(t.keywords).filter(k =>
      themeSets.every(o => o === t || !o.keywords.has(k))
    ),
  }));

  const totalUnique = uniqueMessages.reduce(
    (sum, u) => sum + u.uniqueThemes.length,
    0
  );

  const differentiationScore = allThemes.size
    ? Math.round((totalUnique / allThemes.size) * 100)
    : 0;

  const typeCounts: Record<string, number> = {};
  themeSets.forEach(t => {
    t.types.forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
  });

  const strategyMap: Record<string, MessagingComparison['messagingStrategy']> = {
    feature: 'feature-focused',
    functional: 'feature-focused',
    benefit: 'benefit-focused',
    social_proof: 'benefit-focused',
    emotional: 'emotional',
  };

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  let messagingStrategy: MessagingComparison['messagingStrategy'] = 'mixed';
  if (sortedTypes.length) {
    const top = sortedTypes[0];
    const mapped = strategyMap[top[0]];
    const total = Object.values(typeCounts).reduce((a, b) => a + b, 0);
    if (mapped && top[1] / total > 0.5) {
      messagingStrategy = mapped;
    }
  }

  return {
    commonThemes,
    uniqueMessages,
    messagingStrategy,
    differentiationScore,
  };
}

function analyzeVisualDifferentiation(
  analyses: CreativeAnalysisWithAI[]
): VisualDifferentiation {
  const primaryColors = analyses.map(
    a => a.individual[0]?.colorPalette.primary.toLowerCase() || ''
  );
  const colorDiversity = Math.round(
    (new Set(primaryColors).size / analyses.length) * 100
  );

  const layouts = analyses.map(
    a => a.individual[0]?.visualHierarchy.layout_type || ''
  );
  const layoutVariation = Math.round(
    (new Set(layouts).size / analyses.length) * 100
  );

  const designApproaches = Array.from(
    new Set(
      analyses.flatMap(a =>
        a.individual.slice(0, 3).map(s => s.visualHierarchy.layout_type)
      )
    )
  );

  const patternSets = analyses.map(a =>
    new Set(a.individual.slice(0, 3).flatMap(s => s.designPatterns))
  );
  const allPatterns = new Set<string>();
  patternSets.forEach(s => s.forEach(p => allPatterns.add(p)));

  const standoutElements = analyses.map((a, idx) => ({
    appName: a.individual[0]?.appName || 'App',
    elements: Array.from(patternSets[idx]).filter(p =>
      patternSets.every((set, j) => j === idx || !set.has(p))
    ),
  }));

  return {
    colorDiversity,
    layoutVariation,
    designApproaches,
    standoutElements,
  };
}

function generatePositioningInsights(
  messaging: MessagingComparison,
  appInfos: Array<AppInfo | undefined>
): PositioningInsights {
  // Strongly type position to the literal union
  type PositionType = PositioningInsights['marketPosition'][number]['position'];
  const getPosition = (score: number): PositionType =>
    score > 70 ? 'innovative' : score > 40 ? 'premium' : 'mass-market';

  const positions: PositioningInsights['marketPosition'] = appInfos.map(info => ({
    appName: info?.title || 'App',
    position: getPosition(messaging.differentiationScore),
    reasoning: 'Based on messaging differentiation and themes',
  }));

  const recommendedStrategy =
    messaging.differentiationScore < 40
      ? 'Increase differentiation by highlighting unique features'
      : 'Maintain messaging strategy while reinforcing strengths';

  const opportunityGaps = messaging.commonThemes.length
    ? [
        `Differentiate from common themes: ${messaging.commonThemes.join(', ')}`,
      ]
    : ['Explore unique value propositions'];

  return {
    marketPosition: positions,
    recommendedStrategy,
    opportunityGaps,
  };
}

interface FirstImpressionPanelProps {
  analysis: CreativeAnalysisWithAI;
  competitorAnalyses?: CreativeAnalysisWithAI[];
  appInfo?: AppInfo;
  competitorAppInfo?: AppInfo[];
}

export const FirstImpressionPanel: React.FC<FirstImpressionPanelProps> = ({
  analysis,
  competitorAnalyses = [],
  appInfo,
  competitorAppInfo = [],
}) => {
  const singleView = competitorAnalyses.length === 0;
  const [narrativeAnalysis, setNarrativeAnalysis] = useState<NarrativeFlowAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);

  const handleAnalyzeFlow = async () => {
    const firstThreeScreenshots = analysis.individual.slice(0, 3);
    setAnalyzing(true);
    setNarrativeError(null);
    try {
      const response = await fetch('/api/creative-vision-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshots: firstThreeScreenshots.map(s => s.screenshotUrl),
          organizationId: '',
          sessionId: '',
          analyzeNarrativeFlow: true,
        }),
      });
      const result = await response.json();
      setNarrativeAnalysis(result.narrativeFlow);
    } catch (error) {
      console.error('Narrative analysis error:', error);
      setNarrativeError('Failed to analyze narrative flow. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (singleView) {
    const firstThree = analysis.individual.slice(0, 3);

    const coherence = useMemo(() => {
      if (firstThree.length === 0) return 0;

      const keywordSets = firstThree.map(
        s => new Set((s.messageAnalysis.keywords || []).map(k => k.toLowerCase()))
      );
      const union = new Set<string>();
      keywordSets.forEach(set => set.forEach(k => union.add(k)));

      const intersection = keywordSets.reduce<Set<string> | null>(
        (acc, set) => {
          if (acc === null) return new Set(set);
          return new Set(Array.from(acc).filter(k => set.has(k)));
        },
        null
      );

      return union.size > 0 && intersection
        ? Math.round((intersection.size / union.size) * 100)
        : 0;
    }, [firstThree]);

    if (firstThree.length === 0) {
      return (
        <p className="text-zinc-400">No screenshots available for first impression.</p>
      );
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
              <p className="text-sm text-zinc-300">
                {shot.messageAnalysis.primaryMessage}
              </p>
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
            <p className="text-sm text-zinc-400">
              Keyword overlap across first three screenshots
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allAnalyses = useMemo(
    () => [analysis, ...competitorAnalyses],
    [analysis, competitorAnalyses]
  );
  const appInfos = [appInfo, ...competitorAppInfo];

  const messagingComparison = useMemo(
    () => compareMessaging(allAnalyses),
    [allAnalyses]
  );
  const visualDiff = useMemo(
    () => analyzeVisualDifferentiation(allAnalyses),
    [allAnalyses]
  );
  const positioning = useMemo(
    () => generatePositioningInsights(messagingComparison, appInfos),
    [messagingComparison, appInfos]
  );

  const labels = ['Hook', 'Develop', 'Reinforce'];

  return (
    <div className="space-y-6">
      <Button
        onClick={handleAnalyzeFlow}
        disabled={analyzing || allAnalyses.length === 0}
        className="mb-4"
      >
        {analyzing ? 'Analyzing Flow...' : 'Analyze First Impression Flow'}
      </Button>
      {narrativeError && (
        <div className="text-red-400 text-sm mt-2">{narrativeError}</div>
      )}
      {narrativeAnalysis && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground">Narrative Flow Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-zinc-100">
                  {narrativeAnalysis.coherenceScore}%
                </p>
                <p className="text-sm text-zinc-400">Story Coherence</p>
                <Badge
                  variant={
                    narrativeAnalysis.narrativeStrength === 'excellent'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {narrativeAnalysis.narrativeStrength}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">Story Arc</h4>
                <p className="text-zinc-300 capitalize">
                  {narrativeAnalysis.storyArc.replace('-', ' ')}
                </p>
                <div className="mt-2 space-y-1 text-sm text-zinc-400">
                  <p>Screen 1: {narrativeAnalysis.userJourneyFlow.screenshot1Role}</p>
                  <p>Screen 2: {narrativeAnalysis.userJourneyFlow.screenshot2Role}</p>
                  <p>Screen 3: {narrativeAnalysis.userJourneyFlow.screenshot3Role}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">Messaging Recommendations</h4>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {narrativeAnalysis.recommendations.messaging.map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">Visual Flow Improvements</h4>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {narrativeAnalysis.recommendations.visualFlow.map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allAnalyses.map((a, idx) => (
            <div key={idx} className="text-center">
              <h4 className="font-semibold text-zinc-100">
                {appInfos[idx]?.title || a.individual[0]?.appName}
              </h4>
              {appInfos[idx]?.developer && (
                <p className="text-sm text-zinc-400">
                  {appInfos[idx]?.developer}
                </p>
              )}
            </div>
          ))}
        </div>

        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-2">
            <h5 className="text-sm font-medium text-zinc-300">
              {labels[i]}
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allAnalyses.map((a, idx) => {
                const shot = a.individual[i];
                return (
                  <div
                    key={`${idx}-${i}`}
                    className={`space-y-2 ${
                      idx === 0 ? 'ring-2 ring-purple-500 rounded-lg p-1' : ''
                    }`}
                  >
                    {shot ? (
                      <img
                        src={shot.screenshotUrl}
                        alt={`App ${idx + 1} Screenshot ${i + 1}`}
                        className="w-full rounded-lg border border-zinc-800"
                      />
                    ) : (
                      <div className="w-full rounded-lg border border-zinc-800 h-48 bg-zinc-800" />
                    )}
                    <p className="text-sm text-zinc-300">
                      {shot?.messageAnalysis.primaryMessage ||
                        'No message available'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground">
              Messaging Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-zinc-400 mb-2">Common Themes</p>
                <div className="flex flex-wrap gap-2">
                  {messagingComparison.commonThemes.map(theme => (
                    <Badge key={theme} variant="secondary">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-2">Unique Positioning</p>
                {messagingComparison.uniqueMessages.map(app => (
                  <div key={app.appName} className="mb-2">
                    <span className="font-medium text-zinc-200">
                      {app.appName}:
                    </span>
                    <span className="text-zinc-300 ml-2">
                      {app.uniqueThemes.join(', ') || 'None'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground">
              Competitive Differentiation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold text-zinc-100">
                {messagingComparison.differentiationScore}%
              </p>
              <p className="text-sm text-zinc-400">
                {messagingComparison.differentiationScore > 70
                  ? 'Highly differentiated'
                  : messagingComparison.differentiationScore > 40
                  ? 'Moderately differentiated'
                  : 'Low differentiation - opportunity for improvement'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground">
              Positioning Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {positioning.marketPosition.map(m => (
                <div key={m.appName}>
                  <span className="font-medium text-zinc-200">
                    {m.appName}:
                  </span>
                  <span className="text-zinc-300 ml-2 capitalize">
                    {m.position}
                  </span>
                </div>
              ))}
              <p className="text-sm text-zinc-400">
                {positioning.recommendedStrategy}
              </p>
              <p className="text-sm text-zinc-400">
                Design approaches: {visualDiff.designApproaches.join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

