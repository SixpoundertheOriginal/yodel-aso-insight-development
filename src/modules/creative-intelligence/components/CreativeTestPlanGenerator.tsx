/**
 * Creative Test Plan Generator Component
 *
 * Displays AI-generated A/B test recommendations with variants,
 * hypotheses, and success metrics.
 *
 * Phase 3: AI Creative Insights Layer
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlaskConical, Target, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { CreativeTestPlan } from '../services/aiCreativeInsightsService';

interface CreativeTestPlanGeneratorProps {
  testPlan: CreativeTestPlan;
  className?: string;
}

const confidenceLevelConfig = {
  low: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Low Confidence'
  },
  medium: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Medium Confidence'
  },
  high: {
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    label: 'High Confidence'
  }
};

export function CreativeTestPlanGenerator({
  testPlan,
  className = ''
}: CreativeTestPlanGeneratorProps) {
  const confidenceConfig = confidenceLevelConfig[testPlan.confidence_level];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              A/B Test Recommendations
            </CardTitle>
            <CardDescription>
              Data-driven test variants to optimize creative performance
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="outline"
              className={`${confidenceConfig.borderColor} ${confidenceConfig.bgColor} ${confidenceConfig.color}`}
            >
              {confidenceConfig.label}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{testPlan.duration_recommendation}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Test Variants */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Test Variants</h3>
            <Badge variant="secondary" className="text-xs">
              {testPlan.variants.length} variants
            </Badge>
          </div>

          <div className="grid gap-3">
            {testPlan.variants.map((variant, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-3">
                  {/* Variant Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{variant.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {variant.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      Variant {String.fromCharCode(65 + idx)}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Changes */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Proposed Changes:</p>
                    <ul className="space-y-1">
                      {variant.changes.map((change, changeIdx) => (
                        <li
                          key={changeIdx}
                          className="text-sm flex items-start gap-2"
                        >
                          <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                          <span className="leading-relaxed">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Expected Impact */}
                  <div className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                    <TrendingUp className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-primary">Expected Impact</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {variant.expected_impact}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Hypotheses */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Test Hypotheses</h3>
            <Badge variant="secondary" className="text-xs">
              {testPlan.hypotheses.length} hypotheses
            </Badge>
          </div>

          <ScrollArea className="h-auto max-h-32">
            <ul className="space-y-2">
              {testPlan.hypotheses.map((hypothesis, idx) => (
                <li
                  key={idx}
                  className="text-sm flex items-start gap-2 p-2 rounded bg-muted/50"
                >
                  <span className="text-primary font-semibold shrink-0">H{idx + 1}:</span>
                  <span className="leading-relaxed">{hypothesis}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        <Separator />

        {/* Success Metrics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Success Metrics</h3>
            <Badge variant="secondary" className="text-xs">
              {testPlan.metrics.length} metrics
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {testPlan.metrics.map((metric, idx) => (
              <div
                key={idx}
                className="p-3 rounded-md border border-border bg-card"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span className="text-sm leading-tight">{metric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
