# Competitor Analysis Integration - Planning Phase

**Date**: 2025-01-24
**Status**: Requirements Gathering
**Goal**: Integrate competitor metadata analysis powered by ASO Bible

---

## 🎯 Vision Summary

Allow users to:
1. Add competitors (by App Store ID) to monitored apps
2. Fetch competitor metadata from App Store
3. Run the SAME metadata audit engine on competitors
4. Compare: Your app vs Competitors using ASO Brain
5. Get insights: Intent differences, combo gaps, KPI comparisons
6. Admin manageable: Rules, patterns, KPIs editable from frontend

---

## 📋 Clarifying Questions (Please Answer)

### 1. **UI/UX Flow**

**Q1.1**: Where should users add competitors?
- [ ] Option A: In the audit page after running initial audit
- [ ] Option B: In a dedicated "Competitors" page/tab
- [ ] Option C: In the monitored app settings/dashboard
- [ ] Option D: Multiple entry points (audit page + settings)

**Q1.2**: How many competitors should users be able to add?
- Suggested: 3-5 primary competitors, unlimited total
- Should there be priority levels (Primary / Secondary)?

**Q1.3**: Should competitor analysis be real-time or snapshot-based?
- [ ] Real-time: Fetch competitor data on-demand each time
- [ ] Snapshot: Cache competitor audits, refresh manually/scheduled
- [ ] Hybrid: Show cached with "Refresh" option

---

### 2. **Comparison Scope**

**Q2.1**: What should we compare? (Check all that apply)
- [ ] **Metadata Elements**: Title, Subtitle, Description
- [ ] **Intent Coverage**: informational/commercial/transactional/navigational %
- [ ] **Combo Analysis**: Which combos they use that you don't
- [ ] **Keyword Coverage**: Which keywords they rank for
- [ ] **Discovery Footprint**: learning/outcome/brand distribution
- [ ] **KPI Scores**: Overall metadata score, title score, etc.
- [ ] **Character Usage**: How well they utilize character limits
- [ ] **Brand Strength**: Brand alias detection and usage

**Q2.2**: Should comparison be:
- [ ] 1-to-1: Your app vs ONE competitor at a time
- [ ] 1-to-many: Your app vs ALL competitors (aggregated view)
- [ ] Many-to-many: Compare all competitors against each other

---

### 3. **Insights & Recommendations**

**Q3.1**: What insights should we highlight?
- [ ] **Combo Gap Analysis**: "Competitors use 'crypto wallet' but you don't"
- [ ] **Intent Gap**: "Competitors have 40% transactional intent, you have 20%"
- [ ] **Keyword Opportunities**: "5 competitors use 'secure' but you don't"
- [ ] **Metadata Wins**: "Your title score (85) beats avg competitor (72)"
- [ ] **Missing Opportunities**: "Competitors average 12 learning combos, you have 3"

**Q3.2**: Should recommendations be:
- [ ] Auto-generated: "Add these 10 combos to match competitors"
- [ ] Insight-based: "Here's what competitors do differently..."
- [ ] Both: Insights + actionable recommendations

---

### 4. **ASO Brain Integration**

**Q4.1**: Should competitors use the SAME brain rules as your app?
- [ ] YES: Same vertical/market rules (apples-to-apples comparison)
- [ ] DYNAMIC: Auto-detect competitor vertical and use their rules
- [ ] CONFIGURABLE: Let user choose which rules to apply

**Q4.2**: Which ASO Brain systems should power competitor analysis?
- [x] Intent Engine (aso_intent_patterns) - ✅ Already exists
- [x] Rule Engine (aso_rule_evaluators) - ✅ Already exists
- [x] KPI Engine (kpi.registry.json) - ✅ Already exists
- [x] Combo Engine (comboGenerationEngine) - ✅ Already exists
- [x] Discovery Footprint (intentTypeMapping) - ✅ Already exists
- [x] Search Intent Coverage (searchIntentCoverageEngine) - ✅ Already exists

**Q4.3**: Should competitor audits generate the SAME outputs?
- [x] ElementScoringResult (title/subtitle/description scores)
- [x] UnifiedMetadataAuditResult (full audit result)
- [x] IntentCoverage (search intent distribution)
- [x] ComboCoverage (combo analysis)
- [x] KPI snapshots
- [x] Discovery footprint categories

---

### 5. **Data Storage**

**Q5.1**: Where should competitor audit results be stored?
- [ ] Option A: New table `competitor_audit_snapshots` (separate from your app audits)
- [ ] Option B: Same `aso_audit_snapshots` table with `is_competitor` flag
- [ ] Option C: Store in `app_competitors.comparison_summary` JSONB field
- [ ] Option D: Combination of B + C (detailed snapshots + summary cache)

**Q5.2**: Should we track competitor audit history over time?
- [ ] YES: Track changes (like monitoring your own app)
- [ ] NO: Just keep latest snapshot
- [ ] OPTIONAL: User can enable tracking per competitor

---

### 6. **Admin UI Management**

**Q6.1**: What should be manageable from frontend admin?
- [x] Intent patterns (aso_intent_patterns) - via future admin UI
- [x] Rules (aso_rule_evaluators) - via future admin UI
- [x] KPIs (via kpi.registry.json or database) - current: JSON file
- [x] Benchmarks (vertical/market benchmarks) - via benchmark registry
- [ ] Comparison templates (define what to compare)
- [ ] Report templates (custom competitor reports)

**Q6.2**: Should clients see competitor data?
- [ ] YES: Full competitor metadata and audits visible
- [ ] PARTIAL: Only comparison insights, not raw competitor data
- [ ] CONFIGURABLE: Admin sets visibility per organization

---

### 7. **Performance & Scalability**

**Q7.1**: How should we handle large competitor sets?
- If user adds 10 competitors, should we:
  - [ ] Audit all 10 immediately (parallel processing)
  - [ ] Audit in background queue (show "Processing...")
  - [ ] Audit on-demand (user clicks "Analyze" per competitor)

**Q7.2**: Caching strategy?
- [ ] Cache competitor audits for 24 hours
- [ ] Cache until user clicks "Refresh"
- [ ] Always fetch fresh (no cache)

---

## 🏗️ Current Architecture Analysis

### ✅ What Already Exists

#### Database Tables:
1. **`app_competitors`** ✅
   - Links target app → competitors
   - Stores competitor App Store ID, name, icon, rating
   - Has `comparison_summary` JSONB field for caching
   - RLS policies for multi-tenant access

2. **`aso_audit_snapshots`** ✅
   - Stores full audit results
   - Could be extended for competitors with `is_competitor` flag

3. **`aso_intent_patterns`** ✅ (Phase 22 - 291 patterns)
   - Powers intent classification
   - Already integrated with metadata audit

4. **`aso_rule_evaluators`** ✅
   - Rule-based scoring system
   - Vertical/market context-aware

#### Services:
1. **`competitor-analysis.service.ts`** ⚠️
   - Basic keyword extraction (deprecated approach)
   - Needs upgrade to use ASO Brain

2. **`metadataAuditEngine.ts`** ✅
   - Complete audit pipeline
   - Can be reused for competitors

3. **`intentEngine.ts`** ✅
   - Pattern-based classification
   - Already supports vertical/market context

4. **`comboGenerationEngine.ts`** ✅
   - Generates all possible combos
   - Can compare your combos vs competitor combos

5. **`searchIntentCoverageEngine.ts`** ✅
   - Computes intent coverage metrics
   - Ready for comparative analysis

#### Components:
1. **`CompetitorAnalysisDashboard.tsx`** ⚠️
   - Exists but likely needs major upgrade
   - Should integrate new ASO Brain analysis

2. **`UnifiedMetadataAuditModule`** ✅
   - Complete audit UI
   - Could be adapted for competitor view

---

### ❌ What Needs to Be Built

#### 1. **Competitor Metadata Fetching**
- Service to fetch competitor app data from App Store API
- Parse metadata (title, subtitle, description, keywords)
- Handle errors (app not found, region mismatch, etc.)

#### 2. **Competitor Audit Engine Wrapper**
```typescript
// New service
export async function auditCompetitor(
  competitorAppStoreId: string,
  country: string,
  vertical?: string,
  market?: string
): Promise<UnifiedMetadataAuditResult> {
  // 1. Fetch competitor metadata
  const metadata = await fetchCompetitorMetadata(competitorAppStoreId, country);

  // 2. Run SAME audit engine
  const auditResult = await runMetadataAudit(metadata, {
    vertical,
    market,
    organizationId, // Still scoped to org for brain rules
  });

  // 3. Store snapshot
  await storeCompetitorAudit(competitorId, auditResult);

  return auditResult;
}
```

#### 3. **Comparison Engine**
```typescript
// New service
export function compareMetadata(
  yourAudit: UnifiedMetadataAuditResult,
  competitorAudits: UnifiedMetadataAuditResult[]
): CompetitorComparisonResult {
  return {
    intentGaps: compareIntentCoverage(yourAudit, competitorAudits),
    comboGaps: compareComboUsage(yourAudit, competitorAudits),
    kpiComparison: compareKPIs(yourAudit, competitorAudits),
    discoveryFootprintGap: compareFootprints(yourAudit, competitorAudits),
    opportunityCombos: findMissingCombos(yourAudit, competitorAudits),
    recommendations: generateCompetitiveRecommendations(...),
  };
}
```

#### 4. **Competitor Audit UI Components**
- `CompetitorAuditCard.tsx` - Shows one competitor's audit
- `CompetitorComparisonTable.tsx` - Side-by-side comparison
- `IntentGapAnalysis.tsx` - Visualize intent differences
- `ComboGapVisualization.tsx` - Show combo opportunities
- `CompetitiveInsightsPanel.tsx` - AI-like insights

#### 5. **Integration Points**
- Add "Compare with Competitors" button to audit page
- Show competitor insights in Discovery Footprint section
- Highlight combo opportunities in Combo Workbench
- Add KPI comparison bars to score cards

---

## 🎨 Proposed UI Flow

### Step 1: Add Competitors
```
[Audit Page]
┌─────────────────────────────────────────────────────────┐
│ Your App: Duolingo                                      │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Overall Score: 85/100                                ││
│ │ ... audit results ...                                ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ [+ Add Competitors] [Compare with Competitors (0)]      │
└─────────────────────────────────────────────────────────┘

[Click "+ Add Competitors"]
┌─────────────────────────────────────────────────────────┐
│ Add Competitor                                          │
│ ┌─────────────────────────────────────────────────────┐│
│ │ App Store ID: [________________] [Search by name]   ││
│ │                                                      ││
│ │ Found: Babbel                                        ││
│ │ [Icon] Babbel - Language Learning                    ││
│ │ Rating: 4.5 ⭐ (125K reviews)                        ││
│ │ Category: Education                                  ││
│ │                                                      ││
│ │ Priority: [Primary ▼]                                ││
│ │ Context: [Direct competitor in language learning]   ││
│ │                                                      ││
│ │ [Cancel] [Add Competitor]                            ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Step 2: Analyze Competitors
```
[Click "Compare with Competitors (3)"]
┌─────────────────────────────────────────────────────────┐
│ Competitive Analysis                                    │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Your App: Duolingo (Score: 85)                       ││
│ │ Competitors: Babbel (78), Rosetta Stone (82)...     ││
│ │                                                      ││
│ │ [Refresh All] [Add More Competitors]                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                          │
│ 📊 KPI Comparison                                        │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Overall Score:    You: 85  Avg Comp: 80  ✅ +5      ││
│ │ Title Score:      You: 78  Avg Comp: 85  ⚠️ -7      ││
│ │ Intent Coverage:  You: 65% Avg Comp: 72% ⚠️ -7%     ││
│ │ Combo Diversity:  You: 35  Avg Comp: 42  ⚠️ -7      ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ 🎯 Intent Gap Analysis                                   │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Informational:    You: 60% | Competitors: 55% ✅     ││
│ │ Commercial:       You: 25% | Competitors: 30% ⚠️     ││
│ │ Transactional:    You: 10% | Competitors: 35% ❌     ││
│ │ Navigational:     You: 15% | Competitors: 10% ✅     ││
│ │                                                      ││
│ │ 💡 Insight: Competitors use 3.5x more transactional  ││
│ │    keywords like "download", "free trial", "premium" ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ 🔗 Combo Opportunities                                   │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Combos Used by 2+ Competitors (Missing from Yours): ││
│ │                                                      ││
│ │ 1. "language learning app" (3/3 competitors) 🔥      ││
│ │    Strategic Value: 85/100                           ││
│ │    Used by: Babbel, Rosetta Stone, Mondly           ││
│ │    [Add to Title] [Add to Subtitle]                  ││
│ │                                                      ││
│ │ 2. "learn languages fast" (2/3 competitors)          ││
│ │    Strategic Value: 78/100                           ││
│ │    [Add to Title] [Add to Subtitle]                  ││
│ │                                                      ││
│ │ ... 8 more opportunities                             ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ 📈 Discovery Footprint Comparison                        │
│ ┌─────────────────────────────────────────────────────┐│
│ │          You    Babbel  Rosetta  Mondly             ││
│ │ Learning  12     15      18       14    ⚠️           ││
│ │ Outcome   8      12      10       11    ⚠️           ││
│ │ Brand     3      4       5        2     ✅           ││
│ │ Noise     5      3       2        4     ⚠️           ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### **Phase A: Foundation** (Week 1)
1. Create competitor metadata fetching service
2. Extend audit engine to accept competitor metadata
3. Store competitor audits in database
4. Basic UI to add competitors

### **Phase B: Comparison Engine** (Week 2)
1. Build comparison algorithms (intent, combos, KPIs)
2. Generate competitive insights
3. Find combo opportunities
4. Calculate gap metrics

### **Phase C: UI/UX** (Week 3)
1. Competitor audit cards
2. Comparison tables and visualizations
3. Intent gap analysis component
4. Combo opportunity cards
5. Integrate into existing audit page

### **Phase D: Admin & Polish** (Week 4)
1. Make comparison metrics configurable
2. Add comparison templates
3. Export competitor reports
4. Performance optimization
5. Add caching strategy

---

## ❓ Decision Points (Need Your Input)

Please answer these to finalize the plan:

### Critical Decisions:
1. **UI Entry Point**: Where should users add competitors? (Q1.1)
2. **Comparison Type**: 1-to-1, 1-to-many, or both? (Q2.2)
3. **Brain Rules**: Same rules or dynamic per competitor? (Q4.1)
4. **Storage**: New table or extend existing? (Q5.1)
5. **Caching**: Real-time, snapshot, or hybrid? (Q1.3)

### Feature Scope:
6. **What to Compare**: Check all items from Q2.1
7. **Insights Type**: Auto-recommendations or insight-based? (Q3.2)
8. **Tracking**: Track competitor history over time? (Q5.2)
9. **Visibility**: Should clients see full competitor data? (Q6.2)

---

## 📝 Next Steps

Once you answer the questions above, I will:
1. Create detailed technical spec
2. Design database schema updates (if needed)
3. Map out exact API endpoints
4. Design component hierarchy
5. Create implementation tasks with priority
6. Generate first set of code (services/components)

**Status**: ⏸️ AWAITING USER INPUT
