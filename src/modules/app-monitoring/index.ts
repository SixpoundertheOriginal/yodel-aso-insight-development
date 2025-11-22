/**
 * App Monitoring Module - Barrel Exports
 *
 * Centralized exports for the App Saving & Metadata Caching Layer.
 */

// Types
export type {
  MonitoredAppWithAudit,
  AppMetadataCache,
  CreateMetadataCacheInput,
  CacheLookupParams,
  CacheStatus,
  AuditSnapshot,
  CreateAuditSnapshotInput,
  AuditSnapshotQueryParams,
  AuditHistory,
  SaveMonitoredAppResponse
} from './types';

// Apps Service
export {
  getMonitoredApp,
  upsertMonitoredApp,
  updateAuditFields,
  listAuditEnabledApps,
  listMonitoredApps,
  deleteMonitoredApp,
  toggleAudit
} from './appsService';

export type {
  UpsertMonitoredAppInput,
  UpdateAuditFieldsInput
} from './appsService';

// Metadata Cache Service
export {
  getMetadataCache,
  upsertMetadataCache,
  checkCacheStatus,
  deleteMetadataCache,
  listMetadataCache,
  CACHE_TTL_MS
} from './metadataCacheService';

// Audit Snapshot Service
export {
  createAuditSnapshot,
  getLatestAuditSnapshot,
  getAuditSnapshots,
  getAuditHistory,
  getAuditSnapshotById,
  listAuditSnapshots,
  deleteAuditSnapshot
} from './auditSnapshotService';
