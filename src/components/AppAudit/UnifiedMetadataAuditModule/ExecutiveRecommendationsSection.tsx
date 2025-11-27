/**
 * Executive Recommendations Section - Phase 4: Executive Recommendations
 *
 * Displays 4-section executive recommendations:
 * 1. What's Wrong - Critical issues
 * 2. Opportunities - Quick wins
 * 3. Direction - Strategic guidance + action items
 * 4. Next Tests - Placeholder for v3.0
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  TrendingUp,
  Compass,
  Beaker,
  Clock,
  Target,
} from 'lucide-react';
import type { ExecutiveRecommendations } from '@/types/executiveRecommendations';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ExecutiveRecommendationsSectionProps {
  recommendations: ExecutiveRecommendations;
}

export const ExecutiveRecommendationsSection: React.FC<
  ExecutiveRecommendationsSectionProps
> = ({ recommendations }) => {
  const {
    whatsWrong,
    opportunities,
    direction,
    nextTests,
    overallPriority,
    totalActionItems,
    estimatedTimeToImplement,
    confidenceScore,
  } = recommendations;

  // Priority badge styling
  const getPriorityBadge = (priority: 'critical' | 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-purple-600" />
            📋 Executive Recommendations
          </CardTitle>
          <Badge variant="outline" className={getPriorityBadge(overallPriority)}>
            {overallPriority.toUpperCase()} PRIORITY
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {totalActionItems} action items
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {estimatedTimeToImplement}
          </div>
          <div className="flex items-center gap-1">
            Confidence: {confidenceScore}/100
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="whats-wrong" className="space-y-2">
          {/* 1. What's Wrong */}
          <AccordionItem value="whats-wrong" className="bg-white border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-semibold">🔴 WHAT'S WRONG</span>
                <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                  {whatsWrong.totalIssues} issues
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-2">
              <p className="text-sm text-muted-foreground mb-3">{whatsWrong.summary}</p>
              {whatsWrong.criticalIssues.length > 0 ? (
                <div className="space-y-2">
                  {whatsWrong.criticalIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm"
                    >
                      {issue}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  ✅ No critical issues detected
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 2. Opportunities */}
          <AccordionItem value="opportunities" className="bg-white border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-semibold">🟢 OPPORTUNITIES</span>
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  {opportunities.totalOpportunities} found
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-2">
              <p className="text-sm text-muted-foreground mb-3">{opportunities.summary}</p>

              {/* Quick Wins */}
              {opportunities.quickWins.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h4 className="font-semibold text-sm text-green-700">⚡ Quick Wins</h4>
                  {opportunities.quickWins.map((win, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm"
                    >
                      {win}
                    </div>
                  ))}
                </div>
              )}

              {/* All Opportunities */}
              {opportunities.opportunities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">All Opportunities</h4>
                  {opportunities.opportunities.map((opp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      • {opp}
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 3. Direction */}
          <AccordionItem value="direction" className="bg-white border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">🎯 DIRECTION</span>
                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                  Strategic guidance
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <p className="text-sm text-muted-foreground mb-3">{direction.summary}</p>

              {/* Strategic Guidance */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">
                  Strategic Guidance
                </h4>
                <p className="text-sm text-blue-800">{direction.strategicGuidance}</p>
              </div>

              {/* Action Items */}
              {direction.actionItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">Action Items</h4>
                  {direction.actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-gray-200 rounded-lg text-sm flex items-start gap-2"
                    >
                      <span className="font-semibold text-blue-600">{idx + 1}.</span>
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 4. Next Tests */}
          <AccordionItem value="next-tests" className="bg-white border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Beaker className="h-5 w-5 text-purple-600" />
                <span className="font-semibold">🧪 NEXT TESTS</span>
                {nextTests.placeholder && (
                  <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200">
                    Coming in v3.0
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
                <p className="text-sm text-purple-700">{nextTests.summary}</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
