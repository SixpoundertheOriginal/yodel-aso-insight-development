/**
 * CRITICAL THEMES LIST
 *
 * Displays high-priority themes requiring immediate attention
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeImpactScore } from '@/services/theme-impact-scoring.service';

interface CriticalThemesListProps {
  themes: ThemeImpactScore[];
  isLoading?: boolean;
  onViewDetails?: (theme: ThemeImpactScore) => void;
  maxItems?: number;
}

export function CriticalThemesList({
  themes,
  isLoading = false,
  onViewDetails,
  maxItems = 10
}: CriticalThemesListProps) {
  const displayThemes = themes.slice(0, maxItems);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Critical Themes</CardTitle>
          <CardDescription>Loading critical themes...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (displayThemes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Critical Themes</CardTitle>
          <CardDescription>No critical themes found</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No themes require immediate attention. Great job! 🎉
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Critical Themes
        </CardTitle>
        <CardDescription>
          {displayThemes.length} theme{displayThemes.length !== 1 ? 's' : ''} requiring immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayThemes.map((theme, index) => (
          <ThemeCard
            key={theme.id || index}
            theme={theme}
            index={index}
            onViewDetails={onViewDetails}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface ThemeCardProps {
  theme: ThemeImpactScore;
  index: number;
  onViewDetails?: (theme: ThemeImpactScore) => void;
}

function ThemeCard({ theme, index, onViewDetails }: ThemeCardProps) {
  const getImpactColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'immediate':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSentimentEmoji = (sentiment: number) => {
    if (sentiment < -0.5) return '😡';
    if (sentiment < -0.2) return '😠';
    if (sentiment < 0.2) return '😐';
    if (sentiment < 0.5) return '🙂';
    return '😊';
  };

  return (
    <div className={cn(
      'p-4 rounded-lg border-2 transition-all hover:shadow-md',
      theme.impactLevel === 'critical' ? 'border-red-300 bg-red-50/50' :
      theme.impactLevel === 'high' ? 'border-orange-300 bg-orange-50/50' :
      'border-gray-300 bg-gray-50/50'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-semibold text-gray-700">
              {index + 1}.
            </span>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {theme.theme}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getUrgencyColor(theme.urgency)}>
              {theme.urgency}
            </Badge>
            <Badge variant="outline" className={getImpactColor(theme.impactLevel)}>
              {theme.impactLevel}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              {theme.themeCategory.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">
            {Math.round(theme.impactScore)}
            <span className="text-sm text-gray-500">/100</span>
          </div>
          <p className="text-xs text-gray-500">Impact Score</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-900">{theme.mentionCount}</span>
          <span className="text-gray-500">mentions</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">{getSentimentEmoji(theme.avgSentiment)}</span>
          <span className="font-medium text-gray-900">
            {theme.avgSentiment.toFixed(2)}
          </span>
          <span className="text-gray-500">sentiment</span>
        </div>
        <div className="flex items-center gap-1">
          {getTrendIcon(theme.trendDirection)}
          <span className="font-medium text-gray-900 capitalize">
            {theme.trendDirection}
          </span>
        </div>
      </div>

      {/* Recommendation */}
      {theme.recommendedAction && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
          <p className="text-sm font-medium text-blue-900 mb-1">
            💡 Recommended Action
          </p>
          <p className="text-sm text-blue-800">{theme.recommendedAction}</p>
          {theme.estimatedEffort && (
            <p className="text-xs text-blue-600 mt-1">
              Estimated effort: <span className="font-medium">{theme.estimatedEffort}</span>
            </p>
          )}
        </div>
      )}

      {/* Potential Impact */}
      {theme.potentialRatingImpact && theme.potentialRatingImpact > 0 && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="text-gray-700">
            Potential rating improvement:
            <span className="font-bold text-green-600 ml-1">
              +{theme.potentialRatingImpact}★
            </span>
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(theme)}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View Details
          </Button>
        )}
      </div>
    </div>
  );
}
