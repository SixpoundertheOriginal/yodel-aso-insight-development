# 🎯 Competitive Analysis Dashboard - Enhancement Blueprint

**Document Version:** 1.0
**Date:** 2025-01-10
**Platform:** Yodel ASO Insight Platform
**Location:** Growth Accelerators → Reviews → Competitive Analysis

---

## 📊 EXECUTIVE SUMMARY

The existing competitive analysis feature provides qualitative insights (gaps, opportunities, strengths, threats) but lacks **quantitative benchmarking**, **visual comparison tools**, and **feature-level sentiment intelligence**. This blueprint proposes a comprehensive enhancement to transform it into a **data-driven competitive intelligence dashboard** with:

- **Quantitative benchmarking** (rating, review volume, velocity)
- **Feature-level sentiment heatmaps**
- **Visual comparative analytics** (charts, sparklines, progress bars)
- **AI-generated executive summaries** with delta insights
- **Persistent metric tracking** for longitudinal analysis

---

## 🔍 PART 1: ARCHITECTURAL AUDIT

### Current Implementation Analysis

#### **Component Architecture**

```
CompetitorComparisonView
├── CompetitorSelectionDialog (selects primary + competitors)
├── Executive Summary Card (static "lagging" label)
├── Benchmark Metrics Bar (3 metrics: rating, sentiment, issues)
├── CompetitiveIntelligencePanel
│   ├── Tabs: Gaps / Opportunities / Strengths / Threats
│   ├── FeatureGapCard (feature + demand + competitors)
│   ├── OpportunityCard (competitor weakness)
│   ├── StrengthCard (your advantages)
│   └── ThreatCard (competitor advantages)
└── Side-by-Side App Comparison Cards
```

#### **Data Flow**

```
useCompetitorComparison(comparisonConfig)
  ↓
Fetch reviews for primary + competitors (iTunes API)
  ↓
competitorReviewIntelligenceService.analyzeCompetitors()
  ↓
Returns: CompetitiveIntelligence
  ├── featureGaps: FeatureGap[]
  ├── opportunities: CompetitiveOpportunity[]
  ├── strengths: CompetitiveStrength[]
  ├── threats: CompetitiveThreat[]
  ├── metrics: BenchmarkMetrics
  └── summary: { overallPosition, keyInsight, topPriority }
```

#### **Current Data Model**

**Database Tables:**
- `app_competitors` - stores competitor links and cached metadata
  - `target_app_id` (UUID) - references monitored_apps
  - `competitor_app_store_id` (TEXT) - App Store ID
  - `competitor_app_name`, `competitor_app_icon`, `competitor_rating`, `competitor_review_count`
  - `country`, `priority`, `is_active`
  - `last_compared_at`, `comparison_summary` (JSONB) - cached results

**TypeScript Interfaces:**
- `BenchmarkMetrics` - avgRating, positiveSentiment, issueFrequency, responseQuality
- `FeatureGap` - feature, mentionedInCompetitors, competitorSentiment, frequency, userDemand
- `CompetitiveOpportunity` - type, description, competitor, frequency, sentiment, exploitability
- `CompetitiveStrength` - aspect, yourSentiment, competitorAvgSentiment, difference
- `CompetitiveThreat` - feature, competitor, sentiment, momentum, userDemand

#### **Existing Strengths** ✅

1. **Solid foundation**: Review intelligence engine already extracts features, themes, sentiment
2. **Clean architecture**: Service layer separated from UI components
3. **Real-time analysis**: Fetches fresh reviews and analyzes on-demand
4. **Caching mechanism**: `comparison_summary` JSONB field stores results
5. **Multi-dimensional insights**: Gaps, Opportunities, Strengths, Threats framework

#### **Current Gaps** ❌

| Gap | Impact | User Pain Point |
|-----|--------|----------------|
| **No aggregate review metrics** | Can't see "500 reviews vs 5,000 reviews" | No context for data significance |
| **No review velocity tracking** | Can't identify trending competitors | Miss momentum shifts |
| **Static executive summary** | Generic "lagging" label | No actionable delta insights |
| **No feature-level sentiment visualization** | Features listed, but sentiment hidden in numbers | Hard to spot opportunities |
| **No longitudinal tracking** | One-time snapshot only | Can't track improvement over time |
| **No visual comparison charts** | Text-heavy tables | Requires mental math to compare |
| **No demand scoring** | "High/Medium/Low" is subjective | Unclear prioritization |
| **No export/reporting** | Data locked in UI | Can't share with stakeholders |

---

## 🎨 PART 2: ENHANCED DATA MODEL

### New Tables

#### **Table: `competitor_metrics_snapshots`**
Stores periodic snapshots of competitor metrics for longitudinal analysis.

```sql
CREATE TABLE public.competitor_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  competitor_app_store_id TEXT NOT NULL,

  -- Snapshot metadata
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  country TEXT NOT NULL,

  -- Core metrics
  rating DECIMAL(3,2),
  review_count INTEGER,
  review_velocity_7d INTEGER,  -- Reviews added in last 7 days
  review_velocity_30d INTEGER, -- Reviews added in last 30 days

  -- Sentiment metrics
  sentiment_positive_pct DECIMAL(5,2),
  sentiment_neutral_pct DECIMAL(5,2),
  sentiment_negative_pct DECIMAL(5,2),
  avg_sentiment_score DECIMAL(3,2), -- -1 to 1

  -- Issue metrics
  issue_frequency_per_100 DECIMAL(5,2),
  top_issues JSONB, -- Array of {issue, frequency, severity}

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicates: same competitor + date + country
  UNIQUE(organization_id, target_app_id, competitor_app_store_id, snapshot_date, country)
);

CREATE INDEX idx_competitor_snapshots_lookup
  ON competitor_metrics_snapshots(target_app_id, competitor_app_store_id, country);

CREATE INDEX idx_competitor_snapshots_date
  ON competitor_metrics_snapshots(snapshot_date DESC);
```

#### **Table: `feature_sentiment_analysis`**
Stores feature-level sentiment breakdowns for heatmap visualization.

```sql
CREATE TABLE public.feature_sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comparison_id UUID, -- Optional: link to a specific comparison run

  -- App identification
  app_store_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  country TEXT NOT NULL,

  -- Feature identification
  feature_name TEXT NOT NULL,
  feature_category TEXT, -- "UX", "Performance", "Functionality", "Support"

  -- Sentiment breakdown
  mention_count INTEGER NOT NULL,
  sentiment_score DECIMAL(3,2), -- -1 to 1
  positive_mentions INTEGER,
  neutral_mentions INTEGER,
  negative_mentions INTEGER,

  -- Demand scoring
  demand_score DECIMAL(5,2), -- 0-100 calculated score
  demand_level TEXT CHECK (demand_level IN ('high', 'medium', 'low')),

  -- Competitive context
  is_gap BOOLEAN DEFAULT FALSE, -- True if primary app lacks this feature
  competitors_with_feature TEXT[], -- Array of competitor names
  avg_competitor_sentiment DECIMAL(3,2),

  -- Tracking
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, app_store_id, feature_name, country, analyzed_at::date)
);

CREATE INDEX idx_feature_sentiment_lookup
  ON feature_sentiment_analysis(app_store_id, country, analyzed_at DESC);

CREATE INDEX idx_feature_sentiment_gaps
  ON feature_sentiment_analysis(is_gap, demand_score DESC)
  WHERE is_gap = TRUE;
```

### Enhanced Views

#### **View: `vw_competitor_benchmark_matrix`**
Aggregates latest metrics for all competitors in a comparison set.

```sql
CREATE OR REPLACE VIEW vw_competitor_benchmark_matrix AS
SELECT
  cms.organization_id,
  cms.target_app_id,
  ma.app_name AS target_app_name,
  cms.competitor_app_store_id,
  ac.competitor_app_name,
  cms.country,
  cms.rating,
  cms.review_count,
  cms.review_velocity_7d,
  cms.review_velocity_30d,
  cms.sentiment_positive_pct,
  cms.avg_sentiment_score,
  cms.issue_frequency_per_100,

  -- Calculate percentile ranks
  PERCENT_RANK() OVER (
    PARTITION BY cms.target_app_id, cms.country
    ORDER BY cms.rating
  ) AS rating_percentile,

  PERCENT_RANK() OVER (
    PARTITION BY cms.target_app_id, cms.country
    ORDER BY cms.sentiment_positive_pct
  ) AS sentiment_percentile,

  PERCENT_RANK() OVER (
    PARTITION BY cms.target_app_id, cms.country
    ORDER BY cms.review_velocity_30d
  ) AS velocity_percentile,

  cms.snapshot_date
FROM competitor_metrics_snapshots cms
JOIN app_competitors ac
  ON cms.competitor_app_store_id = ac.competitor_app_store_id
  AND cms.target_app_id = ac.target_app_id
JOIN monitored_apps ma
  ON cms.target_app_id = ma.id
WHERE cms.snapshot_date = (
  SELECT MAX(snapshot_date)
  FROM competitor_metrics_snapshots
  WHERE target_app_id = cms.target_app_id
    AND competitor_app_store_id = cms.competitor_app_store_id
    AND country = cms.country
);
```

#### **View: `vw_feature_gap_opportunities`**
Ranks feature gaps by opportunity score.

```sql
CREATE OR REPLACE VIEW vw_feature_gap_opportunities AS
SELECT
  fsa.organization_id,
  fsa.feature_name,
  fsa.feature_category,
  fsa.mention_count,
  fsa.sentiment_score,
  fsa.demand_score,
  fsa.demand_level,
  ARRAY_LENGTH(fsa.competitors_with_feature, 1) AS competitor_count,
  fsa.avg_competitor_sentiment,

  -- Calculate opportunity score (higher = better opportunity)
  (
    (fsa.demand_score / 100.0) * 0.4 +                    -- 40% weight on demand
    (fsa.avg_competitor_sentiment + 1) / 2 * 0.3 +        -- 30% weight on positive sentiment
    (ARRAY_LENGTH(fsa.competitors_with_feature, 1) / 5.0) * 0.3  -- 30% weight on competitor adoption
  ) * 100 AS opportunity_score,

  fsa.country,
  fsa.analyzed_at
FROM feature_sentiment_analysis fsa
WHERE fsa.is_gap = TRUE
ORDER BY opportunity_score DESC;
```

### Edge Functions

#### **Function: `generate_competitive_summary`**
Auto-generates AI-powered executive summary with delta insights.

```sql
CREATE OR REPLACE FUNCTION generate_competitive_summary(
  p_target_app_id UUID,
  p_country TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
  v_primary_rating DECIMAL;
  v_avg_competitor_rating DECIMAL;
  v_rating_delta DECIMAL;
  v_primary_sentiment DECIMAL;
  v_avg_competitor_sentiment DECIMAL;
  v_sentiment_delta DECIMAL;
  v_top_gap TEXT;
  v_top_opportunity TEXT;
BEGIN
  -- Get primary app metrics
  SELECT rating, sentiment_positive_pct INTO v_primary_rating, v_primary_sentiment
  FROM competitor_metrics_snapshots
  WHERE target_app_id = p_target_app_id
    AND country = p_country
    AND snapshot_date = CURRENT_DATE;

  -- Get competitor averages
  SELECT AVG(rating), AVG(sentiment_positive_pct)
  INTO v_avg_competitor_rating, v_avg_competitor_sentiment
  FROM competitor_metrics_snapshots cms
  JOIN app_competitors ac ON cms.competitor_app_store_id = ac.competitor_app_store_id
  WHERE ac.target_app_id = p_target_app_id
    AND cms.country = p_country
    AND cms.snapshot_date = CURRENT_DATE;

  -- Calculate deltas
  v_rating_delta := ((v_primary_rating - v_avg_competitor_rating) / v_avg_competitor_rating) * 100;
  v_sentiment_delta := v_primary_sentiment - v_avg_competitor_sentiment;

  -- Get top gap
  SELECT feature_name INTO v_top_gap
  FROM vw_feature_gap_opportunities
  WHERE country = p_country
  ORDER BY opportunity_score DESC
  LIMIT 1;

  -- Build summary JSON
  v_summary := jsonb_build_object(
    'rating_delta_pct', ROUND(v_rating_delta, 1),
    'sentiment_delta_pct', ROUND(v_sentiment_delta, 1),
    'top_feature_gap', v_top_gap,
    'position', CASE
      WHEN v_rating_delta > 10 AND v_sentiment_delta > 10 THEN 'leading'
      WHEN v_rating_delta < -10 OR v_sentiment_delta < -10 THEN 'lagging'
      ELSE 'competitive'
    END,
    'summary_text', FORMAT(
      'Your app averages %s★ vs %s★ competitors (%s%% delta). Sentiment gap: %s%%. Top missing feature: %s.',
      ROUND(v_primary_rating, 1),
      ROUND(v_avg_competitor_rating, 1),
      ROUND(v_rating_delta, 1),
      ROUND(v_sentiment_delta, 1),
      v_top_gap
    ),
    'generated_at', NOW()
  );

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎨 PART 3: UI/UX ENHANCEMENT PLAN

### Page Structure (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 COMPETITIVE ANALYSIS HEADER                              │
│ [Back to Reviews] Locate A Locum vs 3 Competitors (GB)      │
│ [Change Apps] [Export Report] [Schedule Weekly]             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📊 AI EXECUTIVE SUMMARY (Enhanced)                          │
│ Overall Position: ⚠️ LAGGING                                │
│ Rating Gap: -47% | Sentiment Gap: -23% | Top Gap: Dark Mode│
│                                                             │
│ 💡 AI Insight: "Locate A Locum averages 2.5★ vs 4.7★       │
│ competitors (–47% delta). Most critical gap: notification   │
│ UX (mentioned by 3/3 competitors with 85% positive         │
│ sentiment). Opportunity: Competitors struggle with ads."    │
│                                                             │
│ 🎯 Top Priority: Add dark mode support (High demand,       │
│ 89% competitor sentiment, mentioned in 156 reviews)         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📈 BENCHMARK OVERVIEW TABLE (New)                           │
│                                                             │
│  Metric          │ Your App │ Comp Avg │ Top Comp │ Δ      │
│ ─────────────────┼──────────┼──────────┼──────────┼────────│
│  ⭐ Avg Rating   │ 2.5 ▁▁░  │ 4.7 ▅▅▅  │ 4.9      │ -47%  │
│  📝 Total Reviews│ 500 ▁░░  │ 4,200 ▅▅ │ 8,000    │ -88%  │
│  📊 Weekly Vel.  │ 12 ▂▂░░  │ 45 ▅▅▅░  │ 89       │ -73%  │
│  😊 Sentiment    │ 45% ▂░░  │ 68% ▅▅▅  │ 78%      │ -23%  │
│  ⚠️ Issue Rate   │ 34% ▅▅▅  │ 18% ▂▂░  │ 12%      │ +89%  │
│                                                             │
│  [View Trend Charts →]                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🔥 FEATURE SENTIMENT HEATMAP (New)                          │
│                                                             │
│  Feature       │ Your App │ PicThis │ Planta │ Plant P. │  │
│ ───────────────┼──────────┼─────────┼────────┼──────────┤  │
│  🌙 Dark Mode  │ ⚫ N/A    │ 🟢 +85% │ 🟢 +92%│ 🟢 +78%  │  │
│  🔔 Notificat. │ 🔴 -45%  │ 🟢 +72% │ 🟡 +12%│ 🟢 +65%  │  │
│  📸 Camera     │ 🟢 +68%  │ 🟢 +89% │ 🟢 +82%│ 🟡 +35%  │  │
│  💳 Pricing    │ 🔴 -52%  │ 🔴 -38% │ 🟡 -15%│ 🔴 -42%  │  │
│  🎨 UI/UX      │ 🟡 +12%  │ 🟢 +78% │ 🟢 +85%│ 🟢 +72%  │  │
│                                                             │
│  Legend: 🟢 Positive (>50%) 🟡 Neutral (0-50%) 🔴 Negative │
│  ⚫ N/A = Not mentioned / Missing feature                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📊 REVIEW VOLUME & VELOCITY (New)                           │
│                                                             │
│  Total Reviews Bar Chart:                                   │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Your App     ▁▁ 500                              │       │
│  │ PicThis      ▅▅▅▅▅ 8,000                        │       │
│  │ Planta       ▅▅▅▅ 5,200                         │       │
│  │ Plant Parent ▅▅▅ 3,500                          │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Weekly Velocity Line Chart (Last 12 Weeks):               │
│  ┌─────────────────────────────────────────────────┐       │
│  │                             ╱──PicThis           │       │
│  │                        ╱───╯                     │       │
│  │                   ╱───╯     Planta──            │       │
│  │              ╱───╯     ╱────╯                    │       │
│  │  Your App ──────────                            │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🎯 COMPETITIVE INTELLIGENCE TABS (Enhanced)                 │
│                                                             │
│  [Gaps (5)] [Opportunities (8)] [Strengths (2)] [Threats]  │
│                                                             │
│  ─── GAPS TAB (Enhanced) ───                               │
│  #1 🌙 Dark Mode - HIGH DEMAND (156 mentions)              │
│      ├─ Mentioned in: PicThis, Planta, Plant Parent        │
│      ├─ Avg Sentiment: +85% │ Opportunity Score: 92/100   │
│      ├─ Demand Score: 89/100 (High)                        │
│      └─ 💡 Recommendation: "Critical UX feature. 3/3       │
│          competitors offer this with 85%+ positive          │
│          sentiment. Users expect dark mode for plant apps." │
│                                                             │
│  #2 🔔 Smart Notifications - MEDIUM DEMAND (89 mentions)   │
│      └─ ...                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏆 SIDE-BY-SIDE APP CARDS (Enhanced)                        │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ 👑 Primary │  │ Competitor │  │ Competitor │           │
│  │ Locate A   │  │ PicThis    │  │ Planta     │           │
│  │ Locum      │  │            │  │            │           │
│  │ ⭐ 2.5     │  │ ⭐ 4.9     │  │ ⭐ 4.7     │           │
│  │ 500 rev    │  │ 8K rev     │  │ 5.2K rev   │           │
│  │ 😊 45%     │  │ 😊 78%     │  │ 😊 72%     │           │
│  │ 📈 12/wk   │  │ 📈 89/wk   │  │ 📈 45/wk   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Enhanced Executive Summary**
**Component:** `AIExecutiveSummaryCard`

**Props:**
```typescript
interface AIExecutiveSummaryProps {
  summary: {
    position: 'leading' | 'competitive' | 'lagging';
    ratingDelta: number; // -47
    sentimentDelta: number; // -23
    topFeatureGap: string; // "Dark Mode"
    aiInsight: string; // Generated text
    topPriority: string; // Action item
    confidenceScore: number; // 0.85
  };
}
```

**Features:**
- Dynamic position badge with color coding
- Delta percentages with trend arrows
- AI-generated insight paragraph (not static)
- Top priority with demand metrics
- Confidence score indicator

#### 2. **Benchmark Overview Table**
**Component:** `BenchmarkOverviewTable`

**Props:**
```typescript
interface BenchmarkMetric {
  label: string;
  icon: LucideIcon;
  yourValue: number;
  competitorAvg: number;
  topCompetitor: number;
  delta: number;
  unit: 'rating' | 'count' | 'percent';
  direction: 'higher_better' | 'lower_better';
}
```

**Features:**
- Sparkline bars for visual comparison
- Color-coded deltas (red = bad, green = good)
- Sortable columns
- Expandable row for trend chart modal

#### 3. **Feature Sentiment Heatmap**
**Component:** `FeatureSentimentHeatmap`

**Props:**
```typescript
interface HeatmapData {
  features: string[]; // Rows
  apps: string[]; // Columns
  matrix: number[][]; // -1 to 1 sentiment scores
  gaps: boolean[][]; // True if feature missing
}
```

**Features:**
- Color gradient: Red (-1) → Yellow (0) → Green (+1)
- Black cells for missing features (N/A)
- Click cell to see supporting reviews
- Export heatmap as PNG

#### 4. **Review Volume & Velocity Charts**
**Component:** `ReviewVolumeVelocityCharts`

**Data:**
```typescript
interface VolumeVelocityData {
  apps: { name: string; totalReviews: number; weeklyVelocity: number }[];
  velocityHistory: {
    week: string;
    appVelocities: Record<string, number>; // { "PicThis": 89, ... }
  }[];
}
```

**Charts:**
- Horizontal bar chart for total reviews
- Line chart for velocity trend (last 12 weeks)
- Recharts library

#### 5. **Enhanced Intelligence Tabs**
**Updates to existing `CompetitiveIntelligencePanel`:**

**Gap Cards - Add:**
- Demand score (0-100)
- Opportunity score (0-100)
- Visual progress bars for scores
- "Add to Roadmap" action button

**Opportunity Cards - Add:**
- Competitor logo/icon
- Affected review count
- Exploitability score visual

### Design Tokens

**Colors:**
```css
/* Sentiment Colors */
--sentiment-positive: #10b981; /* green-500 */
--sentiment-neutral: #fbbf24;  /* yellow-400 */
--sentiment-negative: #ef4444; /* red-500 */
--sentiment-na: #1f2937;       /* gray-800 */

/* Position Badges */
--position-leading: #10b981;
--position-competitive: #f59e0b;
--position-lagging: #ef4444;

/* Heatmap Gradient */
--heatmap-negative: #dc2626;
--heatmap-neutral: #fbbf24;
--heatmap-positive: #059669;
```

---

## 🚀 PART 4: IMPLEMENTATION ROADMAP

### Phase 1: Foundation & Data Layer (Week 1-2)

**Goal:** Set up data persistence and tracking infrastructure

**Tasks:**
1. ✅ Create `competitor_metrics_snapshots` table
2. ✅ Create `feature_sentiment_analysis` table
3. ✅ Create `vw_competitor_benchmark_matrix` view
4. ✅ Create `vw_feature_gap_opportunities` view
5. ✅ Implement `generate_competitive_summary` function
6. ✅ Add daily snapshot cron job (Supabase Edge Function)
7. ✅ Migrate existing `comparison_summary` data to new tables

**Migration Script:**
```sql
-- Insert initial snapshots from existing comparison_summary
INSERT INTO competitor_metrics_snapshots (
  organization_id, target_app_id, competitor_app_store_id,
  snapshot_date, country, rating, review_count, sentiment_positive_pct
)
SELECT
  ac.organization_id,
  ac.target_app_id,
  ac.competitor_app_store_id,
  CURRENT_DATE,
  ac.country,
  (ac.comparison_summary->>'avgRating')::DECIMAL,
  (ac.comparison_summary->>'reviewCount')::INTEGER,
  (ac.comparison_summary->>'positiveSentiment')::DECIMAL
FROM app_competitors ac
WHERE ac.comparison_summary IS NOT NULL
ON CONFLICT DO NOTHING;
```

**Deliverables:**
- ✅ Database schema deployed
- ✅ Snapshot cron running
- ✅ Sample data populated

---

### Phase 2: Enhanced Analytics Service (Week 3)

**Goal:** Extend `competitor-review-intelligence.service.ts` with new metrics

**New Service Methods:**
```typescript
class CompetitorReviewIntelligenceService {
  // Existing methods...

  // NEW: Calculate review velocity
  async calculateReviewVelocity(
    appId: string,
    country: string,
    days: number
  ): Promise<number>;

  // NEW: Generate feature sentiment matrix
  async generateFeatureSentimentMatrix(
    primaryApp: CompetitorApp,
    competitors: CompetitorApp[]
  ): Promise<FeatureSentimentMatrix>;

  // NEW: Calculate opportunity scores
  calculateOpportunityScore(
    demandScore: number,
    competitorSentiment: number,
    competitorCount: number
  ): number;

  // NEW: Persist metrics snapshot
  async saveMetricsSnapshot(
    targetAppId: string,
    competitors: CompetitorApp[],
    metrics: BenchmarkMetrics
  ): Promise<void>;
}
```

**TypeScript Types:**
```typescript
export interface FeatureSentimentMatrix {
  features: string[];
  apps: string[];
  matrix: {
    appId: string;
    appName: string;
    features: {
      name: string;
      sentiment: number; // -1 to 1
      mentions: number;
      isMissing: boolean;
    }[];
  }[];
}

export interface ReviewVelocityData {
  appId: string;
  appName: string;
  velocity7d: number;
  velocity30d: number;
  trend: 'rising' | 'stable' | 'declining';
}
```

**Deliverables:**
- ✅ Service methods implemented
- ✅ Unit tests written
- ✅ Integration with existing flow

---

### Phase 3: UI Components (Week 4-5)

**Goal:** Build and integrate new UI components

**Components to Build:**

1. **`AIExecutiveSummaryCard`** (1 day)
   - Fetch summary from `generate_competitive_summary` function
   - Dynamic badge rendering
   - Delta visualizations

2. **`BenchmarkOverviewTable`** (1 day)
   - Tabular data from `vw_competitor_benchmark_matrix`
   - Sparkline mini-charts (react-sparklines)
   - Sorting and filtering

3. **`FeatureSentimentHeatmap`** (2 days)
   - Matrix grid component
   - Color gradient calculations
   - Tooltip on hover with review excerpts
   - Export to PNG functionality

4. **`ReviewVolumeVelocityCharts`** (1 day)
   - Recharts bar chart for volumes
   - Recharts line chart for velocity
   - Time range selector (7d, 30d, 90d)

5. **Enhanced `FeatureGapCard`** (1 day)
   - Add demand score progress bar
   - Add opportunity score badge
   - "Add to Roadmap" button (future feature)

**Component Library:**
- Recharts for charts
- react-sparklines for mini charts
- html-to-image for PNG export
- Existing shadcn/ui components

**Deliverables:**
- ✅ All components built
- ✅ Storybook stories added
- ✅ Responsive design tested

---

### Phase 4: Integration & Polish (Week 6)

**Goal:** Integrate components into `CompetitorComparisonView`

**Layout Updates:**
```tsx
<CompetitorComparisonView>
  <Header />

  <AIExecutiveSummaryCard summary={intelligence.summary} />

  <BenchmarkOverviewTable
    metrics={intelligence.metrics}
    competitors={intelligence.competitors}
  />

  <FeatureSentimentHeatmap
    matrix={featureSentimentMatrix}
    primaryApp={intelligence.primaryApp}
    competitors={intelligence.competitors}
  />

  <ReviewVolumeVelocityCharts
    apps={[intelligence.primaryApp, ...intelligence.competitors]}
    velocityHistory={velocityHistory}
  />

  <CompetitiveIntelligencePanel intelligence={intelligence} />

  <SideBySideComparison apps={allApps} />
</CompetitorComparisonView>
```

**Polish Tasks:**
- Loading states for all async data
- Error boundaries
- Empty states ("No data yet")
- Skeleton loaders
- Animation transitions

**Deliverables:**
- ✅ Fully integrated page
- ✅ QA testing complete
- ✅ Performance optimized

---

### Phase 5: Advanced Features (Week 7-8)

**Optional enhancements for future:**

1. **Export to PDF** (1 day)
   - Generate PDF report with all charts
   - Email scheduling

2. **Historical Trend View** (2 days)
   - Show metric evolution over time
   - "30 days ago vs today" comparison

3. **AI Recommendations Engine** (2 days)
   - Prioritized action items
   - ROI estimates for each feature gap

4. **Slack/Email Alerts** (1 day)
   - "Competitor X just added Feature Y"
   - Weekly summary digest

---

## 📊 PART 5: DATA FLOW ARCHITECTURE

### Current Flow
```
User clicks "Competitors" tab
  ↓
CompetitorSelectionDialog (select apps)
  ↓
useCompetitorComparison hook
  ↓
Fetch reviews from iTunes API (real-time)
  ↓
competitorReviewIntelligenceService.analyzeCompetitors()
  ↓
Return CompetitiveIntelligence object
  ↓
Render UI components
```

### Enhanced Flow
```
User clicks "Competitors" tab
  ↓
CompetitorSelectionDialog (select apps)
  ↓
useCompetitorComparison hook
  ↓
  ├─ Check cache: latest snapshot < 24h?
  │    ├─ YES → Load from competitor_metrics_snapshots
  │    └─ NO  → Fetch fresh data ↓
  ↓
Fetch reviews from iTunes API
  ↓
competitorReviewIntelligenceService.analyzeCompetitors()
  ├─ Calculate metrics
  ├─ Generate feature sentiment matrix
  ├─ Calculate opportunity scores
  └─ Save snapshot to DB
  ↓
Call generate_competitive_summary() function
  ↓
Return enhanced CompetitiveIntelligence object
  ↓
Render all UI components in parallel
  ├─ AIExecutiveSummaryCard
  ├─ BenchmarkOverviewTable
  ├─ FeatureSentimentHeatmap
  ├─ ReviewVolumeVelocityCharts
  └─ CompetitiveIntelligencePanel
```

---

## 🎯 SUCCESS METRICS

### User Experience
- Time to insight: < 3 seconds (load cached data)
- Dashboard comprehension: Users understand competitive position in < 30 seconds
- Action clarity: Users can identify top 3 priorities in < 60 seconds

### Technical Performance
- API response time: < 2s for cached data, < 10s for fresh analysis
- Chart render time: < 500ms per chart
- Database query time: < 100ms for views

### Business Impact
- Feature prioritization accuracy: Track how many "gap features" get added to roadmap
- Competitive positioning improvement: Track rating and sentiment deltas over time

---

## 🛠️ TECHNICAL CONSIDERATIONS

### Performance Optimization
1. **Caching Strategy:**
   - Snapshot data cached for 24 hours
   - Feature sentiment matrix cached for 7 days
   - Stale-while-revalidate pattern

2. **Lazy Loading:**
   - Load charts only when visible (Intersection Observer)
   - Paginate feature gap list (show top 10, "Load more")

3. **Data Aggregation:**
   - Pre-compute opportunity scores in database views
   - Use materialized views for heavy aggregations

### Security
- RLS policies on new tables (organization-scoped)
- API rate limiting for iTunes requests
- Sanitize user inputs in SQL functions

### Scalability
- Index all foreign keys
- Partition `competitor_metrics_snapshots` by date
- Archive snapshots older than 1 year

---

## 📝 APPENDIX: WIREFRAME MOCKUPS

### Mockup 1: Enhanced Executive Summary
```
┌────────────────────────────────────────────────────┐
│ 🎯 Competitive Analysis Summary                    │
│                                                    │
│ Overall Position: [⚠️ LAGGING] (Confidence: 85%) │
│                                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ 📊 Key Metrics Comparison                    │ │
│ │                                              │ │
│ │ Rating:    2.5★ vs 4.7★ avg    [-47%] 🔴   │ │
│ │ Sentiment: 45% vs 68% avg      [-23%] 🔴   │ │
│ │ Reviews:   500 vs 4,200 avg    [-88%] 🔴   │ │
│ └──────────────────────────────────────────────┘ │
│                                                    │
│ 💡 AI Insight:                                    │
│ "Locate A Locum significantly trails competitors  │
│ in user satisfaction. Critical gap: notification  │
│ system ranks poorly (45% negative sentiment vs    │
│ 72% positive among competitors). Dark mode is     │
│ most-requested missing feature (156 mentions)."   │
│                                                    │
│ 🎯 Top Priority:                                  │
│ Add dark mode support                             │
│ • Demand Score: 89/100 (High)                     │
│ • Opportunity Score: 92/100                       │
│ • 3/3 competitors have it (85% positive sent.)    │
│ • Estimated impact: +0.5★ rating improvement      │
│                                                    │
│ [View Detailed Analysis ↓]                        │
└────────────────────────────────────────────────────┘
```

### Mockup 2: Feature Sentiment Heatmap
```
┌────────────────────────────────────────────────────┐
│ 🔥 Feature Sentiment Heatmap                       │
│                                                    │
│ Feature          │ Your App │ PicThis │ Planta │  │
│ ─────────────────┼──────────┼─────────┼────────┤  │
│ 🌙 Dark Mode     │ ⚫ N/A    │ 🟢 85%  │ 🟢 92% │  │
│   Mentions: 0    │          │ (42)    │ (38)   │  │
│   Demand: High   │          │         │        │  │
│ ─────────────────┼──────────┼─────────┼────────┤  │
│ 🔔 Notifications │ 🔴 -45%  │ 🟢 72%  │ 🟡 12% │  │
│   Mentions: 23   │ (23)     │ (67)    │ (19)   │  │
│   Demand: High   │          │         │        │  │
│ ─────────────────┼──────────┼─────────┼────────┤  │
│ 📸 Camera/Scan   │ 🟢 68%   │ 🟢 89%  │ 🟢 82% │  │
│   Mentions: 89   │ (89)     │ (156)   │ (92)   │  │
│   Demand: High   │          │         │        │  │
│                                                    │
│ Legend:                                            │
│ 🟢 Positive (>50%) | 🟡 Neutral (0-50%)          │
│ 🔴 Negative (<0%) | ⚫ N/A (Missing)              │
│                                                    │
│ [Export PNG] [View Full Report]                   │
└────────────────────────────────────────────────────┘
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Data Layer
- [ ] Create `competitor_metrics_snapshots` table
- [ ] Create `feature_sentiment_analysis` table
- [ ] Create `vw_competitor_benchmark_matrix` view
- [ ] Create `vw_feature_gap_opportunities` view
- [ ] Implement `generate_competitive_summary` function
- [ ] Set up daily snapshot cron job
- [ ] Run migration script for existing data

### Phase 2: Service Layer
- [ ] Add `calculateReviewVelocity` method
- [ ] Add `generateFeatureSentimentMatrix` method
- [ ] Add `calculateOpportunityScore` method
- [ ] Add `saveMetricsSnapshot` method
- [ ] Update `CompetitiveIntelligence` interface
- [ ] Write unit tests for new methods

### Phase 3: UI Components
- [ ] Build `AIExecutiveSummaryCard`
- [ ] Build `BenchmarkOverviewTable`
- [ ] Build `FeatureSentimentHeatmap`
- [ ] Build `ReviewVolumeVelocityCharts`
- [ ] Enhance `FeatureGapCard` with scores
- [ ] Add Storybook stories
- [ ] Test responsive layouts

### Phase 4: Integration
- [ ] Integrate all components into `CompetitorComparisonView`
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Optimize performance (lazy loading)
- [ ] QA testing
- [ ] User acceptance testing

### Phase 5: Polish
- [ ] Export to PDF functionality
- [ ] Historical trend views
- [ ] Alert system (Slack/Email)
- [ ] Documentation updates
- [ ] Launch 🚀

---

## 📚 REFERENCES

**Existing Files:**
- `src/components/reviews/CompetitorComparisonView.tsx`
- `src/components/reviews/CompetitiveIntelligencePanel.tsx`
- `src/services/competitor-review-intelligence.service.ts`
- `src/hooks/useCompetitorComparison.ts`
- `supabase/migrations/20251107000001_fix_app_competitors_schema.sql`

**Design System:**
- Shadcn/ui components
- Tailwind CSS (dark theme)
- Lucide icons

**Chart Libraries:**
- Recharts (for bar/line charts)
- react-sparklines (for mini charts)

---

**Document Status:** ✅ Complete
**Next Steps:** Review with design + engineering → Prioritize phases → Begin Phase 1 implementation

