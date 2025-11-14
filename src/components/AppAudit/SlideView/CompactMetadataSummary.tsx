import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Lightbulb } from 'lucide-react';

interface CompactMetadataSummaryProps {
  metadataScore: number;
  metadataAnalysis: {
    scores: {
      title: number;
      subtitle: number;
      keywords: number;
      description: number;
      breakdown: {
        characterUsage: number;
        keywordDensity: number;
        uniqueness: number;
        competitiveStrength: number;
      };
    };
    recommendations: Array<{
      field: string;
      priority: string;
      issue: string;
      suggestion: string;
    }>;
  } | null;
}

export const CompactMetadataSummary: React.FC<CompactMetadataSummaryProps> = ({
  metadataScore,
  metadataAnalysis
}) => {
  const scoreColor =
    metadataScore >= 70 ? 'text-green-400' :
    metadataScore >= 50 ? 'text-blue-400' :
    metadataScore >= 30 ? 'text-yellow-400' : 'text-red-400';

  const getScoreColor = (score: number) =>
    score >= 70 ? 'text-green-400' :
    score >= 50 ? 'text-blue-400' :
    score >= 30 ? 'text-yellow-400' : 'text-red-400';

  if (!metadataAnalysis) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <p className="text-zinc-400 text-center">Metadata analysis not available</p>
        </CardContent>
      </Card>
    );
  }

  const topRecommendation = metadataAnalysis.recommendations.find(r => r.priority === 'high');

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-400" />
              <span className="text-sm text-zinc-400">Overall Metadata Score</span>
            </div>
            <span className={`text-3xl font-bold ${scoreColor}`}>{metadataScore}/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Component Scores */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400 mb-1">Title</p>
            <p className={`text-2xl font-bold ${getScoreColor(metadataAnalysis.scores.title)}`}>
              {metadataAnalysis.scores.title}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400 mb-1">Subtitle</p>
            <p className={`text-2xl font-bold ${getScoreColor(metadataAnalysis.scores.subtitle)}`}>
              {metadataAnalysis.scores.subtitle}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400 mb-1">Keywords</p>
            <p className={`text-2xl font-bold ${getScoreColor(metadataAnalysis.scores.keywords)}`}>
              {metadataAnalysis.scores.keywords}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400 mb-1">Description</p>
            <p className={`text-2xl font-bold ${getScoreColor(metadataAnalysis.scores.description)}`}>
              {metadataAnalysis.scores.description}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400 mb-1">Character Usage</p>
            <p className="text-lg font-bold text-foreground">
              {metadataAnalysis.scores.breakdown.characterUsage}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400 mb-1">Keyword Density</p>
            <p className="text-lg font-bold text-foreground">
              {metadataAnalysis.scores.breakdown.keywordDensity}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Recommendation */}
      {topRecommendation && (
        <Card className="bg-gradient-to-r from-yodel-orange/5 to-transparent border-l-4 border-yodel-orange">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-yodel-orange flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-yodel-orange font-semibold uppercase tracking-wide mb-1">
                  Top Priority: {topRecommendation.field}
                </p>
                <p className="text-sm text-zinc-200 mb-1">{topRecommendation.issue}</p>
                <p className="text-xs text-zinc-400">{topRecommendation.suggestion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
