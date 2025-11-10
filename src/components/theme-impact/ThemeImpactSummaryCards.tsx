/**
 * THEME IMPACT SUMMARY CARDS
 *
 * Displays high-level summary metrics for theme impact analysis
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ThemeImpactSummary {
  totalThemes: number;
  criticalThemes: number;
  highImpactThemes: number;
  risingThemes: number;
  averageImpactScore: number;
}

interface ThemeImpactSummaryCardsProps {
  summary: ThemeImpactSummary;
  isLoading?: boolean;
}

export function ThemeImpactSummaryCards({
  summary,
  isLoading = false
}: ThemeImpactSummaryCardsProps) {
  const cards = [
    {
      title: 'Critical Themes',
      value: summary.criticalThemes,
      subtitle: 'Immediate action required',
      icon: AlertTriangle,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200'
    },
    {
      title: 'High Impact',
      value: summary.highImpactThemes,
      subtitle: 'Requires attention',
      icon: AlertCircle,
      colorClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200'
    },
    {
      title: 'Rising Trends',
      value: summary.risingThemes,
      subtitle: 'Increasing mentions',
      icon: TrendingUp,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200'
    },
    {
      title: 'Avg Impact Score',
      value: summary.averageImpactScore,
      subtitle: `of ${summary.totalThemes} themes`,
      icon: BarChart3,
      colorClass: 'text-purple-600',
      bgClass: 'bg-purple-50',
      borderClass: 'border-purple-200'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={cn(
              'border-l-4 transition-all hover:shadow-md',
              card.borderClass
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Icon className={cn('h-4 w-4', card.colorClass)} />
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('text-3xl font-bold', card.colorClass)}>
                {card.value}
              </div>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
