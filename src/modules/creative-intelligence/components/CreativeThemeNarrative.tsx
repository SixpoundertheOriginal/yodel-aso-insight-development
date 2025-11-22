/**
 * Creative Theme Narrative Component
 *
 * Displays AI-generated narrative insights about creative strategy,
 * positioning, and thematic elements.
 *
 * Phase 3: AI Creative Insights Layer
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Target, MessageSquare, Calendar, Swords } from 'lucide-react';
import { CreativeNarratives, ScreenshotThemeSummary, CreativeWeakness } from '../services/aiCreativeInsightsService';
import { Badge } from '@/components/ui/badge';

interface CreativeThemeNarrativeProps {
  narratives: CreativeNarratives;
  themeSummary: ScreenshotThemeSummary;
  weaknesses: CreativeWeakness[];
  className?: string;
}

const severityConfig = {
  low: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30'
  },
  high: {
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  }
};

export function CreativeThemeNarrative({
  narratives,
  themeSummary,
  weaknesses,
  className = ''
}: CreativeThemeNarrativeProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Creative Strategy Narrative
        </CardTitle>
        <CardDescription>
          Strategic insights and positioning analysis
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Narrative Sections */}
        <div className="space-y-4">
          {/* Vertical Positioning */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Vertical Positioning</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
              {narratives.vertical_positioning}
            </p>
          </div>

          <Separator />

          {/* Theme Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Creative Theme</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
              {narratives.theme_summary}
            </p>
          </div>

          <Separator />

          {/* Messaging Hierarchy */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Messaging Hierarchy</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
              {narratives.messaging_hierarchy}
            </p>
          </div>

          <Separator />

          {/* Seasonality */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Seasonality Considerations</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
              {narratives.seasonality}
            </p>
          </div>

          <Separator />

          {/* Competitive Angle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Competitive Differentiation</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">
              {narratives.competitive_angle}
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Screenshot Theme Summary */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Visual Analysis Summary
          </h3>

          {/* Dominant Themes */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Dominant Themes:</p>
            <div className="flex flex-wrap gap-2">
              {themeSummary.dominant_themes.map((theme, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs capitalize">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>

          {/* Analysis Points */}
          <div className="grid gap-3">
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-xs font-medium mb-1">Color Strategy</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {themeSummary.color_strategy}
              </p>
            </div>

            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-xs font-medium mb-1">Text Density</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {themeSummary.text_density_assessment}
              </p>
            </div>

            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-xs font-medium mb-1">Visual Consistency</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {themeSummary.visual_consistency}
              </p>
            </div>

            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-xs font-medium mb-1">Brand Coherence</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {themeSummary.brand_coherence}
              </p>
            </div>
          </div>
        </div>

        {/* Weaknesses Section */}
        {weaknesses.length > 0 && (
          <>
            <Separator className="my-6" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Areas for Improvement</h3>
                <Badge variant="outline" className="text-xs">
                  {weaknesses.length} identified
                </Badge>
              </div>

              <ScrollArea className="h-auto max-h-64">
                <div className="space-y-3">
                  {weaknesses.map((weakness, idx) => {
                    const config = severityConfig[weakness.severity];

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-md border ${config.borderColor} ${config.bgColor}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm">{weakness.area}</h4>
                            <Badge
                              variant="outline"
                              className={`text-xs ${config.color} ${config.borderColor} shrink-0`}
                            >
                              {weakness.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {weakness.description}
                          </p>
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs font-medium text-primary mb-1">
                              Recommendation:
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {weakness.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
