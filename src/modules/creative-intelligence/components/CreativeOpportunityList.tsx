/**
 * Creative Opportunity List Component
 *
 * Displays AI-generated creative optimization opportunities
 * with severity indicators and expand/collapse functionality.
 *
 * Phase 3: AI Creative Insights Layer
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, AlertTriangle, Info, Zap, ChevronDown } from 'lucide-react';
import { CreativeOpportunity } from '../services/aiCreativeInsightsService';

interface CreativeOpportunityListProps {
  opportunities: CreativeOpportunity[];
  className?: string;
}

const severityConfig = {
  minor: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    badgeVariant: 'secondary' as const,
    label: 'Minor'
  },
  moderate: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    badgeVariant: 'outline' as const,
    label: 'Moderate'
  },
  major: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    badgeVariant: 'outline' as const,
    label: 'Major'
  },
  critical: {
    icon: Zap,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    badgeVariant: 'destructive' as const,
    label: 'Critical'
  }
};

const categoryConfig = {
  messaging: { label: 'Messaging', color: 'bg-purple-500/10 text-purple-700 border-purple-300' },
  visual: { label: 'Visual', color: 'bg-pink-500/10 text-pink-700 border-pink-300' },
  layout: { label: 'Layout', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
  theme: { label: 'Theme', color: 'bg-green-500/10 text-green-700 border-green-300' },
  cta: { label: 'CTA', color: 'bg-orange-500/10 text-orange-700 border-orange-300' }
};

export function CreativeOpportunityList({
  opportunities,
  className = ''
}: CreativeOpportunityListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group opportunities by severity
  const groupedOpportunities = {
    critical: opportunities.filter(o => o.severity === 'critical'),
    major: opportunities.filter(o => o.severity === 'major'),
    moderate: opportunities.filter(o => o.severity === 'moderate'),
    minor: opportunities.filter(o => o.severity === 'minor')
  };

  const criticalCount = groupedOpportunities.critical.length;
  const majorCount = groupedOpportunities.major.length;
  const totalCount = opportunities.length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Creative Opportunities
            </CardTitle>
            <CardDescription>
              AI-identified optimization opportunities for creative assets
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {majorCount > 0 && (
              <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-600">
                {majorCount} Major
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {totalCount} Total
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(groupedOpportunities).map(([severity, items]) => {
            const config = severityConfig[severity as keyof typeof severityConfig];
            const Icon = config.icon;

            return (
              <div
                key={severity}
                className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {config.label}
                  </span>
                </div>
                <div className="text-2xl font-bold">{items.length}</div>
              </div>
            );
          })}
        </div>

        {/* Opportunities List */}
        <Accordion type="multiple" className="w-full">
          {Object.entries(groupedOpportunities).map(([severity, items]) => {
            if (items.length === 0) return null;

            const config = severityConfig[severity as keyof typeof severityConfig];
            const Icon = config.icon;

            return (
              <AccordionItem key={severity} value={severity}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <span className="font-semibold capitalize">{severity} Priority</span>
                    <Badge variant={config.badgeVariant} className="ml-auto mr-2">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {items.map((opportunity, idx) => {
                      const categoryInfo = categoryConfig[opportunity.category];

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-md border ${config.borderColor} ${config.bgColor}`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                            <div className="flex-1 space-y-2">
                              <p className="text-sm leading-relaxed">{opportunity.text}</p>
                              <Badge
                                variant="outline"
                                className={`text-xs ${categoryInfo.color}`}
                              >
                                {categoryInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Empty State */}
        {totalCount === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No opportunities identified</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
