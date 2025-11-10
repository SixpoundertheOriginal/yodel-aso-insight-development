/**
 * AI RECOMMENDATIONS PANEL COMPONENT
 *
 * Displays prioritized actionable recommendations for improving app rating
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Wrench, Megaphone, Eye, AlertTriangle, Clock, Users, TrendingUp } from 'lucide-react';
import type { ActionableInsights } from '@/types/review-intelligence.types';

interface AIRecommendationsPanelProps {
  insights: ActionableInsights;
}

export function AIRecommendationsPanel({ insights }: AIRecommendationsPanelProps) {
  const { priorityIssues, improvements, alerts } = insights;

  return (
    <div className="space-y-6">
      {/* Alerts (if any) */}
      {alerts && alerts.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-700" />
              <CardTitle className="text-lg">Active Alerts</CardTitle>
            </div>
            <CardDescription>Trending patterns requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <AlertCard key={idx} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Recommendations Card */}
      <Card className="border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-blue-600" />
            <CardTitle className="text-xl">AI Recommendations</CardTitle>
          </div>
          <CardDescription>
            Prioritized actions to improve app rating and user satisfaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Priority Issues Section */}
            {priorityIssues && priorityIssues.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="w-4 h-4 text-red-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Issues to Fix</h3>
                  <Badge variant="destructive" className="text-xs">
                    {priorityIssues.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {priorityIssues.map((issue, idx) => (
                    <RecommendationCard
                      key={idx}
                      type="fix"
                      title={issue.issue}
                      impact={issue.impact}
                      affectedUsers={issue.affectedUsers}
                      recommendation={issue.recommendation}
                      urgency={issue.urgency}
                      rank={idx + 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Opportunities Section */}
            {improvements && improvements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-sm text-gray-700">Opportunities to Promote</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                    {improvements.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {improvements.map((improvement, idx) => (
                    <ImprovementCard
                      key={idx}
                      opportunity={improvement.opportunity}
                      userDemand={improvement.userDemand}
                      businessImpact={improvement.businessImpact}
                      effort={improvement.effort}
                      roi={improvement.roi}
                      rank={idx + 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!priorityIssues || priorityIssues.length === 0) &&
             (!improvements || improvements.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recommendations at this time</p>
                <p className="text-sm mt-1">The app is performing well!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Recommendation Card (for issues to fix)

interface RecommendationCardProps {
  type: 'fix';
  title: string;
  impact: number;
  affectedUsers: number;
  recommendation: string;
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  rank: number;
}

function RecommendationCard({
  title,
  impact,
  affectedUsers,
  recommendation,
  urgency,
  rank
}: RecommendationCardProps) {
  const urgencyConfig = {
    immediate: {
      color: 'bg-red-600',
      badgeColor: 'bg-red-100 text-red-700 border-red-300',
      label: 'Immediate',
      icon: AlertTriangle
    },
    high: {
      color: 'bg-orange-500',
      badgeColor: 'bg-orange-100 text-orange-700 border-orange-300',
      label: 'High',
      icon: Clock
    },
    medium: {
      color: 'bg-yellow-500',
      badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      label: 'Medium',
      icon: Clock
    },
    low: {
      color: 'bg-blue-500',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-300',
      label: 'Low',
      icon: Clock
    }
  };

  const config = urgencyConfig[urgency];
  const UrgencyIcon = config.icon;
  const impactPercentage = Math.round(impact * 100);

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        <div className={`w-8 h-8 rounded-full ${config.color} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-semibold text-sm capitalize">{title}</h4>
            <Badge variant="outline" className={`${config.badgeColor} shrink-0 text-xs`}>
              <UrgencyIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          </div>

          <p className="text-sm text-gray-600 mb-3">{recommendation}</p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>~{affectedUsers} users impacted</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{impactPercentage}% impact potential</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Improvement Card (for opportunities to promote)

interface ImprovementCardProps {
  opportunity: string;
  userDemand: number;
  businessImpact: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  roi: number;
  rank: number;
}

function ImprovementCard({
  opportunity,
  userDemand,
  businessImpact,
  effort,
  roi,
  rank
}: ImprovementCardProps) {
  const effortConfig = {
    small: { color: 'bg-green-100 text-green-700', label: 'Small' },
    medium: { color: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
    large: { color: 'bg-red-100 text-red-700', label: 'Large' }
  };

  const impactConfig = {
    high: { color: 'text-green-700', label: 'High' },
    medium: { color: 'text-yellow-700', label: 'Medium' },
    low: { color: 'text-gray-700', label: 'Low' }
  };

  const effortConf = effortConfig[effort];
  const impactConf = impactConfig[businessImpact];
  const demandPercentage = Math.round(userDemand * 100);

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-semibold text-sm">{opportunity}</h4>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={effortConf.color}>
                {effortConf.label} effort
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{demandPercentage}% user demand</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className={impactConf.color}>{impactConf.label} impact</span>
            </div>
            <div className="flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              <span>{roi.toFixed(0)} ROI score</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${Math.min(roi, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 font-medium">{Math.min(roi, 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alert Card

interface AlertCardProps {
  alert: {
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    actionable: boolean;
  };
}

function AlertCard({ alert }: AlertCardProps) {
  const severityConfig = {
    critical: { color: 'bg-red-100 border-red-300', icon: AlertTriangle, iconColor: 'text-red-600' },
    warning: { color: 'bg-yellow-100 border-yellow-300', icon: AlertTriangle, iconColor: 'text-yellow-600' },
    info: { color: 'bg-blue-100 border-blue-300', icon: Lightbulb, iconColor: 'text-blue-600' }
  };

  // Safely get config with fallback to 'info' if severity is undefined or invalid
  const severity = alert?.severity || 'info';
  const config = severityConfig[severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`border rounded p-3 ${config.color}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 ${config.iconColor} shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className="text-sm font-medium">{alert.message}</p>
          {alert.actionable && (
            <Button variant="link" className="p-0 h-auto mt-1 text-xs">
              View details →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
