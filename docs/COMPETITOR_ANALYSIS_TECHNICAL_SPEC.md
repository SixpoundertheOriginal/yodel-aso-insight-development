# Competitor Analysis - Technical Specification

**Date**: 2025-01-24
**Status**: Approved - Ready for Implementation
**Version**: 1.0

---

## 📋 Requirements Summary

Based on user decisions:
1. ✅ **Entry Point**: Audit page (after running initial audit)
2. ✅ **Comparison**: Flexible (1-10 competitors, user choice)
3. ✅ **Brain Rules**: User-configurable (choose which vertical/market rules to apply)
4. ✅ **Storage**: Robust with CASCADE DELETE (like AppTweak model)
5. ✅ **Caching**: Hybrid (cached with manual refresh)
6. ✅ **Insights**: All 7 types (combos, intent, KPIs, keywords, footprint, character, brand)
7. ✅ **Recommendations**: Both auto-generated + insights
8. ✅ **History**: Track changes over time

---

## 🗄️ Database Schema

### Table 1: `competitor_audit_snapshots`

**Purpose**: Store full competitor audit results with history tracking

```sql
CREATE TABLE IF NOT EXISTS competitor_audit_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships (CASCADE DELETE)
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES app_competitors(id) ON DELETE CASCADE,

  -- Competitor App Info
  competitor_app_store_id TEXT NOT NULL,
  competitor_app_name TEXT NOT NULL,
  competitor_country TEXT NOT NULL,

  -- Audit Configuration
  applied_vertical TEXT,              -- Which vertical rules were used
  applied_market TEXT,                -- Which market rules were used
  rule_config JSONB,                  -- Brain configuration snapshot

  -- Metadata Snapshot
  metadata JSONB NOT NULL,            -- Full ScrapedMetadata
  metadata_version_hash TEXT,         -- SHA256 hash to detect changes

  -- Audit Results (Same structure as aso_audit_snapshots)
  audit_data JSONB NOT NULL,          -- UnifiedMetadataAuditResult

  -- Scores (Extracted for quick queries)
  overall_score NUMERIC(5,2),
  title_score NUMERIC(5,2),
  subtitle_score NUMERIC(5,2),
  description_score NUMERIC(5,2),

  -- Intent Metrics (Extracted for quick queries)
  intent_coverage_informational NUMERIC(5,2),
  intent_coverage_commercial NUMERIC(5,2),
  intent_coverage_transactional NUMERIC(5,2),
  intent_coverage_navigational NUMERIC(5,2),

  -- Combo Metrics
  total_combos INTEGER,
  high_value_combos INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refreshed_at TIMESTAMPTZ,           -- Last refresh time

  -- Audit Metadata
  audit_duration_ms INTEGER,
  pattern_count_used INTEGER,         -- How many intent patterns were active

  CONSTRAINT fk_competitor_snapshot_org
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_competitor_snapshot_target
    FOREIGN KEY (target_app_id) REFERENCES monitored_apps(id) ON DELETE CASCADE,
  CONSTRAINT fk_competitor_snapshot_competitor
    FOREIGN KEY (competitor_id) REFERENCES app_competitors(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_competitor_audit_snapshots_competitor
  ON competitor_audit_snapshots(competitor_id);

CREATE INDEX idx_competitor_audit_snapshots_target
  ON competitor_audit_snapshots(target_app_id);

CREATE INDEX idx_competitor_audit_snapshots_org
  ON competitor_audit_snapshots(organization_id);

CREATE INDEX idx_competitor_audit_snapshots_created
  ON competitor_audit_snapshots(competitor_id, created_at DESC);

-- Latest snapshot per competitor (for quick lookup)
CREATE INDEX idx_competitor_audit_snapshots_latest
  ON competitor_audit_snapshots(competitor_id, created_at DESC)
  WHERE refreshed_at IS NULL OR refreshed_at = created_at;

-- RLS Policies
ALTER TABLE competitor_audit_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their org competitor audits"
ON competitor_audit_snapshots FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Users can create competitor audits"
ON competitor_audit_snapshots FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
  )
);

COMMENT ON TABLE competitor_audit_snapshots IS
  'Full audit snapshots for competitor apps. Tracks history over time. CASCADE deletes with target app.';
```

### Table 2: `competitor_comparison_cache`

**Purpose**: Cache latest comparison results for fast loading

```sql
CREATE TABLE IF NOT EXISTS competitor_comparison_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships (CASCADE DELETE)
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,

  -- Target App Latest Audit
  target_audit_id UUID REFERENCES aso_audit_snapshots(id) ON DELETE SET NULL,
  target_audit_date TIMESTAMPTZ,

  -- Competitor Audits Included
  competitor_audit_ids UUID[],        -- Array of competitor_audit_snapshots.id
  competitor_count INTEGER,

  -- Comparison Results (Pre-computed)
  comparison_data JSONB NOT NULL,     -- Full CompetitorComparisonResult

  -- Quick Stats (Extracted for sorting/filtering)
  avg_competitor_score NUMERIC(5,2),
  score_vs_avg NUMERIC(5,2),          -- Your score - avg competitor score

  intent_gap_informational NUMERIC(5,2),
  intent_gap_commercial NUMERIC(5,2),
  intent_gap_transactional NUMERIC(5,2),

  total_combo_opportunities INTEGER,
  high_value_opportunities INTEGER,

  -- Cache Control
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,             -- Cache expiration
  is_stale BOOLEAN DEFAULT FALSE,     -- Mark stale if any competitor updates

  CONSTRAINT fk_comparison_cache_org
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_comparison_cache_target
    FOREIGN KEY (target_app_id) REFERENCES monitored_apps(id) ON DELETE CASCADE
);

-- Only one active cache per target app
CREATE UNIQUE INDEX idx_competitor_comparison_cache_active
  ON competitor_comparison_cache(target_app_id)
  WHERE is_stale = FALSE;

-- RLS Policies
ALTER TABLE competitor_comparison_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their org comparison cache"
ON competitor_comparison_cache FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

COMMENT ON TABLE competitor_comparison_cache IS
  'Cached comparison results for fast loading. Invalidated when any competitor updates.';
```

### Table 3: Update `app_competitors` (Already exists, minor additions)

```sql
-- Add new columns to existing table
ALTER TABLE app_competitors
  ADD COLUMN IF NOT EXISTS last_audit_id UUID REFERENCES competitor_audit_snapshots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_audit_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS audit_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata_changed_count INTEGER DEFAULT 0;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_app_competitors_last_audit
  ON app_competitors(target_app_id, last_audit_id)
  WHERE is_active = TRUE;

COMMENT ON COLUMN app_competitors.last_audit_id IS
  'Latest competitor_audit_snapshots.id for this competitor';

COMMENT ON COLUMN app_competitors.audit_count IS
  'Total number of audits performed (history tracking)';

COMMENT ON COLUMN app_competitors.metadata_changed_count IS
  'Number of times metadata changed (detected via version hash)';
```

---

## 🏗️ Service Architecture

### Service 1: `CompetitorMetadataService`

**File**: `src/services/competitor-metadata.service.ts`

**Purpose**: Fetch competitor app metadata from App Store

```typescript
export interface FetchCompetitorMetadataInput {
  appStoreId: string;
  country: string;
  platform: 'ios' | 'android';
}

export interface FetchCompetitorMetadataResult {
  metadata: ScrapedMetadata;
  fetchedAt: Date;
  source: 'app-store-api' | 'cache';
}

class CompetitorMetadataService {
  /**
   * Fetch competitor app metadata from App Store
   */
  async fetchMetadata(
    appStoreId: string,
    country: string,
    platform: 'ios' | 'android' = 'ios'
  ): Promise<FetchCompetitorMetadataResult> {
    // 1. Try cache first (24 hour TTL)
    const cached = await this.getCachedMetadata(appStoreId, country);
    if (cached && !this.isCacheExpired(cached)) {
      return { metadata: cached, fetchedAt: new Date(), source: 'cache' };
    }

    // 2. Fetch from App Store API
    const metadata = await this.fetchFromAppStore(appStoreId, country, platform);

    // 3. Cache for 24 hours
    await this.cacheMetadata(appStoreId, country, metadata);

    return { metadata, fetchedAt: new Date(), source: 'app-store-api' };
  }

  /**
   * Fetch metadata for multiple competitors (parallel)
   */
  async fetchBulkMetadata(
    competitors: Array<{ appStoreId: string; country: string }>
  ): Promise<Array<FetchCompetitorMetadataResult | null>> {
    return Promise.all(
      competitors.map(c =>
        this.fetchMetadata(c.appStoreId, c.country).catch(() => null)
      )
    );
  }

  private async fetchFromAppStore(
    appStoreId: string,
    country: string,
    platform: 'ios' | 'android'
  ): Promise<ScrapedMetadata> {
    // Use existing scraping service or App Store API
    // Return standardized ScrapedMetadata format
  }
}
```

---

### Service 2: `CompetitorAuditService`

**File**: `src/services/competitor-audit.service.ts`

**Purpose**: Run full metadata audit on competitors using ASO Brain

```typescript
export interface AuditCompetitorInput {
  competitorId: string;        // UUID from app_competitors
  targetAppId: string;          // UUID from monitored_apps
  organizationId: string;

  // Brain configuration (user-selectable)
  ruleConfig: {
    vertical?: string;          // Which vertical rules to apply
    market?: string;            // Which market rules to apply
    useTargetAppRules?: boolean;// Copy rules from target app
  };

  forceRefresh?: boolean;       // Bypass cache
}

export interface CompetitorAuditResult {
  snapshotId: string;
  competitor: {
    id: string;
    appStoreId: string;
    name: string;
    icon: string;
  };
  audit: UnifiedMetadataAuditResult;
  metadata: ScrapedMetadata;
  config: {
    vertical: string | null;
    market: string | null;
    patternCount: number;
    ruleCount: number;
  };
  performance: {
    fetchTime: number;
    auditTime: number;
    totalTime: number;
  };
  isFromCache: boolean;
}

class CompetitorAuditService {
  /**
   * Audit a single competitor
   */
  async auditCompetitor(
    input: AuditCompetitorInput
  ): Promise<CompetitorAuditResult> {
    const startTime = Date.now();

    // 1. Check for existing snapshot if not forcing refresh
    if (!input.forceRefresh) {
      const cached = await this.getLatestSnapshot(input.competitorId);
      if (cached && !this.isSnapshotStale(cached)) {
        return this.formatCachedResult(cached);
      }
    }

    // 2. Get competitor details
    const competitor = await this.getCompetitorDetails(input.competitorId);

    // 3. Fetch competitor metadata
    const fetchStart = Date.now();
    const { metadata } = await competitorMetadataService.fetchMetadata(
      competitor.competitor_app_store_id,
      competitor.country
    );
    const fetchTime = Date.now() - fetchStart;

    // 4. Determine brain configuration
    const config = await this.resolveAuditConfig(input.ruleConfig, input.targetAppId);

    // 5. Run metadata audit (SAME engine as target app)
    const auditStart = Date.now();
    const audit = await runMetadataAudit(metadata, {
      vertical: config.vertical,
      market: config.market,
      organizationId: input.organizationId,
      isCompetitor: true,
    });
    const auditTime = Date.now() - auditStart;

    // 6. Store snapshot
    const snapshot = await this.storeCompetitorSnapshot({
      organizationId: input.organizationId,
      targetAppId: input.targetAppId,
      competitorId: input.competitorId,
      competitorAppStoreId: competitor.competitor_app_store_id,
      competitorAppName: competitor.competitor_app_name,
      competitorCountry: competitor.country,
      metadata,
      audit,
      config,
      auditDurationMs: auditTime,
    });

    // 7. Update competitor record
    await this.updateCompetitorRecord(input.competitorId, snapshot.id, audit.overallScore);

    return {
      snapshotId: snapshot.id,
      competitor: {
        id: competitor.id,
        appStoreId: competitor.competitor_app_store_id,
        name: competitor.competitor_app_name,
        icon: competitor.competitor_app_icon,
      },
      audit,
      metadata,
      config,
      performance: {
        fetchTime,
        auditTime,
        totalTime: Date.now() - startTime,
      },
      isFromCache: false,
    };
  }

  /**
   * Audit multiple competitors in parallel (max 10)
   */
  async auditCompetitorsBulk(
    targetAppId: string,
    organizationId: string,
    competitorIds: string[],
    ruleConfig: AuditCompetitorInput['ruleConfig'],
    forceRefresh = false
  ): Promise<CompetitorAuditResult[]> {
    if (competitorIds.length > 10) {
      throw new Error('Maximum 10 competitors can be audited at once');
    }

    const results = await Promise.allSettled(
      competitorIds.map(competitorId =>
        this.auditCompetitor({
          competitorId,
          targetAppId,
          organizationId,
          ruleConfig,
          forceRefresh,
        })
      )
    );

    return results
      .filter((r): r is PromiseFulfilledResult<CompetitorAuditResult> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  private async resolveAuditConfig(
    ruleConfig: AuditCompetitorInput['ruleConfig'],
    targetAppId: string
  ): Promise<{ vertical: string | null; market: string | null; patternCount: number; ruleCount: number }> {
    if (ruleConfig.useTargetAppRules) {
      // Copy vertical/market from target app
      const targetApp = await this.getTargetAppConfig(targetAppId);
      return {
        vertical: targetApp.vertical,
        market: targetApp.market,
        patternCount: await this.countActivePatterns(targetApp.vertical, targetApp.market),
        ruleCount: await this.countActiveRules(targetApp.vertical, targetApp.market),
      };
    }

    return {
      vertical: ruleConfig.vertical || null,
      market: ruleConfig.market || null,
      patternCount: await this.countActivePatterns(ruleConfig.vertical, ruleConfig.market),
      ruleCount: await this.countActiveRules(ruleConfig.vertical, ruleConfig.market),
    };
  }
}
```

---

### Service 3: `CompetitorComparisonService`

**File**: `src/services/competitor-comparison.service.ts`

**Purpose**: Compare your app vs competitors across all 7 insight dimensions

```typescript
export interface CompetitorComparisonResult {
  targetApp: {
    id: string;
    name: string;
    audit: UnifiedMetadataAuditResult;
    auditDate: Date;
  };

  competitors: Array<{
    id: string;
    name: string;
    appStoreId: string;
    audit: UnifiedMetadataAuditResult;
    auditDate: Date;
    priority: number;
  }>;

  // Insight 1: KPI Comparison
  kpiComparison: {
    overallScore: { yours: number; competitorAvg: number; gap: number; percentile: number };
    titleScore: { yours: number; competitorAvg: number; gap: number };
    subtitleScore: { yours: number; competitorAvg: number; gap: number };
    descriptionScore: { yours: number; competitorAvg: number; gap: number };
    wins: string[];    // KPIs where you beat competitors
    losses: string[];  // KPIs where competitors beat you
  };

  // Insight 2: Intent Gap Analysis
  intentGap: {
    informational: { yours: number; competitorAvg: number; gap: number; trend: 'ahead' | 'behind' | 'equal' };
    commercial: { yours: number; competitorAvg: number; gap: number; trend: 'ahead' | 'behind' | 'equal' };
    transactional: { yours: number; competitorAvg: number; gap: number; trend: 'ahead' | 'behind' | 'equal' };
    navigational: { yours: number; competitorAvg: number; gap: number; trend: 'ahead' | 'behind' | 'equal' };
    summary: string;   // AI-like insight
    recommendations: string[];
  };

  // Insight 3: Combo Gap Analysis
  comboGap: {
    yourCombos: GeneratedCombo[];
    competitorCommonCombos: Array<{
      combo: string;
      usedByCount: number;
      usedByApps: string[];
      strategicValue: number;
      inYourMetadata: boolean;
    }>;
    missingOpportunities: Array<{
      combo: string;
      strategicValue: number;
      usedBy: string[];
      recommendation: string;
      suggestedPlacement: 'title' | 'subtitle' | 'description';
    }>;
    stats: {
      yourComboCount: number;
      competitorAvgCount: number;
      sharedCombos: number;
      uniqueToYou: number;
      missingHighValue: number;
    };
  };

  // Insight 4: Keyword Opportunities
  keywordOpportunities: {
    competitorKeywords: Array<{
      keyword: string;
      frequency: number;
      percentage: number;  // % of competitors using it
      apps: string[];
      inYourMetadata: boolean;
      strategicValue: number;
    }>;
    topOpportunities: Array<{
      keyword: string;
      usedByCount: number;
      missingFromYours: boolean;
      potentialImpact: 'high' | 'medium' | 'low';
    }>;
    stats: {
      yourKeywordCount: number;
      competitorAvgKeywordCount: number;
      sharedKeywords: number;
      uniqueToYou: number;
    };
  };

  // Insight 5: Discovery Footprint Comparison
  discoveryFootprint: {
    yours: {
      learning: number;
      outcome: number;
      brand: number;
      noise: number;
    };
    competitorAvg: {
      learning: number;
      outcome: number;
      brand: number;
      noise: number;
    };
    gaps: {
      learning: number;
      outcome: number;
      brand: number;
      noise: number;
    };
    insights: string[];
  };

  // Insight 6: Character Usage Efficiency
  characterUsage: {
    title: { yours: number; competitorAvg: number; max: number; efficiency: number };
    subtitle: { yours: number; competitorAvg: number; max: number; efficiency: number };
    description: { yours: number; competitorAvg: number; max: number; efficiency: number };
    recommendations: string[];
  };

  // Insight 7: Brand Strength
  brandStrength: {
    yourBrandPresence: number;      // % of combos with brand
    competitorAvgBrandPresence: number;
    brandStrategyInsight: string;
    recommendations: string[];
  };

  // Auto-generated Recommendations
  recommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: 'intent' | 'combos' | 'keywords' | 'character-usage' | 'brand';
    title: string;
    description: string;
    actionable: boolean;
    suggestedAction?: string;
  }[];

  // Summary
  summary: {
    overallCompetitivePosition: 'leading' | 'competitive' | 'behind';
    strengthAreas: string[];
    improvementAreas: string[];
    quickWins: string[];  // Easy fixes with high impact
  };

  // Metadata
  comparedAt: Date;
  competitorCount: number;
  cacheKey: string;
}

class CompetitorComparisonService {
  /**
   * Compare target app with all active competitors
   */
  async compareWithCompetitors(
    targetAppId: string,
    organizationId: string,
    options?: {
      competitorIds?: string[];  // Specific competitors, or all if undefined
      useCache?: boolean;
      forceRefreshCompetitors?: boolean;
    }
  ): Promise<CompetitorComparisonResult> {
    // 1. Check cache
    if (options?.useCache !== false) {
      const cached = await this.getComparisonCache(targetAppId);
      if (cached && !cached.is_stale) {
        return cached.comparison_data as CompetitorComparisonResult;
      }
    }

    // 2. Get target app latest audit
    const targetAudit = await this.getLatestTargetAudit(targetAppId);

    // 3. Get competitors
    const competitors = await this.getActiveCompetitors(
      targetAppId,
      options?.competitorIds
    );

    if (competitors.length === 0) {
      throw new Error('No competitors found for this app');
    }

    // 4. Audit all competitors (or get latest snapshots)
    const competitorAudits = await this.getCompetitorAudits(
      competitors,
      targetAppId,
      organizationId,
      options?.forceRefreshCompetitors
    );

    // 5. Run all 7 comparison algorithms
    const comparison: CompetitorComparisonResult = {
      targetApp: {
        id: targetAudit.app_id,
        name: targetAudit.app_name,
        audit: targetAudit.audit_data,
        auditDate: targetAudit.created_at,
      },
      competitors: competitorAudits.map(c => ({
        id: c.competitor_id,
        name: c.competitor_app_name,
        appStoreId: c.competitor_app_store_id,
        audit: c.audit_data,
        auditDate: c.created_at,
        priority: c.priority,
      })),

      kpiComparison: this.compareKPIs(targetAudit, competitorAudits),
      intentGap: this.compareIntentCoverage(targetAudit, competitorAudits),
      comboGap: this.compareCombos(targetAudit, competitorAudits),
      keywordOpportunities: this.compareKeywords(targetAudit, competitorAudits),
      discoveryFootprint: this.compareFootprints(targetAudit, competitorAudits),
      characterUsage: this.compareCharacterUsage(targetAudit, competitorAudits),
      brandStrength: this.compareBrandStrength(targetAudit, competitorAudits),

      recommendations: this.generateRecommendations(/* all insights */),
      summary: this.generateSummary(/* all insights */),

      comparedAt: new Date(),
      competitorCount: competitorAudits.length,
      cacheKey: this.generateCacheKey(targetAppId, competitorAudits),
    };

    // 6. Cache results
    await this.cacheComparison(targetAppId, comparison, [
      targetAudit.id,
      ...competitorAudits.map(c => c.id),
    ]);

    return comparison;
  }

  // ... 7 comparison methods implementation
  private compareKPIs(...) { }
  private compareIntentCoverage(...) { }
  private compareCombos(...) { }
  private compareKeywords(...) { }
  private compareFootprints(...) { }
  private compareCharacterUsage(...) { }
  private compareBrandStrength(...) { }
}
```

---

## 🎨 UI Components

### Component 1: `CompetitorManagementPanel`

**File**: `src/components/AppAudit/CompetitorAnalysis/CompetitorManagementPanel.tsx`

**Purpose**: Add/manage competitors in audit page

```tsx
interface CompetitorManagementPanelProps {
  targetAppId: string;
  organizationId: string;
  onCompetitorsChange?: () => void;
}

export const CompetitorManagementPanel: React.FC<CompetitorManagementPanelProps> = ({
  targetAppId,
  organizationId,
  onCompetitorsChange,
}) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Competitor Analysis</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {competitors.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Competitors Added"
            description="Add up to 10 competitors to analyze and compare metadata strategies"
            action={<Button onClick={() => setIsAddDialogOpen(true)}>Add First Competitor</Button>}
          />
        ) : (
          <>
            <CompetitorList
              competitors={competitors}
              onRefresh={handleRefreshCompetitor}
              onRemove={handleRemoveCompetitor}
              onPriorityChange={handlePriorityChange}
            />

            {competitors.length < 10 && (
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                Add More Competitors ({competitors.length}/10)
              </Button>
            )}

            <Button
              size="lg"
              className="w-full mt-4"
              onClick={handleCompareAll}
              disabled={competitors.length === 0}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Compare with {competitors.length} Competitor{competitors.length !== 1 ? 's' : ''}
            </Button>
          </>
        )}
      </CardContent>

      <AddCompetitorDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        targetAppId={targetAppId}
        organizationId={organizationId}
        onAdd={handleAddCompetitor}
      />
    </Card>
  );
};
```

---

### Component 2: `CompetitorComparisonDashboard`

**File**: `src/components/AppAudit/CompetitorAnalysis/CompetitorComparisonDashboard.tsx`

**Purpose**: Main comparison view with all 7 insights

```tsx
interface CompetitorComparisonDashboardProps {
  targetAppId: string;
  organizationId: string;
}

export const CompetitorComparisonDashboard: React.FC<CompetitorComparisonDashboardProps> = ({
  targetAppId,
  organizationId,
}) => {
  const { data: comparison, isLoading } = useCompetitorComparison(targetAppId, organizationId);

  if (isLoading) return <LoadingSpinner />;
  if (!comparison) return <NoCompetitorsState />;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <ComparisonSummaryCard summary={comparison.summary} />

      {/* 7 Insight Sections */}
      <KpiComparisonSection data={comparison.kpiComparison} />
      <IntentGapAnalysis data={comparison.intentGap} />
      <ComboGapAnalysis data={comparison.comboGap} />
      <KeywordOpportunities data={comparison.keywordOpportunities} />
      <DiscoveryFootprintComparison data={comparison.discoveryFootprint} />
      <CharacterUsageComparison data={comparison.characterUsage} />
      <BrandStrengthComparison data={comparison.brandStrength} />

      {/* Recommendations */}
      <RecommendationsPanel recommendations={comparison.recommendations} />
    </div>
  );
};
```

---

## 📊 Implementation Phases

### Phase 1: Database & Core Services (Week 1)
**Tasks**:
1. Create migration for `competitor_audit_snapshots` table
2. Create migration for `competitor_comparison_cache` table
3. Update `app_competitors` table with new columns
4. Build `CompetitorMetadataService`
5. Build `CompetitorAuditService` (reuse existing audit engine)
6. Write database queries and indexes

**Deliverables**:
- ✅ Database schema applied
- ✅ Competitor metadata fetching works
- ✅ Competitor audit pipeline works
- ✅ CASCADE DELETE verified

---

### Phase 2: Comparison Engine (Week 2)
**Tasks**:
1. Build `CompetitorComparisonService`
2. Implement 7 comparison algorithms:
   - KPI comparison
   - Intent gap analysis
   - Combo gap analysis
   - Keyword opportunities
   - Discovery footprint comparison
   - Character usage comparison
   - Brand strength comparison
3. Build recommendation generator
4. Build summary generator
5. Implement caching layer

**Deliverables**:
- ✅ All 7 insights working
- ✅ Auto-generated recommendations
- ✅ Comparison caching works

---

### Phase 3: UI Components (Week 3)
**Tasks**:
1. Build `CompetitorManagementPanel`
2. Build `AddCompetitorDialog`
3. Build `CompetitorComparisonDashboard`
4. Build 7 insight visualization components
5. Build `RecommendationsPanel`
6. Integrate into audit page
7. Add loading states and error handling

**Deliverables**:
- ✅ Users can add competitors
- ✅ Users can run comparison
- ✅ All insights display properly
- ✅ Responsive design

---

### Phase 4: Polish & Admin (Week 4)
**Tasks**:
1. Add brain rule selector UI (choose vertical/market)
2. Add comparison history view (track over time)
3. Add export functionality (PDF/CSV reports)
4. Add refresh all competitors button
5. Performance optimization
6. Add analytics tracking
7. Write user documentation

**Deliverables**:
- ✅ Rule configuration UI
- ✅ History tracking working
- ✅ Export reports working
- ✅ Fully polished UX

---

## 🔧 Integration Points

### 1. Audit Page Integration

```tsx
// src/pages/aso-ai-hub.tsx or AppAuditHub.tsx

export const AsoAiHubPage = () => {
  const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState(false);

  return (
    <div className="space-y-6">
      {/* Existing audit results */}
      <UnifiedMetadataAuditModule {...} />

      {/* New: Competitor Analysis Section */}
      <CompetitorManagementPanel
        targetAppId={monitoredAppId}
        organizationId={organizationId}
        onCompetitorsChange={() => setShowCompetitorAnalysis(true)}
      />

      {showCompetitorAnalysis && (
        <CompetitorComparisonDashboard
          targetAppId={monitoredAppId}
          organizationId={organizationId}
        />
      )}
    </div>
  );
};
```

---

## 🚀 Success Metrics

1. **Performance**:
   - Competitor audit completes in <5 seconds
   - Comparison generation <2 seconds (cached)
   - Bulk audit (10 competitors) <30 seconds

2. **Accuracy**:
   - Intent classification accuracy >85%
   - Combo detection accuracy >90%
   - KPI calculation matches manual analysis

3. **User Experience**:
   - Users can add competitor in <30 seconds
   - Comparison insights are actionable
   - No confusion about brain rule selection

---

## 📝 Next Steps

1. **Create database migrations** (Phase 1)
2. **Build CompetitorMetadataService** (Phase 1)
3. **Build CompetitorAuditService** (Phase 1)
4. **Test with real competitor data** (Phase 1)
5. **Build comparison algorithms** (Phase 2)

**Status**: ✅ SPEC APPROVED - READY TO BUILD

Would you like me to start with Phase 1 (database migrations and core services)?
