/**
 * Audit V2 View
 *
 * Dedicated view component for the new Unified Metadata Audit V2 system.
 * Renders the UnifiedMetadataAuditModule with proper context and error handling.
 *
 * This component serves as a clean integration layer between the AppAuditHub
 * tab system and the V2 audit engine.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Sparkles } from 'lucide-react';
import { UnifiedMetadataAuditModule } from './UnifiedMetadataAuditModule';
import { ScrapedMetadata } from '@/types/aso';

interface AuditV2ViewProps {
  metadata: ScrapedMetadata;
  monitored_app_id?: number;
  mode?: 'live' | 'monitored';
}

/**
 * AuditV2View Component
 *
 * Displays the Unified Metadata Audit V2 UI with comprehensive scoring:
 * - Overall metadata score (0-100)
 * - Element-by-element analysis (app_name, title, subtitle, description)
 * - Rule-by-rule evaluation with pass/fail indicators
 * - Keyword and combo coverage visualization
 * - Top recommendations prioritized by impact
 * - Benchmark comparisons with category percentiles
 *
 * Scoring is performed client-side using MetadataAuditEngine (no API calls).
 */
export const AuditV2View: React.FC<AuditV2ViewProps> = ({
  metadata,
  monitored_app_id,
  mode = 'live'
}) => {
  // Validate metadata
  if (!metadata) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-zinc-400" />
            <p className="text-sm text-zinc-400">No metadata available for audit</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Unified Metadata Audit V2
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Client-side scoring with 15+ evaluation rules across 3 metadata elements
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Audit Module */}
      <UnifiedMetadataAuditModule
        metadata={metadata}
      />
    </div>
  );
};
