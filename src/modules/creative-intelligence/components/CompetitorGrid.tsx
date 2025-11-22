/**
 * Competitor Grid Component
 *
 * Displays competitor screenshots for comparison analysis.
 *
 * Phase 0: Placeholder implementation (21.11.2025)
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompetitorScreenshot } from '../types';

interface CompetitorGridProps {
  competitors: CompetitorScreenshot[];
  onCompetitorClick?: (competitor: CompetitorScreenshot) => void;
}

export function CompetitorGrid({ competitors, onCompetitorClick }: CompetitorGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Screenshots</CardTitle>
        <CardDescription>Compare creative strategies with competitors</CardDescription>
      </CardHeader>
      <CardContent>
        {competitors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No competitors selected</p>
            <p className="text-sm mt-2">
              Phase 0: Will display competitor screenshot comparison here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {competitors.map((competitor) => (
              <div
                key={competitor.competitorAppId}
                className="border rounded-lg p-4 cursor-pointer hover:border-primary"
                onClick={() => onCompetitorClick?.(competitor)}
              >
                <h3 className="font-semibold mb-2">{competitor.competitorName}</h3>
                <p className="text-sm text-muted-foreground">
                  {competitor.screenshots.length} screenshots
                </p>
                {/* Phase 1: Will display screenshot thumbnails */}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
