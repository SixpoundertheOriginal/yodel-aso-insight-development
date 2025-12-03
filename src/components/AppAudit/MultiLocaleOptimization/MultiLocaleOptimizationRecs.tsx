/**
 * Multi-Locale Optimization Recommendations
 * Rule-based suggestions using existing audit engine logic
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { MultiLocaleRecommendation } from '@/types/multiLocaleMetadata';
import { LOCALE_NAMES } from '@/types/multiLocaleMetadata';

interface MultiLocaleOptimizationRecsProps {
  recommendations: MultiLocaleRecommendation[];
}

export const MultiLocaleOptimizationRecs: React.FC<MultiLocaleOptimizationRecsProps> = ({
  recommendations,
}) => {
  // Group by severity
  const critical = recommendations.filter(r => r.severity === 'critical');
  const warnings = recommendations.filter(r => r.severity === 'warning');
  const info = recommendations.filter(r => r.severity === 'info');

  // Get icon based on severity
  const getIcon = (severity: string) => {
    if (severity === 'critical') return <AlertCircle className="h-4 w-4" />;
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  // Render single recommendation
  const renderRecommendation = (rec: MultiLocaleRecommendation) => {
    return (
      <Alert
        key={rec.id}
        className={`mb-3 ${
          rec.severity === 'critical'
            ? 'bg-red-500/10 border-red-500/30'
            : rec.severity === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 ${
              rec.severity === 'critical'
                ? 'text-red-400'
                : rec.severity === 'warning'
                ? 'text-amber-400'
                : 'text-blue-400'
            }`}
          >
            {getIcon(rec.severity)}
          </div>

          <div className="flex-1">
            <AlertTitle className="text-sm font-medium mb-1">
              {rec.title}
            </AlertTitle>
            <AlertDescription className="text-xs text-zinc-400 mb-2">
              {rec.message}
            </AlertDescription>

            {/* Actionable Suggestion */}
            {rec.action && (
              <div className="mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-800">
                <p className="text-xs font-medium text-zinc-300 mb-1">
                  💡 Suggested Action:
                </p>

                {/* Move Keyword Action */}
                {rec.action.type === 'move' && rec.action.keyword && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="border-violet-500/40 text-violet-400">
                        {rec.action.keyword}
                      </Badge>
                      <span className="text-zinc-500">→</span>
                      <span className="text-zinc-400">
                        Move from {LOCALE_NAMES[rec.action.fromLocale!]} to{' '}
                        {LOCALE_NAMES[rec.action.toLocale!]}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-400">
                      Expected Impact: {rec.action.expectedImpact}
                    </p>
                  </div>
                )}

                {/* Add Keyword Action */}
                {rec.action.type === 'add' && rec.action.toLocale && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">
                      Add keywords to {LOCALE_NAMES[rec.action.toLocale]}
                    </p>
                    <p className="text-[10px] text-emerald-400">
                      Expected Impact: {rec.action.expectedImpact}
                    </p>
                  </div>
                )}

                {/* Redistribute Action */}
                {rec.action.type === 'redistribute' && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">
                      Redistribute keywords across affected locales
                    </p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {rec.evidence.affectedLocales.map(locale => (
                        <Badge
                          key={locale}
                          variant="outline"
                          className="text-[10px] border-zinc-700 text-zinc-400"
                        >
                          {locale}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-emerald-400">
                      Expected Impact: {rec.action.expectedImpact}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Evidence */}
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 bg-zinc-900/30 rounded border border-zinc-800">
                <p className="text-zinc-500 mb-1">Current State:</p>
                <p className="text-zinc-400">{rec.evidence.currentState}</p>
              </div>
              <div className="p-2 bg-zinc-900/30 rounded border border-zinc-800">
                <p className="text-zinc-500 mb-1">Proposed State:</p>
                <p className="text-emerald-400">{rec.evidence.proposedState}</p>
              </div>
            </div>
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium text-zinc-200">
              💡 Multi-Locale Optimization Recommendations
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-1">
              Rule-based suggestions for optimal keyword distribution across locales
            </p>
          </div>

          {/* Summary Badges */}
          <div className="flex gap-2">
            {critical.length > 0 && (
              <Badge variant="outline" className="border-red-400/40 text-red-400">
                {critical.length} Critical
              </Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="outline" className="border-amber-400/40 text-amber-400">
                {warnings.length} Warnings
              </Badge>
            )}
            {info.length > 0 && (
              <Badge variant="outline" className="border-blue-400/40 text-blue-400">
                {info.length} Info
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {recommendations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-emerald-400 mb-1">✓ No issues found</p>
            <p className="text-xs text-zinc-500">
              Your multi-locale metadata is well optimized
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Critical Recommendations */}
            {critical.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Critical Issues ({critical.length})
                </h4>
                {critical.map(renderRecommendation)}
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({warnings.length})
                </h4>
                {warnings.map(renderRecommendation)}
              </div>
            )}

            {/* Info */}
            {info.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Opportunities ({info.length})
                </h4>
                {info.map(renderRecommendation)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
