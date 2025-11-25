import type { AuditCompetitorResult } from './competitor-audit.service';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import type { CombinedSearchIntentCoverage } from '@/engine/asoBible/searchIntentCoverageEngine';

export interface AuditTelemetryEntry {
  id: string;
  name: string;
  fallbackMode: boolean;
  patternCount?: number;
  patternCacheTTL?: number;
  patternCacheExpiresAt?: string;
  snapshotCreatedAt?: string;
  snapshotAgeMs?: number;
  verticalThresholdSource?: string;
  overrideAncestry?: CombinedSearchIntentCoverage['ancestry'];
  ruleSetSource?: string;
  leakWarningCount?: number;
}

/**
 * Attach snapshot timestamp metadata to an audit result so downstream consumers can calculate age/TTL.
 */
export function attachAuditSnapshotMetadata(
  auditResult: AuditCompetitorResult,
  snapshotCreatedAt?: string
): AuditCompetitorResult {
  if (snapshotCreatedAt) {
    auditResult.snapshotCreatedAt = snapshotCreatedAt;
  }

  if (!auditResult.snapshotCreatedAt) {
    return auditResult;
  }

  const snapshotAgeMs = Date.now() - new Date(auditResult.snapshotCreatedAt).getTime();
  auditResult.audit.ruleSetDiagnostics = {
    ...(auditResult.audit.ruleSetDiagnostics || {}),
    snapshotCreatedAt: auditResult.snapshotCreatedAt,
    snapshotAgeMs,
  };

  return auditResult;
}

/**
 * Build a normalized telemetry payload from audit diagnostics.
 */
export function buildAuditTelemetry(
  audit: UnifiedMetadataAuditResult,
  metadata: { id: string; name: string; snapshotCreatedAt?: string }
): AuditTelemetryEntry {
  const diagnostics = audit.intentCoverage?.diagnostics;
  const snapshotAgeMs = metadata.snapshotCreatedAt
    ? Date.now() - new Date(metadata.snapshotCreatedAt).getTime()
    : undefined;

  return {
    id: metadata.id,
    name: metadata.name,
    fallbackMode: Boolean(diagnostics?.fallbackMode),
    patternCount: diagnostics?.patternCount,
    patternCacheTTL: diagnostics?.ttlSeconds,
    patternCacheExpiresAt:
      diagnostics?.ttlSeconds !== undefined
        ? new Date(Date.now() + diagnostics.ttlSeconds * 1000).toISOString()
        : undefined,
    snapshotCreatedAt: metadata.snapshotCreatedAt,
    snapshotAgeMs,
    verticalThresholdSource: audit.ruleSetDiagnostics?.discoveryThresholdSource,
    overrideAncestry: audit.intentCoverage?.ancestry,
    ruleSetSource: audit.ruleSetDiagnostics?.ruleSetSource,
    leakWarningCount: audit.ruleSetDiagnostics?.leakWarnings?.length,
  };
}
