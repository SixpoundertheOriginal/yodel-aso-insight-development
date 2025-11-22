/**
 * Test Component for useIntentIntelligence Hook - Phase 3
 *
 * This component exists ONLY for testing the hook functionality.
 * It is NOT integrated into any UI and should NOT be imported anywhere.
 *
 * Purpose: Verify that the hook:
 * 1. Compiles without TypeScript errors
 * 2. Handles React Query integration correctly
 * 3. Returns expected data structures
 * 4. Follows stale-while-revalidate patterns
 * 5. Respects feature flag
 *
 * DO NOT USE THIS COMPONENT IN PRODUCTION
 */

import React from 'react';
import { useIntentIntelligence, useIntentAuditSignals, useIntentCoverage } from '@/hooks/useIntentIntelligence';

/**
 * Test Component 1: Full hook usage
 */
export function IntentIntelligenceHookFullTest() {
  const {
    intentions,
    clusters,
    coverage,
    auditSignals,
    statistics,
    isLoading,
    error,
    isSuccess,
    isFetching,
    isEnabled,
  } = useIntentIntelligence({
    titleKeywords: ['spotify', 'music', 'streaming'],
    subtitleKeywords: ['podcasts', 'playlists'],
    allKeywords: ['audio', 'songs'],
    platform: 'ios',
    region: 'us',
    enabled: true,
  });

  // Log data for debugging (development only)
  React.useEffect(() => {
    if (isSuccess && intentions.size > 0) {
      console.log('[Intent Intelligence Hook Test] Data loaded successfully');
      console.log('  - Keywords:', intentions.size);
      console.log('  - Clusters:', clusters.length);
      console.log('  - Dominant Intent:', statistics.dominantIntent);
      console.log('  - Intent Diversity:', statistics.intentDiversity);
      console.log('  - Audit Signals:', auditSignals?.recommendations.length || 0, 'recommendations');
      console.log('  - Coverage Score:', coverage?.overall.coverageScore || 0);
    }
  }, [isSuccess, intentions, clusters, statistics, auditSignals, coverage]);

  // This component should NOT render anything
  return null;
}

/**
 * Test Component 2: Audit signals only
 */
export function IntentAuditSignalsHookTest() {
  const { auditSignals, isLoading, error } = useIntentAuditSignals(
    ['spotify', 'music'],
    ['streaming', 'podcasts'],
    'ios',
    'us',
    true
  );

  React.useEffect(() => {
    if (auditSignals) {
      console.log('[Intent Audit Signals Hook Test] Signals loaded');
      console.log('  - Intent Diversity:', auditSignals.intentDiversity);
      console.log('  - Brand Keywords:', auditSignals.brandKeywordCount);
      console.log('  - Discovery Keywords:', auditSignals.discoveryKeywordCount);
      console.log('  - Recommendations:', auditSignals.recommendations.length);
    }
  }, [auditSignals]);

  return null;
}

/**
 * Test Component 3: Coverage only
 */
export function IntentCoverageHookTest() {
  const { coverage, isLoading, error } = useIntentCoverage(
    ['spotify'],
    ['learn spanish'],
    'ios',
    'us',
    true
  );

  React.useEffect(() => {
    if (coverage) {
      console.log('[Intent Coverage Hook Test] Coverage loaded');
      console.log('  - Title Coverage:', coverage.title.coverageScore);
      console.log('  - Subtitle Coverage:', coverage.subtitle.coverageScore);
      console.log('  - Overall Coverage:', coverage.overall.coverageScore);
      console.log('  - Dominant Intent:', coverage.overall.dominantIntent);
    }
  }, [coverage]);

  return null;
}

/**
 * Test Component 4: Empty keywords (edge case)
 */
export function IntentIntelligenceEmptyTest() {
  const { intentions, statistics, isLoading } = useIntentIntelligence({
    titleKeywords: [],
    subtitleKeywords: [],
    platform: 'ios',
    region: 'us',
    enabled: true,
  });

  React.useEffect(() => {
    if (!isLoading) {
      console.log('[Intent Intelligence Empty Test] Empty state handled');
      console.log('  - Keywords:', intentions.size, '(should be 0)');
      console.log('  - Intent Diversity:', statistics.intentDiversity, '(should be 0)');
    }
  }, [isLoading, intentions, statistics]);

  return null;
}

/**
 * Test Component 5: Feature flag disabled
 */
export function IntentIntelligenceDisabledTest() {
  const { intentions, isEnabled, isLoading } = useIntentIntelligence({
    titleKeywords: ['test'],
    platform: 'ios',
    region: 'us',
    enabled: false, // Hook explicitly disabled
  });

  React.useEffect(() => {
    if (!isLoading) {
      console.log('[Intent Intelligence Disabled Test] Disabled state handled');
      console.log('  - Feature Enabled:', isEnabled);
      console.log('  - Keywords:', intentions.size, '(should be 0 when disabled)');
    }
  }, [isLoading, intentions, isEnabled]);

  return null;
}
