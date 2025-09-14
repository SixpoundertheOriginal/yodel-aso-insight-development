
export * from './useTheme';
export * from './useMockAsoData';
export * from './useSourceFiltering';
export * from './useComparisonData';
export * from './useCopilotChat';
export * from './useBigQueryData';
export * from './useAsoDataWithFallback';
export * from './useFeaturingValidation';
export { useBenchmarkData } from './useBenchmarkData';
export { useConversationalChat } from './useConversationalChat';

// Re-export workflow context for convenience
export { useWorkflow, WorkflowProvider } from '@/context/WorkflowContext';

// Add new advanced keyword intelligence hook with correct type exports
export { useAdvancedKeywordIntelligence } from './useAdvancedKeywordIntelligence';
export type { KeywordData as AdvancedKeywordData, KeywordStats as KeywordIntelligenceStats } from './useAdvancedKeywordIntelligence';

// Add new user management hooks
export { usePermissions } from './usePermissions';
export { useUserProfile } from './useUserProfile';
export { useDemoOrgDetection } from './useDemoOrgDetection';

// Add new architecture hooks
export { useAppSelection } from './useAppSelection';
export { useEnhancedQueries } from './useEnhancedQueries';

// Add enhanced keyword analytics
export { useEnhancedKeywordAnalytics } from './useEnhancedKeywordAnalytics';

// Add unified keyword intelligence manager
export { useDataAccess } from './useDataAccess';
export { useOrganizationBranding } from './useOrganizationBranding';
export { BigQueryTestButtons } from '../components/BigQueryTestButtons';
export { DebugToolsWrapper, BigQueryTestWrapper, PerformanceTestWrapper, TechnicalMetadataWrapper } from '../components/DebugToolsWrapper';

// Add new keyword discovery service
export { keywordDiscoveryService } from '../services/keyword-discovery.service';

// Add debounced filters hook
export { useDebouncedFilters } from './useDebouncedFilters';

// Add debounced value hook  
export { useDebouncedValue } from './useDebouncedValue';

// Market data hooks
export * from '../contexts/MarketContext';

// Derived KPI framework hooks
export {
  useDerivedKPIs,
  getDerivedKPICategories,
  validateDerivedKPIDependencies
} from './useDerivedKPIs';
