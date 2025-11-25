import React from 'react';
import type { MergedRuleSet } from '@/engine/asoBible/rulesetEngine/rulesetMerger';
import type { RulesetDetailResponse } from '@/services/admin/adminRulesetApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimelineConnector } from '@/components/ui/timeline-connector';

interface RuleSetAncestryTimelineProps {
  mergedRuleSet?: MergedRuleSet | null;
  inheritance?: RulesetDetailResponse['inheritanceSummary'];
}

const SCOPE_COLORS: Record<string, string> = {
  base: 'bg-slate-600',
  vertical: 'bg-violet-600',
  market: 'bg-emerald-600',
  client: 'bg-amber-600',
};

export function RuleSetAncestryTimeline({
  mergedRuleSet,
  inheritance,
}: RuleSetAncestryTimelineProps) {
  const entries = inheritance?.length
    ? inheritance
    : buildFallbackEntries(mergedRuleSet);

  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inheritance Chain</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {entries.map((entry, index) => (
            <div key={`${entry.scope}-${index}`} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    SCOPE_COLORS[entry.scope] || 'bg-zinc-500'
                  }`}
                />
                {index < entries.length - 1 && <TimelineConnector />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="uppercase tracking-wide">
                    {entry.scope}
                  </Badge>
                  {entry.label && (
                    <span className="font-semibold">{entry.label}</span>
                  )}
                </div>
                {entry.id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: <span className="font-mono">{entry.id}</span>
                  </p>
                )}
                {entry.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {entry.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function buildFallbackEntries(
  mergedRuleSet?: MergedRuleSet | null
): RuleSetAncestryTimelineProps['inheritance'] {
  if (!mergedRuleSet?.inheritanceChain) {
    return undefined;
  }

  const { base, vertical, market, client } = mergedRuleSet.inheritanceChain;
  const entries: NonNullable<
    RuleSetAncestryTimelineProps['inheritance']
  > = [];

  if (base) {
    entries.push({
      scope: 'base',
      id: base.id,
      label: base.label,
      description: base.description,
    });
  }

  if (vertical) {
    entries.push({
      scope: 'vertical',
      id: vertical.id,
      label: vertical.label,
      description: vertical.description,
    });
  }

  if (market) {
    entries.push({
      scope: 'market',
      id: market.id,
      label: market.label,
      description: market.description,
    });
  }

  if (client) {
    entries.push({
      scope: 'client',
      id: client.id,
      label: client.label,
      description: client.description,
    });
  }

  return entries;
}
