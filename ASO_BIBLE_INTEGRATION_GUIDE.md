# ASO Bible Integration Guide: Combo Strength Rule

**Purpose:** How to add the 10-Tier Combo Strength Rule to your ASO Bible rules system
**Rule ID:** `ASO-COMBO-001`
**Category:** Keyword Strategy
**Impact:** Critical

---

## Integration Overview

The ASO Bible is your rule-powered system that drives all ASO recommendations. This guide shows how to integrate the 10-Tier Combo Strength Rule into the Bible so it powers:

1. ✅ Metadata audit recommendations
2. ✅ Keyword research prioritization
3. ✅ Competitive analysis insights
4. ✅ Optimization suggestions
5. ✅ A/B testing hypotheses

---

## Step 1: Add Rule Definition to ASO Bible Schema

### Database Schema Extension

**Table:** `aso_rules`

```sql
INSERT INTO aso_rules (
  rule_id,
  category,
  subcategory,
  name,
  description,
  priority,
  confidence_level,
  impact_level,
  status,
  version,
  created_at
) VALUES (
  'ASO-COMBO-001',
  'keyword_strategy',
  'combination_strength',
  'Keyword Combination Strength Hierarchy',
  'Defines the 10-tier strength hierarchy for keyword combinations based on metadata position and consecutiveness. Cross-element combinations DO rank but are weaker than same-field combinations.',
  'critical',
  0.95,  -- 95% confidence (user validated + documentation)
  'high',
  'active',
  '1.0',
  NOW()
);
```

### Rule Parameters

**Table:** `aso_rule_parameters`

```sql
-- Strength score mapping
INSERT INTO aso_rule_parameters (rule_id, param_key, param_value, param_type, description)
VALUES
  ('ASO-COMBO-001', 'strength_scores', '{"title_consecutive":100,"title_non_consecutive":85,"title_keywords_cross":70,"cross_element":70,"keywords_consecutive":50,"subtitle_consecutive":50,"keywords_subtitle_cross":35,"keywords_non_consecutive":30,"subtitle_non_consecutive":30,"three_way_cross":20,"missing":0}', 'json', 'Numerical scores for each strength tier'),

  ('ASO-COMBO-001', 'priority_weights', '{"strength":0.30,"popularity":0.25,"opportunity":0.20,"trend":0.15,"intent":0.10}', 'json', 'Priority scoring formula weights'),

  ('ASO-COMBO-001', 'field_weights', '{"title":1.0,"subtitle":0.5,"keywords":0.5,"promotional":0.3}', 'json', 'Field-specific ranking weights'),

  ('ASO-COMBO-001', 'consecutiveness_bonus', '1.0', 'float', 'Multiplier for consecutive combos (1.0 = no penalty, 0.85 = 15% penalty for non-consecutive)'),

  ('ASO-COMBO-001', 'max_combos_limit', '500', 'integer', 'Maximum combinations to display (top N by priority)');
```

### Rule Evaluation Logic

**Table:** `aso_rule_evaluators`

```sql
INSERT INTO aso_rule_evaluators (rule_id, evaluator_name, evaluator_function, evaluation_type)
VALUES
  ('ASO-COMBO-001', 'classify_combo_strength', 'classifyComboStrength', 'strength_classification'),
  ('ASO-COMBO-001', 'calculate_priority_score', 'calculateComboPriority', 'priority_scoring'),
  ('ASO-COMBO-001', 'detect_strengthening_opportunities', 'detectStrengtheningSuggestions', 'recommendation');
```

---

## Step 2: Rule Application Points

### 2.1 Metadata Audit Module

**Integration Point:** When running metadata audit

```typescript
// File: src/engine/asoBible/metadataAuditEngine.ts

import { analyzeAllCombos } from '@/engine/combos/comboGenerationEngine';
import { calculateBatchComboPriorities } from '@/engine/combos/comboPriorityScoring';

export function runMetadataAudit(app: AppMetadata): AuditResult {
  // ... existing audit logic ...

  // NEW: Apply ASO-COMBO-001 rule
  const comboAnalysis = analyzeAllCombos(
    app.title,
    app.subtitle,
    app.keywords
  );

  // Calculate priority scores
  const priorityScores = calculateBatchComboPriorities(
    comboAnalysis.allPossibleCombos,
    rankingData,
    popularityData
  );

  // Generate recommendations based on strength tiers
  const recommendations = generateStrengthBasedRecommendations(
    comboAnalysis,
    priorityScores
  );

  return {
    ...existingAuditResults,
    comboAnalysis,       // NEW: Strength classification
    priorityScores,      // NEW: Priority scores
    recommendations: [
      ...existingRecommendations,
      ...recommendations  // NEW: Strength-based recommendations
    ]
  };
}
```

### 2.2 Recommendation Engine

**File:** `src/engine/asoBible/recommendationEngine.ts`

```typescript
export function generateStrengthBasedRecommendations(
  comboAnalysis: ComboAnalysis,
  priorityScores: Map<string, ComboPriorityScore>
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Rule ASO-COMBO-001: Strengthening opportunities
  const strengtheningOppsin = comboAnalysis.allPossibleCombos
    .filter(c => c.canStrengthen && c.exists)
    .map(c => ({ combo: c, priority: priorityScores.get(c.text) }))
    .sort((a, b) => (b.priority?.totalScore || 0) - (a.priority?.totalScore || 0))
    .slice(0, 10); // Top 10 opportunities

  for (const { combo, priority } of strengtheningOpps) {
    recommendations.push({
      rule_id: 'ASO-COMBO-001',
      type: 'strengthening',
      priority: priority?.totalScore || 0,
      title: `Strengthen "${combo.text}" from ${getStrengthLabel(combo.strength)} to Strongest`,
      description: combo.strengtheningSuggestion || 'Move keywords to title for stronger ranking',
      impact: estimateImpact(combo, priority),
      effort: 'low',  // Moving keywords is easier than adding new ones
      category: 'keyword_optimization',
      actionable: true,
      action_steps: [
        {
          step: 1,
          action: `Identify "${combo.text}" current placement`,
          detail: `Currently: ${combo.source}`
        },
        {
          step: 2,
          action: combo.strengtheningSuggestion,
          detail: getDetailedSuggestion(combo)
        },
        {
          step: 3,
          action: 'Update metadata in App Store Connect',
          detail: 'Submit for review if title changed, or update keywords field immediately'
        },
        {
          step: 4,
          action: 'Monitor ranking changes',
          detail: 'Check ranking after 24-48h indexing period'
        }
      ],
      expected_outcome: {
        metric: 'ranking_position',
        estimated_change: '+8-15 positions',
        confidence: 0.75
      }
    });
  }

  // Rule ASO-COMBO-001: Weak combo consolidation
  const weakCombos = comboAnalysis.allPossibleCombos
    .filter(c =>
      c.strength === ComboStrength.THREE_WAY_CROSS ||
      c.strength === ComboStrength.KEYWORDS_SUBTITLE_CROSS
    )
    .filter(c => (priorityScores.get(c.text)?.totalScore || 0) > 60); // High priority only

  if (weakCombos.length > 5) {
    recommendations.push({
      rule_id: 'ASO-COMBO-001',
      type: 'consolidation',
      priority: 85,
      title: `Consolidate ${weakCombos.length} three-way cross combinations`,
      description: `You have ${weakCombos.length} combinations spanning title, subtitle, and keywords field. Consolidating these into title will significantly boost their ranking power.`,
      impact: 'high',
      effort: 'medium',
      category: 'metadata_restructure',
      actionable: true
    });
  }

  return recommendations;
}
```

### 2.3 Competitive Analysis

**File:** `src/engine/asoBible/competitiveAnalysisEngine.ts`

```typescript
export function compareComboStrengths(
  myApp: AppMetadata,
  competitorApps: AppMetadata[]
): CompetitiveComboAnalysis {
  // Analyze my app
  const myAnalysis = analyzeAllCombos(myApp.title, myApp.subtitle, myApp.keywords);

  // Analyze competitors
  const competitorAnalyses = competitorApps.map(app =>
    analyzeAllCombos(app.title, app.subtitle, app.keywords)
  );

  // Compare strength distributions
  const myStrengthDist = getStrengthDistribution(myAnalysis);
  const avgCompetitorDist = averageDistributions(
    competitorAnalyses.map(getStrengthDistribution)
  );

  // Identify gaps
  const gaps = identifyComboGaps(myAnalysis, competitorAnalyses);

  // Recommendations based on ASO-COMBO-001
  const recommendations = [];

  // Gap 1: Competitor has more tier 1 combos
  if (avgCompetitorDist.titleConsecutive > myStrengthDist.titleConsecutive) {
    recommendations.push({
      rule_id: 'ASO-COMBO-001',
      type: 'competitive_gap',
      title: 'Competitors have more strongest-tier combinations',
      description: `Your competitors average ${avgCompetitorDist.titleConsecutive} title-consecutive combos vs your ${myStrengthDist.titleConsecutive}. Close this gap to compete effectively.`,
      priority: 90,
      actionable: true
    });
  }

  // Gap 2: Missing high-value cross-element combos that competitors have
  const competitorCombos = new Set(
    competitorAnalyses.flatMap(a => a.allPossibleCombos.map(c => c.text))
  );
  const myCombos = new Set(myAnalysis.allPossibleCombos.map(c => c.text));

  const missingCombos = Array.from(competitorCombos).filter(c => !myCombos.has(c));

  if (missingCombos.length > 0) {
    recommendations.push({
      rule_id: 'ASO-COMBO-001',
      type: 'competitive_gap',
      title: `Missing ${missingCombos.length} combinations that competitors rank for`,
      description: 'Competitors are ranking for combinations you don\'t have. Consider adding these to your metadata.',
      priority: 75,
      combos: missingCombos.slice(0, 10)  // Top 10
    });
  }

  return {
    myStrengthDist,
    competitorAvgDist: avgCompetitorDist,
    gaps,
    recommendations,
    competitiveAdvantage: calculateAdvantageScore(myStrengthDist, avgCompetitorDist)
  };
}
```

### 2.4 A/B Testing Hypothesis Generation

**File:** `src/engine/asoBible/abTestingEngine.ts`

```typescript
export function generateTestHypotheses(
  app: AppMetadata,
  comboAnalysis: ComboAnalysis
): ABTestHypothesis[] {
  const hypotheses: ABTestHypothesis[] = [];

  // Hypothesis based on ASO-COMBO-001: Strengthening high-priority weak combos
  const strengtheningOppsin = comboAnalysis.allPossibleCombos
    .filter(c =>
      c.canStrengthen &&
      c.exists &&
      [ComboStrength.CROSS_ELEMENT, ComboStrength.TITLE_NON_CONSECUTIVE].includes(c.strength)
    )
    .slice(0, 5);  // Top 5

  for (const combo of strengtheningOpps) {
    hypotheses.push({
      rule_id: 'ASO-COMBO-001',
      hypothesis: `Moving "${combo.text}" to title will improve ranking`,
      control: {
        metadata: { ...app },
        expected_strength: combo.strength
      },
      variant: {
        metadata: {
          ...app,
          title: generateOptimizedTitle(app.title, combo)  // Move combo to title
        },
        expected_strength: ComboStrength.TITLE_CONSECUTIVE
      },
      metrics_to_track: [
        'ranking_position',
        'impressions',
        'conversion_rate',
        'download_velocity'
      ],
      expected_impact: {
        ranking_improvement: '+8-15 positions',
        impressions_lift: '+20-35%',
        confidence: 0.75
      },
      test_duration_days: 14,
      minimum_sample_size: 1000,
      statistical_significance_threshold: 0.05
    });
  }

  return hypotheses;
}
```

---

## Step 3: Dashboard & Reporting Integration

### 3.1 Strength Distribution Widget

**Component:** `StrengthDistributionCard.tsx`

```tsx
export function StrengthDistributionCard({ stats }: { stats: ComboAnalysisStats }) {
  const tiers = [
    { name: '🔥🔥🔥 Strongest', count: stats.titleConsecutive, color: 'red' },
    { name: '🔥🔥 Very Strong', count: stats.titleNonConsecutive, color: 'orange' },
    { name: '🔥⚡ Strong', count: stats.titleKeywordsCross, color: 'amber' },
    { name: '⚡ Medium', count: stats.crossElement, color: 'yellow' },
    { name: '💤 Weak', count: stats.keywordsConsecutive + stats.subtitleConsecutive, color: 'blue' },
    { name: '💤⚡ Very Weak', count: stats.keywordsSubtitleCross, color: 'indigo' },
    { name: '💤💤 Weakest', count: stats.keywordsNonConsecutive + stats.subtitleNonConsecutive, color: 'violet' },
    { name: '💤💤💤 Three-Way', count: stats.threeWayCross, color: 'purple' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking Power Distribution</CardTitle>
        <CardDescription>
          Powered by ASO Bible Rule ASO-COMBO-001
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {tiers.map(tier => (
            <div key={tier.name} className={`p-3 rounded bg-${tier.color}-50`}>
              <div className="text-2xl font-bold">{tier.count}</div>
              <div className="text-sm">{tier.name}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded">
          <div className="text-lg font-semibold">{stats.canStrengthen}</div>
          <div className="text-sm">Strengthening Opportunities</div>
          <div className="text-xs text-gray-600 mt-1">
            Combos that can be moved to title for stronger ranking
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.2 Recommendations List

**Component:** `RecommendationsPanel.tsx`

```tsx
export function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  // Filter to only show ASO-COMBO-001 recommendations
  const comboRecommendations = recommendations.filter(r => r.rule_id === 'ASO-COMBO-001');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Keyword Combination Optimization (ASO-COMBO-001)
      </h3>

      {comboRecommendations.map((rec, idx) => (
        <Card key={idx}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{rec.title}</CardTitle>
              <Badge variant={getPriorityVariant(rec.priority)}>
                Priority: {rec.priority}/100
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{rec.description}</p>

            {rec.action_steps && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Action Steps:</h4>
                <ol className="list-decimal list-inside space-y-2">
                  {rec.action_steps.map((step, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{step.action}</span>
                      {step.detail && (
                        <p className="text-xs text-gray-500 ml-5">{step.detail}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {rec.expected_outcome && (
              <div className="mt-4 p-3 bg-green-50 rounded">
                <div className="text-sm font-semibold">Expected Outcome:</div>
                <div className="text-sm">{rec.expected_outcome.estimated_change}</div>
                <div className="text-xs text-gray-600">
                  Confidence: {(rec.expected_outcome.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Step 4: Rule Versioning & Updates

### Version Control

When updating the rule (e.g., refining strength scores based on new data):

```sql
-- Create new version
INSERT INTO aso_rule_versions (
  rule_id,
  version,
  changes_summary,
  backwards_compatible,
  migration_required,
  created_at
) VALUES (
  'ASO-COMBO-001',
  '1.1',
  'Refined strength scores based on 100-app validation study. Adjusted TITLE_KEYWORDS_CROSS from 70 to 72.',
  true,
  false,
  NOW()
);

-- Update rule parameters
UPDATE aso_rule_parameters
SET param_value = '{"title_consecutive":100,"title_non_consecutive":85,"title_keywords_cross":72,...}'
WHERE rule_id = 'ASO-COMBO-001' AND param_key = 'strength_scores';
```

### Deprecation Policy

If replacing with a new rule:

```sql
UPDATE aso_rules
SET status = 'deprecated', deprecated_at = NOW(), replacement_rule_id = 'ASO-COMBO-002'
WHERE rule_id = 'ASO-COMBO-001';
```

---

## Step 5: Testing & Validation

### Rule Accuracy Testing

```typescript
// tests/asoBible/rules/ASO-COMBO-001.test.ts

describe('ASO-COMBO-001: Combo Strength Classification', () => {
  it('should correctly classify all 10 tiers', () => {
    const testCases = [
      {
        combo: 'meditation sleep',
        title: 'Meditation & Sleep Timer',
        subtitle: 'Mindfulness App',
        keywords: '',
        expected: ComboStrength.TITLE_CONSECUTIVE
      },
      {
        combo: 'meditation mindfulness',
        title: 'Meditation Timer',
        subtitle: 'Mindfulness & Wellness',
        keywords: '',
        expected: ComboStrength.CROSS_ELEMENT
      },
      // ... all 10 tiers
    ];

    testCases.forEach(tc => {
      const result = classifyComboStrength(tc.combo, tc.title, tc.subtitle, tc.keywords);
      expect(result.strength).toBe(tc.expected);
    });
  });

  it('should calculate priority scores correctly', () => {
    const combo: GeneratedCombo = {
      text: 'meditation sleep',
      strength: ComboStrength.TITLE_CONSECUTIVE,
      keywords: ['meditation', 'sleep'],
      // ...
    };

    const priority = calculateComboPriority(combo, rankingData, popularityData);

    expect(priority.totalScore).toBeGreaterThan(70);  // High priority
    expect(priority.strengthScore).toBe(100);  // Tier 1
  });
});
```

---

## Step 6: Documentation & Training

### Internal Documentation

Create rule documentation page:

**File:** `docs/aso-bible/rules/ASO-COMBO-001.md`

Link to the comprehensive documentation files:
- `ASO_BIBLE_RULES_COMBO_STRENGTH_THEORY.md` (theory)
- `RESEARCH_PAPER_KEYWORD_STRENGTH_HIERARCHY.md` (research)
- `REPLICATION_GUIDE_COMBO_STRENGTH_SYSTEM.md` (implementation)

### User-Facing Help

**In-app tooltip:**
```tsx
<Tooltip>
  <TooltipTrigger>
    <InfoIcon className="h-4 w-4" />
  </TooltipTrigger>
  <TooltipContent>
    <div className="max-w-sm">
      <h4 className="font-semibold mb-2">Combination Strength</h4>
      <p className="text-sm">
        Not all keyword combinations rank equally. This analysis classifies
        your combinations into 10 strength tiers based on their position in
        metadata (title, subtitle, keywords field) and consecutiveness.
      </p>
      <p className="text-sm mt-2">
        <strong>Key insight:</strong> Moving keywords from subtitle to title
        can boost ranking power from Medium (⚡) to Strongest (🔥🔥🔥).
      </p>
      <a href="/docs/aso-bible/combo-strength" className="text-blue-600 text-sm">
        Learn more →
      </a>
    </div>
  </TooltipContent>
</Tooltip>
```

---

## Success Metrics

Track rule performance:

```sql
-- Rule effectiveness metrics
CREATE TABLE aso_rule_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB
);

-- Example metrics for ASO-COMBO-001
INSERT INTO aso_rule_metrics (rule_id, metric_name, metric_value, context)
VALUES
  ('ASO-COMBO-001', 'recommendations_generated', 1250, '{"time_period":"30_days"}'),
  ('ASO-COMBO-001', 'recommendations_implemented', 340, '{"time_period":"30_days"}'),
  ('ASO-COMBO-001', 'avg_ranking_improvement', 12.5, '{"apps_tracked":50,"time_period":"60_days"}'),
  ('ASO-COMBO-001', 'user_satisfaction', 4.7, '{"scale":"1-5","responses":85}');
```

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1-2)
- ✅ Integrate rule into staging environment
- ✅ Test with 10 internal apps
- ✅ Validate classification accuracy
- ✅ Verify recommendation quality

### Phase 2: Beta Release (Week 3-4)
- ✅ Release to 10% of users
- ✅ Collect feedback
- ✅ Monitor metrics
- ✅ Fix bugs

### Phase 3: Full Release (Week 5)
- ✅ Release to all users
- ✅ Announce in changelog
- ✅ Provide training materials
- ✅ Monitor adoption

### Phase 4: Continuous Improvement (Ongoing)
- ✅ Collect validation data
- ✅ Refine strength scores
- ✅ Add new features (e.g., auto-optimization suggestions)
- ✅ Expand to promotional text field (Phase 4)

---

## Conclusion

The ASO-COMBO-001 rule represents a breakthrough in keyword combination analysis. By integrating it into the ASO Bible, you enable:

1. **More accurate audits** - Strength-based classification vs binary
2. **Better recommendations** - Prioritized by impact and effort
3. **Competitive insights** - Strength distribution comparisons
4. **Data-driven A/B tests** - Hypothesis generation from rule logic
5. **Continuous learning** - Rule metrics track effectiveness

This rule should be **central to all keyword-related features** in the ASO Bible system.

---

**Document Control**

**Title:** ASO Bible Integration Guide - Combo Strength Rule
**Rule ID:** ASO-COMBO-001
**Version:** 1.0
**Date:** 2025-12-01
**Status:** Production-Ready
**Owner:** ASO Bible Team
**Classification:** Internal - Integration Guide
