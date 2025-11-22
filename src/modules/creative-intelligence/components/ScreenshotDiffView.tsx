/**
 * Screenshot Diff View Component
 *
 * Displays visual comparison between screenshot versions.
 * Shows detected changes and highlights differences.
 *
 * Phase 0: Placeholder implementation (21.11.2025)
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ScreenshotDiff } from '../types';

interface ScreenshotDiffViewProps {
  diff: ScreenshotDiff | null;
  onClose?: () => void;
}

export function ScreenshotDiffView({ diff, onClose }: ScreenshotDiffViewProps) {
  if (!diff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Screenshot Comparison</CardTitle>
          <CardDescription>Compare screenshot versions to track creative changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No diff selected</p>
            <p className="text-sm mt-2">
              Phase 0: Will display side-by-side screenshot comparison here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screenshot Changes Detected</CardTitle>
        <CardDescription>
          {diff.changes.length} change{diff.changes.length !== 1 ? 's' : ''} detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Diff Type: {diff.diffType}</p>
            <p>Detected: {new Date(diff.detectedAt).toLocaleDateString()}</p>
          </div>

          {/* Phase 3: Will display side-by-side screenshot comparison with highlights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm font-semibold mb-2">Previous</p>
              <div className="bg-muted h-64 rounded flex items-center justify-center">
                <p className="text-muted-foreground">Previous screenshot</p>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm font-semibold mb-2">Current</p>
              <div className="bg-muted h-64 rounded flex items-center justify-center">
                <p className="text-muted-foreground">Current screenshot</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-sm">Detected Changes:</p>
            {diff.changes.map((change, index) => (
              <div key={index} className="border-l-2 border-primary pl-3 py-1">
                <p className="text-sm font-medium">{change.type}</p>
                <p className="text-sm text-muted-foreground">{change.description}</p>
                <p className="text-xs text-muted-foreground">
                  Confidence: {(change.confidence * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
