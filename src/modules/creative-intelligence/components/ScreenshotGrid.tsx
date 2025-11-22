/**
 * Screenshot Grid Component
 *
 * Displays a grid of app screenshots with analysis overlays.
 *
 * Phase 0: Placeholder implementation (21.11.2025)
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Screenshot } from '../types';

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  onScreenshotClick?: (screenshot: Screenshot) => void;
}

export function ScreenshotGrid({ screenshots, onScreenshotClick }: ScreenshotGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Screenshots</CardTitle>
      </CardHeader>
      <CardContent>
        {screenshots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No screenshots loaded</p>
            <p className="text-sm mt-2">Phase 0: Will display screenshot grid here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {screenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                className="border rounded-lg p-2 cursor-pointer hover:border-primary"
                onClick={() => onScreenshotClick?.(screenshot)}
              >
                <img
                  src={screenshot.url}
                  alt={`Screenshot ${screenshot.index + 1}`}
                  className="w-full h-auto rounded"
                />
                <p className="text-xs text-center mt-2 text-muted-foreground">
                  Screenshot {screenshot.index + 1}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
