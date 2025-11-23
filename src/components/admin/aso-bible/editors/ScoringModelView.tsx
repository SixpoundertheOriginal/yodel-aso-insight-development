/**
 * Scoring Model View
 *
 * Phase 14: Display the effective scoring model for a ruleset
 *
 * Shows:
 * - KPI families with their weights
 * - All KPIs grouped by family
 * - Effective weights (base + overrides)
 * - Formula references
 * - Override indicators
 */

import React, { useState } from 'react';
import { useKpiRegistry } from '@/hooks/admin/useKpiRegistry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Info, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ScoringModelViewProps {
  vertical?: string;
  market?: string;
  organizationId?: string;
}

export function ScoringModelView({
  vertical,
  market,
  organizationId,
}: ScoringModelViewProps) {
  const { data: registry, isLoading, error } = useKpiRegistry(vertical, market, organizationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading scoring model...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load scoring model. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!registry) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No scoring model data available for this ruleset.
        </AlertDescription>
      </Alert>
    );
  }

  // Group KPIs by family
  const kpisByFamily = registry.kpis.reduce((acc, kpi) => {
    const familyId = kpi.familyId || 'uncategorized';
    if (!acc[familyId]) {
      acc[familyId] = [];
    }
    acc[familyId].push(kpi);
    return acc;
  }, {} as Record<string, typeof registry.kpis>);

  // Get family metadata
  const getFamilyMeta = (familyId: string) => {
    return registry.families.find((f) => f.id === familyId);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Scoring Model Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Total KPIs</Label>
              <div className="text-2xl font-bold">{registry.totalKpis}</div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Families</Label>
              <div className="text-2xl font-bold">{registry.totalFamilies}</div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Active Overrides</Label>
              <div className="text-2xl font-bold text-orange-600">
                {registry.kpis.filter((k) => k.hasOverride).length}
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Scope</Label>
              <div className="text-sm font-medium">
                {vertical && market ? (
                  <span>
                    {vertical} / {market}
                  </span>
                ) : vertical ? (
                  <span>{vertical}</span>
                ) : market ? (
                  <span>{market}</span>
                ) : organizationId ? (
                  <span>Client: {organizationId}</span>
                ) : (
                  <span className="text-gray-400">Base Configuration</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Families */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Families & Weights</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            All KPIs grouped by family with effective weights
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(kpisByFamily).map(([familyId, kpis]) => {
              const familyMeta = getFamilyMeta(familyId);
              const familyWeight = familyMeta?.weight || 0;
              const kpisWithOverrides = kpis.filter((k) => k.hasOverride).length;

              return (
                <AccordionItem key={familyId} value={familyId}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold">
                          {familyMeta?.label || familyId}
                        </span>
                        <Badge variant="secondary">{kpis.length} KPIs</Badge>
                        {kpisWithOverrides > 0 && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-600">
                            {kpisWithOverrides} override{kpisWithOverrides !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500">Family Weight:</div>
                        <div className="font-mono font-bold text-lg">
                          {(familyWeight * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-3">
                      {/* Family Description */}
                      {familyMeta?.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {familyMeta.description}
                        </p>
                      )}

                      {/* KPI List */}
                      <div className="space-y-2">
                        {kpis.map((kpi) => (
                          <div
                            key={kpi.id}
                            className={`flex items-center justify-between p-3 border rounded-lg ${
                              kpi.hasOverride
                                ? 'bg-orange-50 dark:bg-orange-950 border-orange-200'
                                : 'bg-gray-50 dark:bg-gray-800'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{kpi.label}</span>
                                {kpi.hasOverride && (
                                  <Badge
                                    variant="outline"
                                    className="bg-orange-100 text-orange-700 text-xs"
                                  >
                                    Override: {kpi.overrideMultiplier?.toFixed(2)}x
                                  </Badge>
                                )}
                                {kpi.experimental && (
                                  <Badge variant="outline" className="text-xs">
                                    Experimental
                                  </Badge>
                                )}
                                {!kpi.enabled && (
                                  <Badge variant="outline" className="bg-red-50 text-red-600 text-xs">
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                                  {kpi.id}
                                </code>
                                {kpi.formulaRef && (
                                  <span className="ml-2">
                                    Formula: <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{kpi.formulaRef}</code>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {/* Base Weight */}
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Base</div>
                                <div className="font-mono text-sm text-gray-600">
                                  {kpi.weight.toFixed(3)}
                                </div>
                              </div>

                              {/* Effective Weight */}
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Effective</div>
                                <div
                                  className={`font-mono text-lg font-bold ${
                                    kpi.hasOverride ? 'text-orange-600' : 'text-green-600'
                                  }`}
                                >
                                  {(kpi.effectiveWeight || kpi.weight).toFixed(3)}
                                </div>
                              </div>

                              {/* Weight Bar */}
                              <div className="w-32">
                                <Progress
                                  value={(kpi.effectiveWeight || kpi.weight) * 100}
                                  className="h-2"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Summary Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Understanding Weights:</strong> Base weights come from code-based defaults.
          Overrides are multipliers (0.5x - 2.0x) applied to base weights. Effective weight =
          base weight × override multiplier. Family weights show the relative importance of each
          KPI family in the overall scoring model.
        </AlertDescription>
      </Alert>
    </div>
  );
}
