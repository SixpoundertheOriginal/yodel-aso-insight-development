/**
 * MonitorAppButton Component
 *
 * Button for monitoring apps for continuous ASO audit tracking.
 * States:
 * - "Monitor App" button (when not monitored)
 * - "Monitored" badge with last checked timestamp (when monitored)
 * - Loading state during save operation
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { useIsAppMonitored, useSaveMonitoredApp, normalizeMetadata } from '@/hooks/useMonitoredAppForAudit';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatDistanceToNow } from 'date-fns';
import type { ScrapedMetadata } from '@/types/aso';

// Enhanced audit data structure (subset of useEnhancedAppAudit return type)
interface EnhancedAuditData {
  overallScore: number;
  metadataScore: number;
  keywordScore: number;
  competitorScore: number;
  creativeScore: number;
  opportunityCount: number;
  metadataAnalysis?: {
    combinations?: any[];
    metrics?: any;
    insights?: any;
  };
}

export interface MonitorAppButtonProps {
  app_id: string;
  platform: 'ios' | 'android';
  app_name: string;
  locale?: string;
  bundle_id?: string | null;
  app_icon_url?: string | null;
  developer_name?: string | null;
  category?: string | null;
  primary_country?: string;
  className?: string;

  /**
   * CRITICAL: Full metadata from UI
   * This is the metadata already scraped by the UI.
   * Passing this prevents the edge function from re-fetching,
   * eliminating CORS, rate-limiting, and geo-blocking errors.
   */
  metadata?: ScrapedMetadata;

  /**
   * CRITICAL: Audit data from useEnhancedAppAudit
   * If provided, the edge function will save this high-quality audit
   * instead of generating a placeholder audit on the server.
   */
  auditData?: EnhancedAuditData | null;
}

export const MonitorAppButton: React.FC<MonitorAppButtonProps> = ({
  app_id,
  platform,
  app_name,
  locale = 'us',
  bundle_id,
  app_icon_url,
  developer_name,
  category,
  primary_country = 'us',
  className,
  metadata,
  auditData
}) => {
  const { profile } = useUserProfile();
  const organizationId = profile?.organization_id;

  // Check if app is monitored
  const { data: monitoredApp, isLoading: isCheckingMonitored } = useIsAppMonitored(
    app_id,
    platform,
    organizationId
  );

  // Mutation for saving/monitoring app
  const { mutate: saveApp, isPending: isSaving } = useSaveMonitoredApp();

  const isMonitored = Boolean(monitoredApp);
  const isLoading = isCheckingMonitored || isSaving;

  const handleMonitorApp = () => {
    if (!organizationId) {
      console.warn('[MonitorAppButton] No organization ID available');
      return;
    }

    if (isMonitored) {
      // Already monitored - no action needed
      return;
    }

    console.log('[MonitorAppButton] Monitoring app with audit data:', {
      hasMetadata: !!metadata,
      hasAuditData: !!auditData,
      auditScore: auditData?.overallScore
    });

    saveApp({
      organizationId,
      app_id,
      platform,
      app_name,
      locale,
      bundle_id,
      app_icon_url,
      developer_name,
      category,
      primary_country,
      audit_enabled: true,
      // CRITICAL: Include UI-fetched metadata to prevent server re-fetch
      metadata: metadata ? normalizeMetadata(metadata) : undefined,
      // CRITICAL: Include UI-computed audit snapshot for best quality
      auditSnapshot: auditData ? {
        audit_score: Math.round(auditData.overallScore),
        combinations: auditData.metadataAnalysis?.combinations || [],
        metrics: auditData.metadataAnalysis?.metrics || {},
        insights: auditData.metadataAnalysis?.insights || {},
        metadata_health: {
          metadataScore: auditData.metadataScore,
          keywordScore: auditData.keywordScore,
          competitorScore: auditData.competitorScore,
          creativeScore: auditData.creativeScore,
          opportunityCount: auditData.opportunityCount
        }
      } : undefined
    });
  };

  // Show loading state
  if (isCheckingMonitored) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={className}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Show "Monitored" badge if app is monitored
  if (isMonitored && monitoredApp) {
    const lastChecked = monitoredApp.latest_audit_at
      ? formatDistanceToNow(new Date(monitoredApp.latest_audit_at), { addSuffix: true })
      : 'Never';

    const auditScore = monitoredApp.latest_audit_score;

    return (
      <div className={`flex items-center space-x-2 ${className || ''}`}>
        <Badge variant="outline" className="border-emerald-400/30 text-emerald-400 flex items-center space-x-1">
          <BookmarkCheck className="h-3 w-3" />
          <span>Monitored</span>
        </Badge>
        <div className="text-xs text-zinc-400">
          {auditScore !== null && (
            <span className="mr-2">Score: <strong className="text-zinc-300">{auditScore}/100</strong></span>
          )}
          <span>Last: {lastChecked}</span>
        </div>
      </div>
    );
  }

  // Show "Monitor App" button
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMonitorApp}
      disabled={isLoading}
      className={`border-emerald-400/30 text-emerald-400 hover:bg-emerald-900/20 ${className || ''}`}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Monitoring...
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4 mr-2" />
          Monitor App
        </>
      )}
    </Button>
  );
};
