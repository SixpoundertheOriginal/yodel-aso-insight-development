/**
 * Creative Dashboard Component
 *
 * Main dashboard view for Creative Intelligence module.
 * Displays screenshot grids, competitor comparisons, and insights.
 *
 * Phase 0: Placeholder implementation (21.11.2025)
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CreativeDashboardProps {
  appId: string;
}

export function CreativeDashboard({ appId }: CreativeDashboardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Creative Dashboard</CardTitle>
          <CardDescription>
            Screenshot analysis and creative insights for app {appId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Creative Dashboard - Phase 0 Placeholder</p>
            <p className="text-sm mt-2">
              Will display screenshot grids, competitor comparisons, and AI insights
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
