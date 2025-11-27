/**
 * Metadata Engine Exports
 *
 * Central export point for metadata-related engines and utilities
 */

// KPI Engine (Phase 1)
export { KpiEngine, KPI_ENGINE_VERSION } from './kpi/kpiEngine';
export type {
  KpiEngineVersion,
  KpiId,
  KpiFamilyId,
  KpiDefinition,
  KpiFamilyDefinition,
  KpiEngineInput,
  KpiEngineResult,
  KpiResult,
  KpiFamilyResult,
  BrandSignals,
  IntentSignals,
  ComboCoverageInput,
} from './kpi/kpi.types';

// Metadata Audit Engine (Existing)
export { MetadataAuditEngine } from './metadataAuditEngine.legacy'; // LEGACY: Migrated to edge function
