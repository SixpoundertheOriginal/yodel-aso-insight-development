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
  monitored_app_id?: number | string;
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
    <div className="relative min-h-screen">
      {/* Tactical Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(249, 115, 22, 0.08) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      
      {/* Orange Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(249, 115, 22, 0.05) 100%)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 space-y-6">
        {/* Header Section */}
        <Card className="relative bg-black/60 backdrop-blur-lg border-zinc-700/70 overflow-hidden">
          {/* L-bracket corners */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-500/60" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-500/60" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-500/60" />
          
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-orange-400" />
              <div>
                <h2 className="text-xl font-mono font-light tracking-wide text-foreground uppercase">
                  Unified Metadata Audit V2
                </h2>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest">
                  34 KPIs across 6 families • 15+ evaluation rules • Intent Intelligence
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
    </div>
  );
};
