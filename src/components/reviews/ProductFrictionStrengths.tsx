/**
 * PRODUCT FRICTION & STRENGTHS COMPONENT
 *
 * Displays side-by-side breakdown of what's hurting and helping the app
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import type { ReviewIntelligence } from '@/types/review-intelligence.types';

interface ProductFrictionStrengthsProps {
  issuePatterns: ReviewIntelligence['issuePatterns'];
  featureMentions: ReviewIntelligence['featureMentions'];
  totalReviews?: number;
}

export function ProductFrictionStrengths({
  issuePatterns,
  featureMentions,
  totalReviews = 100
}: ProductFrictionStrengthsProps) {
  // Filter positive feature mentions for strengths
  const strengths = featureMentions
    .filter(f => f.sentiment > 0.3)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);

  // Top frictions
  const frictions = issuePatterns
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Product Frictions Card */}
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <CardTitle className="text-lg">Top Product Frictions</CardTitle>
          </div>
          <CardDescription>
            Issues negatively impacting user experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          {frictions.length > 0 ? (
            <div className="space-y-4">
              {frictions.map((issue, idx) => (
                <FrictionItem
                  key={idx}
                  issue={issue.issue}
                  frequency={issue.frequency}
                  severity={issue.severity}
                  affectedVersions={issue.affectedVersions}
                  totalReviews={totalReviews}
                  rank={idx + 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No significant issues detected!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strength Drivers Card */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <CardTitle className="text-lg">Top Strength Drivers</CardTitle>
          </div>
          <CardDescription>
            Features users love and appreciate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {strengths.length > 0 ? (
            <div className="space-y-4">
              {strengths.map((feature, idx) => (
                <StrengthItem
                  key={idx}
                  feature={feature.feature}
                  mentions={feature.mentions}
                  sentiment={feature.sentiment}
                  impact={feature.impact}
                  totalReviews={totalReviews}
                  rank={idx + 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MinusCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No standout features mentioned yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Friction Item Component

interface FrictionItemProps {
  issue: string;
  frequency: number;
  severity: 'critical' | 'major' | 'minor';
  affectedVersions: string[];
  totalReviews: number;
  rank: number;
}

function FrictionItem({
  issue,
  frequency,
  severity,
  affectedVersions,
  totalReviews,
  rank
}: FrictionItemProps) {
  const percentage = Math.round((frequency / totalReviews) * 100);
  const estimatedImpact = calculateIssueImpact(frequency, severity, totalReviews);

  const severityConfig = {
    critical: { color: 'bg-red-600', textColor: 'text-red-700', icon: AlertCircle },
    major: { color: 'bg-orange-500', textColor: 'text-orange-700', icon: AlertTriangle },
    minor: { color: 'bg-yellow-500', textColor: 'text-yellow-700', icon: MinusCircle }
  };

  const config = severityConfig[severity];
  const SeverityIcon = config.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <div className={`w-6 h-6 rounded-full ${config.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm capitalize">{issue}</p>
              <Badge variant="outline" className={`${config.textColor} border-current text-xs`}>
                <SeverityIcon className="w-3 h-3 mr-1" />
                {severity}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
              <span>{frequency} mention{frequency !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{percentage}% of reviews</span>
              {affectedVersions.length > 0 && (
                <>
                  <span>•</span>
                  <span className="truncate">v{affectedVersions.slice(0, 2).join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="text-sm font-semibold text-red-700">
            {estimatedImpact > 0 ? '-' : ''}{Math.abs(estimatedImpact).toFixed(1)}★
          </div>
          <div className="text-xs text-gray-500">impact</div>
        </div>
      </div>
      <Progress value={percentage} className="h-2" indicatorClassName="bg-red-500" />
    </div>
  );
}

// Strength Item Component

interface StrengthItemProps {
  feature: string;
  mentions: number;
  sentiment: number;
  impact: 'high' | 'medium' | 'low';
  totalReviews: number;
  rank: number;
}

function StrengthItem({
  feature,
  mentions,
  sentiment,
  impact,
  totalReviews,
  rank
}: StrengthItemProps) {
  const percentage = Math.round((mentions / totalReviews) * 100);
  const sentimentPercentage = Math.round(sentiment * 100);
  const estimatedBoost = calculateStrengthBoost(mentions, sentiment, totalReviews);

  const impactConfig = {
    high: { color: 'bg-green-600', textColor: 'text-green-700' },
    medium: { color: 'bg-blue-500', textColor: 'text-blue-700' },
    low: { color: 'bg-gray-500', textColor: 'text-gray-700' }
  };

  const config = impactConfig[impact];

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <div className={`w-6 h-6 rounded-full ${config.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm capitalize">{feature}</p>
              <Badge variant="outline" className={`${config.textColor} border-current text-xs`}>
                {impact} impact
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
              <span>{mentions} mention{mentions !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{percentage}% of reviews</span>
              <span>•</span>
              <span>{sentimentPercentage}% positive</span>
            </div>
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="text-sm font-semibold text-green-700">
            +{estimatedBoost.toFixed(1)}★
          </div>
          <div className="text-xs text-gray-500">boost</div>
        </div>
      </div>
      <Progress value={sentimentPercentage} className="h-2" indicatorClassName="bg-green-500" />
    </div>
  );
}

// Helper Functions

function calculateIssueImpact(frequency: number, severity: 'critical' | 'major' | 'minor', totalReviews: number): number {
  const severityWeight = {
    critical: -0.3,
    major: -0.2,
    minor: -0.1
  };

  const baseImpact = severityWeight[severity];
  const frequencyMultiplier = Math.min(frequency / totalReviews, 0.5);

  return baseImpact * (1 + frequencyMultiplier);
}

function calculateStrengthBoost(mentions: number, sentiment: number, totalReviews: number): number {
  const frequencyWeight = Math.min(mentions / totalReviews, 0.3);
  const sentimentWeight = Math.max(sentiment, 0);

  return frequencyWeight * sentimentWeight * 2; // Scale to star rating range
}
