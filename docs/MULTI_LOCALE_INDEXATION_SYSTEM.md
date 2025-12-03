# Multi-Locale Indexation System - Complete Specification

**Version:** 1.0
**Date Created:** 2025-12-03
**Status:** 🟡 60% Complete
**Market**: US App Store (10 Locales)

---

## 🎯 **Purpose**

Model how the Apple App Store indexes metadata for the **United States market**, including primary and secondary localization behavior, keyword extraction, and combination logic.

### **Key Insight**
The US App Store does NOT index a single metadata set. It indexes **10 locales simultaneously**, each contributing its own keyword universe.

---

## 📐 **System Architecture**

### **1. Locale-Based Indexation Model (US Market)**

#### **Primary Locale**
- `EN_US` - English (United States)

#### **Secondary Locales** (9)
- `ES_MX` - Spanish (Mexico)
- `RU` - Russian
- `ZH_HANS` - Simplified Chinese
- `AR` - Arabic
- `FR_FR` - French (France)
- `PT_BR` - Portuguese (Brazil)
- `ZH_HANT` - Traditional Chinese
- `VI` - Vietnamese
- `KO` - Korean

#### **Total Index Capacity**
- **10 locales** × **160 chars each** (30 + 30 + 100) = **1,600 characters**
- This is 10x more indexable space than single-locale apps!

---

### **2. Metadata Inputs Per Locale**

For each of the 10 locales:
| Field | Max Length | Source | Manual? |
|-------|------------|--------|---------|
| Title | 30 chars | Auto-fetch via HTML scraper | ✅ Can edit |
| Subtitle | 30 chars | Auto-fetch via HTML scraper | ✅ Can edit |
| Keywords | 100 chars | **ALWAYS manual** (not available via API) | ✅ Manual only |

---

### **3. Token Extraction Rules**

For each locale independently:

1. **Split** Title, Subtitle, and Keywords into tokens
2. **Normalize**:
   - Lowercase
   - Strip punctuation
   - Split camelCase/PascalCase
3. **Remove** auto-indexed stop words (`app`, `game`, `for`, etc.)
4. **Output**: Per-locale keyword bag

**CRITICAL**: Each locale retains its own bag. **NO cross-locale token merging**.

---

### **4. Combination Logic** 🔒 **CRITICAL RULE**

#### **Locale-Bound Combinations**
Keyword combinations are generated **within each locale ONLY**.

**Example**:
```
Locale: EN_US
Tokens: {self, care, daily}

Valid Combinations:
✅ self care (both from EN_US)
✅ self daily (both from EN_US)
✅ care daily (both from EN_US)
```

#### **Cross-Locale Combinations** ❌ **FORBIDDEN**
```
Locale 1: EN_US → {self, care}
Locale 2: ES_MX → {diario, rutina}

Invalid Combinations (MUST REJECT):
❌ self diario (crosses EN_US + ES_MX)
❌ care rutina (crosses EN_US + ES_MX)
❌ self rutina (crosses EN_US + ES_MX)
```

**Why?** Apple's indexation algorithm generates combinations independently per locale. Tokens from different locales **never combine** in the index.

---

### **5. Ranking Fusion Logic**

Apple produces one final US search ranking per keyword using:

```
FinalRank_US(keyword) = max(rank_L(keyword) for L in all US locales)
```

**Meaning:**
- If keyword "meditation" has:
  - EN_US: Tier 2 (score: 70)
  - ES_MX: Tier 1 (score: 95)
  - FR_FR: Tier 3 (score: 40)
- **Final US rank** = Tier 1 (95) from ES_MX

**Why?** The strongest locale wins. Users searching in the US market benefit from the best ranking across ALL locales.

---

### **6. Duplication Rules**

#### **Within Same Locale**
❌ **Useless** - Apple de-duplicates tokens automatically
```
EN_US Title: "Self Care App"
EN_US Keywords: "self,care,wellness"
Result: "self" and "care" are duplicated → NO benefit
```

#### **Across Different Locales**
⚠️ **May be wasteful** - Doesn't reduce ranking, but wastes character space
```
EN_US Keywords: "meditation"
ES_MX Keywords: "meditation"
FR_FR Keywords: "meditation"
Result: Same keyword in 3 locales → Probably wasteful unless building locale-specific combos
```

**Engine Behavior:**
- Warn when duplication doesn't produce new combinations
- Allow duplication only when needed for locale-bound combination building

---

### **7. Locale-Specific Strategy Modeling**

Different locales serve different strategic purposes:

| Locale | Strategy | Use Case |
|--------|----------|----------|
| **EN_US** | Core ranking | Brand + primary generic keywords |
| **ES_MX** | Highest-value expansion | Spanish-speaking US users (large audience) |
| **FR_FR / PT_BR / RU** | Long-tail expansion | Niche keyword slots |
| **ZH_HANS / ZH_HANT** | High-capacity English slots | Chinese users searching in English |
| **VI / KO** | "Hidden" metadata slots | English long-tail keywords |

---

## 📊 **Required Engine Outputs**

### **Output 1: Locale Coverage Map**
Shows which locales contribute to US indexation.

**Table Columns:**
- Locale name
- Unique tokens
- Total combinations generated
- Duplicate tokens (wasteful)
- Contribution % (of total combos)
- Status (empty, underutilized, full)

**Insights:**
- Empty locales = missed opportunities
- Underutilized locales (<50% char usage) = potential for expansion
- Duplicated keywords = character waste

---

### **Output 2: Combination Opportunity Matrix**
Shows combinations possible **inside each locale** (locale-bound only).

**Grid Layout:** 10 locale cards
Each card shows:
- Locale name
- Tier breakdown:
  - 🔥 Tier 1: N combos
  - 💎 Tier 2: N combos
  - ⚡ Tier 3+: N combos
- Sample combinations (top 3)
- Opportunities (e.g., "Move keyword X here for +5 Tier 1 combos")

---

### **Output 3: Ranking Fusion View**
Shows final US ranking using max(rank) across locales.

**Table Columns:**
- Keyword
- Best Rank (Tier + Score)
- Source Locale (which locale provides best rank)
- Appears In (list of locales)
- Fusion Strategy:
  - `primary_strongest` - EN_US provides best rank
  - `secondary_stronger` - Secondary locale beats EN_US
  - `equal_rank` - Multiple locales tied

**Example:**
| Keyword | Best Rank | Source Locale | Fusion Strategy |
|---------|-----------|---------------|-----------------|
| meditation | Tier 1 (100) | EN_US | primary_strongest |
| diario | Tier 1 (95) | ES_MX | secondary_stronger 🔥 |
| wellness | Tier 2 (70) | EN_US | primary_strongest |

---

### **Output 4: Optimization Recommendations**
Rule-based suggestions for optimal keyword distribution.

**Recommendation Types:**

#### 1. **empty_locale** (Warning)
```
⚠️ RU locale is empty but indexable
Suggestion: Add Russian keywords
Impact: +30 potential new combinations
```

#### 2. **duplicated_keyword** (Warning)
```
⚠️ "care" appears in EN_US, ES_MX, FR_FR (3 locales)
Suggestion: Keep in EN_US only, redistribute space
Impact: Free up 4 chars in ES_MX, 4 chars in FR_FR
```

#### 3. **underutilized_locale** (Info)
```
💡 ES_MX is only 40% utilized (64/160 chars)
Suggestion: Add more Spanish keywords
Impact: 96 characters available for Tier 1 combos
```

#### 4. **tier_upgrade_possible** (Info)
```
💡 Move "daily" from ZH_HANS to EN_US for stronger ranking
Current: Tier 3 in ZH_HANS (40 pts)
Proposed: Tier 1 in EN_US (100 pts)
Impact: +60 ranking points
```

#### 5. **cross_locale_opportunity** (Info)
```
💡 Distribute keywords across locales for better coverage
Current: All keywords in EN_US
Proposed: Split between EN_US + ES_MX
Impact: +50 new combinations
```

---

## 🏗️ **Implementation Architecture**

### **Frontend Components**

```
src/components/AppAudit/MultiLocaleOptimization/
├── MultiLocaleEditorPanel.tsx         ✅ Main container
├── LocaleInputCard.tsx                ✅ Individual locale editor
├── LocaleCoverageMap.tsx              ⏳ Visualization #1
├── CombinationMatrix.tsx              ⏳ Visualization #2
├── RankingFusionView.tsx              ⏳ Visualization #3
├── MultiLocaleOptimizationRecs.tsx    ⏳ Visualization #4
└── index.ts                           ⏳ Exports
```

### **Backend Services**

```
src/services/
├── multiLocaleMetadataFetcher.ts      ✅ Fetch metadata per locale
└── multiLocaleMetadataService.ts      ⏳ Save/load from database

src/hooks/
└── useMultiLocaleAudit.ts             ✅ Edge function hook

src/utils/
├── multiLocaleAnalysis.ts             ⏳ Coverage + recommendations
└── rankingFusion.ts                   ⏳ Fusion algorithm
```

### **Edge Function**

```
supabase/functions/multi-locale-audit/
└── index.ts                           ⏳ Process 10 locales
    ├── Extract tokens per locale
    ├── Generate locale-bound combinations
    ├── Validate NO cross-locale mixing
    ├── Calculate coverage
    ├── Fuse rankings (max)
    └── Generate recommendations
```

### **Database**

```sql
ALTER TABLE monitored_apps
ADD COLUMN multi_locale_metadata JSONB;

CREATE INDEX idx_monitored_apps_multi_locale
ON monitored_apps USING GIN (multi_locale_metadata);
```

---

## 🔒 **Critical Rules (Must Enforce)**

### **Rule 1: NO Cross-Locale Combinations**
```typescript
// Backend validation (edge function)
for (const combo of allCombinations) {
  const sourceLocales = new Set(
    combo.keywords.map(kw => findSourceLocale(kw, locales))
  );

  if (sourceLocales.size > 1) {
    throw new Error(
      `INVALID_COMBO: Cross-locale combination detected: "${combo.text}" ` +
      `spans ${Array.from(sourceLocales).join(', ')}`
    );
  }
}
```

### **Rule 2: Duplication Warnings**
```typescript
// Detect duplicated keywords across locales
const keywordLocaleMap = new Map<string, USMarketLocale[]>();

locales.forEach(locale => {
  locale.tokens.all.forEach(keyword => {
    if (!keywordLocaleMap.has(keyword)) {
      keywordLocaleMap.set(keyword, []);
    }
    keywordLocaleMap.get(keyword)!.push(locale.locale);
  });
});

// Warn if keyword appears in 3+ locales
const duplicated = Array.from(keywordLocaleMap.entries())
  .filter(([_, locales]) => locales.length >= 3);

duplicated.forEach(([keyword, locales]) => {
  recommendations.push({
    type: 'duplicated_keyword',
    severity: 'warning',
    message: `"${keyword}" appears in ${locales.length} locales (wasteful)`,
  });
});
```

### **Rule 3: Ranking Fusion**
```typescript
// For each keyword, take max rank across all locales
function fuseRankings(locales: LocaleMetadata[]): FusedRanking[] {
  const keywordMap = new Map<string, {
    ranksByLocale: Map<USMarketLocale, { score: number; tier: number }>;
  }>();

  // Collect all keyword ranks
  locales.forEach(locale => {
    locale.combinations.forEach(combo => {
      combo.keywords.forEach(keyword => {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, { ranksByLocale: new Map() });
        }

        const entry = keywordMap.get(keyword)!;
        const existingRank = entry.ranksByLocale.get(locale.locale);

        // Keep BEST score for this keyword in this locale
        if (!existingRank || combo.strengthScore > existingRank.score) {
          entry.ranksByLocale.set(locale.locale, {
            score: combo.strengthScore,
            tier: combo.tier,
          });
        }
      });
    });
  });

  // Fuse: Take max across all locales
  const fused: FusedRanking[] = [];

  for (const [keyword, data] of keywordMap) {
    let bestScore = 0;
    let bestLocale: USMarketLocale = 'EN_US';

    for (const [locale, rank] of data.ranksByLocale) {
      if (rank.score > bestScore) {
        bestScore = rank.score;
        bestLocale = locale;
      }
    }

    fused.push({
      keyword,
      bestScore,
      bestLocale,
      fusionStrategy: bestLocale === 'EN_US' ? 'primary_strongest' : 'secondary_stronger',
    });
  }

  return fused.sort((a, b) => b.bestScore - a.bestScore);
}
```

---

## 🎨 **User Experience Flow**

### **Step 1: Enable Multi-Locale Mode**
```
User clicks: [🌍 Multi-Locale] toggle
→ MultiLocaleEditorPanel appears
→ EN_US pre-filled from current audit
→ 9 secondary locales empty
```

### **Step 2: Fetch Secondary Locales**
```
User clicks: [Fetch All Locales]
→ Parallel fetch to App Store API (9 requests)
→ Title + Subtitle populated for each available locale
→ Keywords remain empty (manual entry required)
→ Status badges show: ✓ Fetched, ⚠️ Not Available, ✗ Error
```

### **Step 3: Manual Keyword Entry**
```
User manually enters keywords for each locale:
EN_US: meditation,mindfulness,sleep,calm
ES_MX: meditación,sueño,calma,bienestar
FR_FR: méditation,sommeil,calme,bien-être
... (and so on)
```

### **Step 4: Run Multi-Locale Audit**
```
User clicks: [Run Multi-Locale Audit & Compare]
→ Edge function processes all 10 locales
→ Generates combinations (locale-bound)
→ Calculates coverage, fusion, recommendations
→ Returns MultiLocaleIndexation result
```

### **Step 5: View Results**
```
4 visualizations appear:

1. Locale Coverage Map
   - EN_US: 45 combos (40%)
   - ES_MX: 28 combos (25%)
   - ...

2. Combination Matrix
   - EN_US: Tier 1 = 15, Tier 2 = 20
   - ES_MX: Tier 1 = 8, Tier 2 = 12
   - ...

3. Ranking Fusion View
   - meditation: Tier 1 from EN_US
   - diario: Tier 1 from ES_MX (🔥 secondary stronger!)
   - ...

4. Optimization Recommendations
   - ⚠️ "care" duplicated in 3 locales
   - 💡 RU locale is empty (opportunity)
   - 💡 Move "daily" to EN_US for Tier upgrade
```

---

## 📈 **Success Metrics**

### **Coverage**
- **Total unique keywords**: Count across all 10 locales
- **Total combinations**: Sum of all locale combos
- **Active locales**: Locales with metadata (out of 10)

### **Quality**
- **Tier 1 combos**: Total across all locales
- **Duplicate warnings**: Fewer is better
- **Character utilization**: % of 1,600 chars used

### **Opportunities**
- **Empty locales**: Locales with no metadata
- **Underutilized locales**: Locales with <50% char usage
- **Tier upgrades**: Keywords that could move to stronger locales

---

## 🚀 **Deployment Checklist**

- [ ] All 7 UI components created
- [ ] Edge function `multi-locale-audit` deployed
- [ ] Database migration applied
- [ ] Integration with UnifiedMetadataAuditModule complete
- [ ] Test with real app (Headspace, Duolingo, etc.)
- [ ] Verify cross-locale combination validation works
- [ ] Verify ranking fusion displays correctly
- [ ] Verify recommendations are actionable

---

## 📝 **Related Documentation**

- `MULTI_LOCALE_IMPLEMENTATION_PROGRESS.md` - Implementation status
- `METADATA_OPTIMIZATION_SYSTEM.md` - Single-locale optimization system
- `MARKET_LOCALE_FIX_ENTERPRISE.md` - Locale handling architecture

---

**Maintained By**: Claude Code
**Last Updated**: 2025-12-03
**Status**: 🟡 Implementation in progress
