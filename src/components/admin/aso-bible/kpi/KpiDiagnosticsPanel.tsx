import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KpiWithAdminMeta } from '@/services/admin/adminKpiService';
import { TimelineConnector } from '@/components/ui/timeline-connector';

interface KpiDiagnosticsPanelProps {
  kpi: KpiWithAdminMeta;
}

export function KpiDiagnosticsPanel({ kpi }: KpiDiagnosticsPanelProps) {
  const provenance = kpi.provenance || [{ scope: 'base', multiplier: 1 }];

  return (
    <Card>
      <CardHeader>
        <CardTitle>KPI Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground uppercase tracking-wide">
            Effective Weight
          </div>
          <div className="text-2xl font-semibold">
            {(kpi.effectiveWeight || kpi.weight).toFixed(3)}
          </div>
          {kpi.overrideMultiplier && kpi.overrideMultiplier !== 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              Override multiplier: ×{kpi.overrideMultiplier.toFixed(2)}
            </p>
          )}
        </div>

        <div>
          <div className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
            Provenance
          </div>
          <div className="space-y-4">
            {provenance.map((entry, index) => (
              <div key={`${entry.scope}-${index}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary/70" />
                  {index < provenance.length - 1 && <TimelineConnector />}
                </div>
                <div>
                  <Badge variant="outline" className="uppercase tracking-wide">
                    {entry.scope}
                  </Badge>
                  <div className="text-sm mt-1">
                    Multiplier ×{entry.multiplier.toFixed(2)}
                  </div>
                  {entry.sourceId && (
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {entry.sourceId}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          Intent KPIs automatically dampen scores when the Intent Engine runs in fallback
          mode (minimum normalized score of 50). This ensures reliable diagnostics even
          when patterns are limited.
        </div>
      </CardContent>
    </Card>
  );
}
