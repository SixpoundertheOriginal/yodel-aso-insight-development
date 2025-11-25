import type { AuditCompetitorResult } from './competitor-audit.service';

interface ValidationOptions {
  context?: string;
}

/**
 * Validate the shape of a competitor audit before it flows through comparison logic.
 * Ensures all downstream consumers (combos, intent, KPI, diagnostics) have data.
 */
export function validateCompetitorAudit(
  audit: AuditCompetitorResult | null | undefined,
  options: ValidationOptions = {}
): AuditCompetitorResult | null {
  if (!audit || !audit.audit) {
    console.warn('[CompetitorAudit] Incomplete audit skipped (missing audit payload)', {
      competitorId: audit?.competitorId,
      context: options.context,
    });
    return null;
  }

  const missingFields: string[] = [];
  const auditPayload = audit.audit;

  if (!auditPayload.comboCoverage?.stats) {
    missingFields.push('comboCoverage.stats');
  }

  if (!auditPayload.intentCoverage) {
    missingFields.push('intentCoverage');
  } else if (!auditPayload.intentCoverage.diagnostics) {
    missingFields.push('intentCoverage.diagnostics');
  }

  const kpiFamilies = auditPayload.kpiResult?.families;
  if (!kpiFamilies || Object.keys(kpiFamilies).length === 0) {
    missingFields.push('kpiResult.families');
  }

  if (!auditPayload.ruleSetDiagnostics) {
    missingFields.push('ruleSetDiagnostics');
  }

  if (missingFields.length > 0) {
    console.warn('[CompetitorAudit] Incomplete audit skipped', {
      competitorId: audit.competitorId,
      missingFields,
      context: options.context,
    });
    return null;
  }

  return audit;
}
