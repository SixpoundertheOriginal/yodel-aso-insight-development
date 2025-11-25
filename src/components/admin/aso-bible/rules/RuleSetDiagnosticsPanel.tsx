import React from 'react';
import type { MergedRuleSet } from '@/engine/asoBible/rulesetEngine/rulesetMerger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Activity } from 'lucide-react';

interface RuleSetDiagnosticsPanelProps {
  mergedRuleSet?: MergedRuleSet | null;
}

export function RuleSetDiagnosticsPanel({
  mergedRuleSet,
}: RuleSetDiagnosticsPanelProps) {
  if (!mergedRuleSet) {
    return null;
  }

  const leakWarnings = mergedRuleSet.leakWarnings || [];
  const thresholds = mergedRuleSet.discoveryThresholds;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Rule Set Diagnostics</CardTitle>
        <Badge variant="outline" className="uppercase tracking-wide">
          {mergedRuleSet.source || 'code'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {thresholds && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground uppercase tracking-wide">
              Discovery Thresholds
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ThresholdMetric label="Excellent" value={thresholds.excellent} />
              <ThresholdMetric label="Good" value={thresholds.good} />
              <ThresholdMetric label="Moderate" value={thresholds.moderate} />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground uppercase tracking-wide">
            Override Sources
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedRuleSet?.inheritanceChain || {})
              .filter(([, value]) => Boolean(value))
              .map(([scope, value]) => (
                <Badge key={scope} variant="outline">
                  {scope}: {(value as any)?.label || (value as any)?.id || 'Custom'}
                </Badge>
              ))}
            {Object.keys(mergedRuleSet?.inheritanceChain || {}).length === 0 && (
              <span className="text-sm text-muted-foreground">
                No overrides applied
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
            <Activity className="w-4 h-4" />
            Leak Detection
            {leakWarnings.length > 0 ? (
              <Badge variant="destructive">{leakWarnings.length} warning(s)</Badge>
            ) : (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Clean
              </Badge>
            )}
          </div>
          {leakWarnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leaks detected for this ruleset context.
            </p>
          ) : (
            <div className="space-y-3">
              {leakWarnings.map((warning, index) => (
                <Alert key={`${warning.message}-${index}`} variant="default">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-sm font-semibold capitalize">
                    {warning.type.replace('_', ' ')}
                  </AlertTitle>
                  <AlertDescription className="text-sm">
                    {warning.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ThresholdMetricProps {
  label: string;
  value?: number;
}

function ThresholdMetric({ label, value }: ThresholdMetricProps) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold">
        {value !== undefined ? value : '—'}
      </div>
    </div>
  );
}
