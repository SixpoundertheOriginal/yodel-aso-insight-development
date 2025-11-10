# 🧠 Competitive Intelligence Pipeline & UI Redesign Blueprint

**Project**: Yodel ASO Insight Platform
**Date**: 2025-01-10
**Status**: Design Phase
**Version**: 2.0

---

## 📊 Executive Summary

This document provides a complete redesign of the Competitive Intelligence system, transforming it from a **literal keyword extraction system** into a **semantic, context-aware intelligence platform** that delivers ASO-actionable insights.

### Key Goals
1. **Semantic Understanding**: Extract contextualized insights, not just keywords
2. **ASO/Product Separation**: Classify insights as ASO-relevant (discovery language) or Product-relevant (UX/retention)
3. **Modular Pipeline**: Separate ingestion → NLP → enrichment → storage → visualization
4. **Scalability**: Support multiple clients, app categories, and languages
5. **Actionability**: Every insight includes context, examples, trends, and recommendations

---

## 🔍 PART 1: Current State Audit

### Current Architecture

```
┌─────────────────┐
│ Raw Reviews     │
│ (iTunes RSS)    │
└────────┬────────┘
         │
         v
┌─────────────────────────────────┐
│ useCompetitorComparison Hook    │
│ - Fetches reviews for all apps  │
│ - Runs analyzeEnhancedSentiment  │
│ - Basic keyword detection        │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ review-intelligence.engine.ts   │
│ - extractThemes()               │
│ - extractFeatureMentions()      │
│ - extractIssuePatterns()        │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ competitor-review-intelligence  │
│ .service.ts                     │
│ - findFeatureGaps()             │
│ - identifyOpportunities()       │
│ - identifyStrengths()           │
│ - identifyThreats()             │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ UI: CompetitiveIntelligence     │
│ Panel.tsx                       │
│ - Tabs: Gaps/Opps/Strengths/    │
│   Threats                       │
│ - Shows feature + mention count │
└──────────────────────────────────┘
```

### Current Extraction Logic Problems

#### 1. **Literal Keyword Matching** (Lines 234-265 in review-intelligence.engine.ts)
```typescript
const features = [
  'dark mode', 'notifications', 'search', 'filter', 'export', 'sync',
  'backup', 'sharing', 'offline mode', 'widgets', 'themes', 'customization'
];

features.forEach(feature => {
  if (text.includes(feature)) {  // ❌ PROBLEM: No context
    // ...
  }
});
```

**Problems:**
- ❌ No context: "export" could mean "export photos", "export data", "export contacts"
- ❌ No semantic grouping: "sync", "backup", "cloud storage" are related but treated separately
- ❌ No ASO/Product classification: Is "search" about in-app search or App Store discoverability?
- ❌ Hardcoded features: Doesn't adapt to new app categories

#### 2. **Theme Extraction** (Lines 196-231)
```typescript
const commonThemes = [
  'app crashes', 'performance issues', 'ui/ux design', 'pricing concerns',
  'customer support', 'ads', 'battery drain', 'login issues', 'sync problems'
];
```

**Problems:**
- ❌ Fixed list, not dynamic
- ❌ No semantic similarity: "app crashes", "app freezes", "app stops working" should be grouped
- ❌ No trending detection: Can't identify emerging themes
- ❌ No category-specific adaptation: Fitness apps have different themes than plant apps

#### 3. **Issue Pattern Recognition** (Lines 267-309)
```typescript
const issues = [
  'app crashes', 'won\'t load', 'login problems', 'sync issues', 'slow performance',
  'battery drain', 'data loss', 'payment issues', 'notification problems', 'ui bugs'
];
```

**Problems:**
- ❌ No severity weighting beyond frequency
- ❌ No causality tracking: Why is it crashing?
- ❌ No version correlation: Which versions have issues?

#### 4. **Feature Gap Analysis** (Lines 179-244 in competitor-review-intelligence.service.ts)
```typescript
const primaryFeatures = new Set(
  primaryApp.intelligence.featureMentions.map(f => f.feature)
);

competitorFeatures.forEach((data, feature) => {
  if (!primaryFeatures.has(feature)) {  // ❌ PROBLEM: Exact string match only
    gaps.push({
      feature,  // ❌ Just the keyword, no context
      mentionedInCompetitors: data.competitors,
      competitorSentiment: avgSentiment,
      frequency: data.count,
      userDemand: this.calculateUserDemand(data.count, data.competitors.length),
      examples: data.examples
    });
  }
});
```

**Problems:**
- ❌ No semantic matching: "plant identifier" vs "plant recognition" are the same but treated as different gaps
- ❌ No ASO relevance: Can't tell if "search" is an ASO keyword opportunity or product feature
- ❌ No context: Feature is just a string, not a structured object

### Current Database Schema

**Strengths:**
- ✅ `competitor_analysis_cache` table for 24-hour caching
- ✅ `monitored_app_reviews` table for review storage
- ✅ `feature_sentiment_analysis` table (from Phase 1) for feature-level data

**Gaps:**
- ❌ No `semantic_insights` table for structured, context-aware insights
- ❌ No `aso_keyword_mapping` table to link insights to keyword opportunities
- ❌ No `insight_classification` table for ASO vs Product taxonomy
- ❌ No `trend_snapshots` table for historical trending
- ❌ No `insight_enrichment` table for examples, context phrases, impact scores

---

## 🎯 PART 2: Target Architecture (v2.0)

### Conceptual Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    STAGE 1: INGESTION                        │
│                                                              │
│  Raw Reviews  →  Normalization  →  Deduplication            │
│  (iTunes RSS)     (Clean text)     (Detect duplicates)      │
│                                                              │
│  Output: Clean, deduplicated reviews with metadata          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                    STAGE 2: NLP EXTRACTION                   │
│                                                              │
│  Semantic Extraction → Topic Clustering → Context Extraction│
│  (Noun+Verb pairs)     (Group similar)    (Get phrases)     │
│                                                              │
│  Example:                                                    │
│  - Raw: "I love the plant identification feature"           │
│  - Extracted: {                                              │
│      topic: "plant_identification",                          │
│      context: "identify plants",                             │
│      verb: "identify",                                       │
│      noun: "plants",                                         │
│      rawPhrase: "plant identification feature"               │
│    }                                                         │
│                                                              │
│  Output: Structured topic objects with context              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                   STAGE 3: CLASSIFICATION                    │
│                                                              │
│  ASO/Product Classifier → Category Adapter                  │
│                                                              │
│  Rules:                                                      │
│  - ASO: Discovery language ("identify", "scan", "find")      │
│  - Product: UX/retention ("works offline", "saves data")     │
│                                                              │
│  Example:                                                    │
│  - "identify plants" → ASO (discovery intent)                │
│  - "offline mode" → Product (retention feature)              │
│  - "app crashes" → Product (reliability)                     │
│                                                              │
│  Output: Classified insights with type flags                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                   STAGE 4: ENRICHMENT                        │
│                                                              │
│  Sentiment Analysis → Trend Detection → Impact Scoring      │
│  (Per insight)        (MoM growth)      (Weighted formula)   │
│                                                              │
│  Example Enrichment:                                         │
│  {                                                           │
│    topic: "plant_identification",                            │
│    context: "identify plants quickly",                       │
│    type: "aso",                                              │
│    sentiment: 0.85,                                          │
│    mentionCount: 47,                                         │
│    trendMoM: +23%,                                           │
│    impactScore: 87/100,                                      │
│    examples: [                                               │
│      "Love how fast it identifies plants!",                  │
│      "Best plant ID app I've tried"                          │
│    ],                                                        │
│    asoKeywords: ["plant identifier", "plant ID", "identify"] │
│  }                                                           │
│                                                              │
│  Output: Fully enriched insights ready for storage          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                   STAGE 5: STORAGE                           │
│                                                              │
│  Database Tables:                                            │
│  - semantic_insights (core data)                             │
│  - insight_examples (sample reviews)                         │
│  - insight_trends (historical snapshots)                     │
│  - aso_keyword_mapping (ASO connections)                     │
│  - insight_classifications (taxonomy)                        │
│                                                              │
│  Output: Persisted, queryable intelligence                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                   STAGE 6: API LAYER                         │
│                                                              │
│  REST Endpoints:                                             │
│  - GET /api/insights?app_id=X&type=aso                       │
│  - GET /api/insights/trends?topic=plant_identification       │
│  - GET /api/insights/gaps?primary=X&competitors=Y,Z          │
│  - GET /api/insights/keywords?app_id=X                       │
│                                                              │
│  Output: Flexible query interface for UI                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                   STAGE 7: VISUALIZATION                     │
│                                                              │
│  Dashboard Components:                                       │
│  - ASO Insights Panel (discovery opportunities)              │
│  - Product Insights Panel (UX/retention)                     │
│  - Trend Charts (MoM growth by topic)                        │
│  - Gap Heatmap (what competitors have)                       │
│  - Keyword Mapper (insights → ASO keywords)                  │
│                                                              │
│  Output: Actionable, visual intelligence                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ PART 3: Detailed Design

### 3.1 Database Schema (New Tables)

#### Table: `semantic_insights`
**Purpose**: Core storage for contextualized insights

```sql
CREATE TABLE public.semantic_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_store_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  country TEXT NOT NULL,

  -- Topic Identity
  topic_id TEXT NOT NULL,              -- Normalized: "plant_identification"
  topic_display TEXT NOT NULL,         -- Display: "Plant Identification"
  context_phrase TEXT NOT NULL,        -- "identify plants quickly"
  verb TEXT,                           -- "identify"
  noun TEXT,                           -- "plants"

  -- Classification
  insight_type TEXT NOT NULL CHECK (insight_type IN ('aso', 'product', 'both')),
  category TEXT,                       -- 'discovery', 'ux', 'performance', 'retention'
  subcategory TEXT,                    -- 'visual_search', 'offline_access', etc.

  -- Metrics
  mention_count INTEGER NOT NULL DEFAULT 0,
  sentiment_score DECIMAL(3,2),        -- -1 to 1
  sentiment_positive_pct DECIMAL(5,2),
  sentiment_negative_pct DECIMAL(5,2),

  -- Impact & Demand
  impact_score DECIMAL(5,2),           -- 0-100 weighted score
  demand_level TEXT CHECK (demand_level IN ('critical', 'high', 'medium', 'low')),
  exploitability TEXT CHECK (exploitability IN ('high', 'medium', 'low')),

  -- Trend Data
  trend_mom_pct DECIMAL(5,2),          -- Month-over-month % change
  trend_direction TEXT CHECK (trend_direction IN ('rising', 'stable', 'declining')),
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,

  -- ASO Mapping
  aso_keywords TEXT[],                 -- Related App Store keywords
  aso_relevance_score DECIMAL(3,2),    -- 0-1 how ASO-relevant this is

  -- Metadata
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  UNIQUE(organization_id, app_store_id, topic_id, country)
);

CREATE INDEX idx_semantic_insights_app ON semantic_insights(app_store_id, country);
CREATE INDEX idx_semantic_insights_type ON semantic_insights(insight_type, demand_level);
CREATE INDEX idx_semantic_insights_impact ON semantic_insights(impact_score DESC);
CREATE INDEX idx_semantic_insights_trend ON semantic_insights(trend_direction, trend_mom_pct);
CREATE INDEX idx_semantic_insights_aso ON semantic_insights USING GIN(aso_keywords);
```

#### Table: `insight_examples`
**Purpose**: Store sample review excerpts for each insight

```sql
CREATE TABLE public.insight_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES semantic_insights(id) ON DELETE CASCADE,

  -- Review Reference
  review_id TEXT NOT NULL,
  review_text TEXT NOT NULL,           -- Full or excerpt
  review_rating SMALLINT,
  review_date TIMESTAMPTZ,

  -- Context
  matched_phrase TEXT,                 -- Exact phrase that matched
  surrounding_context TEXT,            -- 50 chars before/after

  -- Scoring
  relevance_score DECIMAL(3,2),        -- How good an example is this (0-1)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insight_examples_insight ON insight_examples(insight_id);
CREATE INDEX idx_insight_examples_relevance ON insight_examples(relevance_score DESC);
```

#### Table: `insight_trends`
**Purpose**: Historical snapshots for trend analysis

```sql
CREATE TABLE public.insight_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_store_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  country TEXT NOT NULL,

  -- Snapshot Metrics
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mention_count INTEGER NOT NULL,
  sentiment_score DECIMAL(3,2),
  impact_score DECIMAL(5,2),

  -- Change Indicators
  mentions_delta INTEGER,              -- vs previous snapshot
  sentiment_delta DECIMAL(3,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, app_store_id, topic_id, country, snapshot_date)
);

CREATE INDEX idx_insight_trends_topic ON insight_trends(app_store_id, topic_id, snapshot_date DESC);
```

#### Table: `aso_keyword_mapping`
**Purpose**: Link insights to ASO keyword opportunities

```sql
CREATE TABLE public.aso_keyword_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES semantic_insights(id) ON DELETE CASCADE,

  -- Keyword Data
  keyword TEXT NOT NULL,
  keyword_volume INTEGER,              -- Optional: search volume data
  keyword_difficulty DECIMAL(3,2),     -- Optional: competition score

  -- Mapping Strength
  relevance_score DECIMAL(3,2) NOT NULL, -- How strongly linked (0-1)
  mapping_type TEXT CHECK (mapping_type IN ('exact', 'semantic', 'related')),

  -- Recommendation
  recommendation TEXT,                 -- "Add to title" / "Add to subtitle" / "Use in description"
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aso_mapping_insight ON aso_keyword_mapping(insight_id);
CREATE INDEX idx_aso_mapping_keyword ON aso_keyword_mapping(keyword);
CREATE INDEX idx_aso_mapping_priority ON aso_keyword_mapping(priority, relevance_score DESC);
```

#### Table: `insight_classifications`
**Purpose**: Taxonomy and categorization metadata

```sql
CREATE TABLE public.insight_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id TEXT NOT NULL UNIQUE,

  -- Classification
  insight_type TEXT NOT NULL CHECK (insight_type IN ('aso', 'product', 'both')),
  category TEXT NOT NULL,
  subcategory TEXT,

  -- Synonyms & Variations
  synonyms TEXT[],                     -- ["plant ID", "plant identifier", "plant recognition"]
  related_topics TEXT[],               -- ["photo_plant_identification", "visual_search"]

  -- Confidence
  classification_confidence DECIMAL(3,2), -- How confident is the classification (0-1)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insight_classifications_type ON insight_classifications(insight_type);
CREATE INDEX idx_insight_classifications_category ON insight_classifications(category);
CREATE INDEX idx_insight_classifications_synonyms ON insight_classifications USING GIN(synonyms);
```

---

### 3.2 NLP Extraction Engine (v2.0)

#### File: `src/engines/semantic-extraction.engine.ts`

```typescript
/**
 * SEMANTIC EXTRACTION ENGINE v2.0
 *
 * Extracts contextualized, semantic insights from review text
 * using pattern matching, dependency parsing, and clustering
 */

export interface SemanticTopic {
  topicId: string;           // "plant_identification"
  displayName: string;       // "Plant Identification"
  contextPhrase: string;     // "identify plants quickly"
  verb: string | null;       // "identify"
  noun: string | null;       // "plants"
  rawPhrases: string[];      // ["plant identification", "identify plants"]
  mentionCount: number;
  examples: Array<{
    text: string;
    matchedPhrase: string;
    context: string;
  }>;
}

export interface ExtractionConfig {
  appCategory?: string;      // 'plant_care', 'fitness', 'finance'
  language?: string;          // 'en', 'es', 'fr'
  extractionMode?: 'strict' | 'balanced' | 'aggressive';
}

export class SemanticExtractionEngine {

  /**
   * Extract semantic topics from reviews with context
   */
  extract(reviews: EnhancedReviewItem[], config?: ExtractionConfig): SemanticTopic[] {
    // Step 1: Extract noun-verb pairs from all reviews
    const phrases = this.extractNounVerbPairs(reviews);

    // Step 2: Cluster semantically similar phrases
    const clusters = this.clusterSimilarPhrases(phrases);

    // Step 3: Build semantic topics from clusters
    const topics = clusters.map(cluster => this.buildTopicFromCluster(cluster, reviews));

    // Step 4: Filter and rank by relevance
    return this.filterAndRank(topics, config);
  }

  /**
   * Extract noun-verb pairs using pattern matching
   */
  private extractNounVerbPairs(reviews: EnhancedReviewItem[]): ExtractedPhrase[] {
    const patterns = [
      // Pattern: [verb] [noun]
      /\b(identify|scan|find|detect|recognize|search|discover|track|monitor)\s+([a-z\s]{2,30})\b/gi,

      // Pattern: [noun] [verb+ing]
      /\b([a-z\s]{2,20})\s+(identification|scanning|tracking|monitoring|recognition)\b/gi,

      // Pattern: [noun] feature/mode/function
      /\b([a-z\s]{2,20})\s+(feature|mode|function|tool|capability)\b/gi
    ];

    const extracted: ExtractedPhrase[] = [];

    reviews.forEach(review => {
      const text = review.text?.toLowerCase() || '';

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          extracted.push({
            verb: match[1],
            noun: match[2],
            rawPhrase: match[0],
            context: this.extractContext(text, match.index, 50),
            reviewId: review.review_id,
            sentiment: review.sentiment
          });
        }
      });
    });

    return extracted;
  }

  /**
   * Cluster similar phrases using semantic similarity
   */
  private clusterSimilarPhrases(phrases: ExtractedPhrase[]): PhraseCluster[] {
    const clusters: PhraseCluster[] = [];

    phrases.forEach(phrase => {
      // Find existing cluster with similar phrases
      let matchedCluster = clusters.find(cluster =>
        this.isSemantically Similar(phrase.rawPhrase, cluster.canonicalPhrase)
      );

      if (matchedCluster) {
        matchedCluster.phrases.push(phrase);
        matchedCluster.count++;
      } else {
        // Create new cluster
        clusters.push({
          canonicalPhrase: phrase.rawPhrase,
          phrases: [phrase],
          count: 1
        });
      }
    });

    return clusters.filter(c => c.count >= 2); // Minimum 2 mentions
  }

  /**
   * Check semantic similarity using Levenshtein + synonym lookup
   */
  private isSemantically Similar(phrase1: string, phrase2: string): boolean {
    // 1. Exact match
    if (phrase1 === phrase2) return true;

    // 2. Synonym match
    const synonyms = {
      'identify': ['ID', 'recognize', 'detect', 'find'],
      'plant': ['flora', 'vegetation', 'species'],
      'scan': ['photo', 'picture', 'image'],
      // ... more synonym mappings
    };

    // Check if words are synonyms
    const words1 = phrase1.split(' ');
    const words2 = phrase2.split(' ');

    for (const word1 of words1) {
      for (const word2 of words2) {
        if (this.areSynonyms(word1, word2, synonyms)) {
          return true;
        }
      }
    }

    // 3. Levenshtein distance (fuzzy match)
    const distance = this.levenshteinDistance(phrase1, phrase2);
    const similarity = 1 - (distance / Math.max(phrase1.length, phrase2.length));

    return similarity > 0.75; // 75% similarity threshold
  }

  /**
   * Build semantic topic from phrase cluster
   */
  private buildTopicFromCluster(cluster: PhraseCluster, reviews: EnhancedReviewItem[]): SemanticTopic {
    // Generate topic ID (normalized)
    const topicId = cluster.canonicalPhrase
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');

    // Extract verb and noun from canonical phrase
    const { verb, noun } = this.parseVerbNoun(cluster.canonicalPhrase);

    // Build context phrase (most common variation)
    const contextPhrase = this.selectBestContextPhrase(cluster.phrases);

    // Collect examples
    const examples = cluster.phrases
      .slice(0, 5) // Top 5 examples
      .map(p => ({
        text: this.getReviewText(p.reviewId, reviews),
        matchedPhrase: p.rawPhrase,
        context: p.context
      }));

    return {
      topicId,
      displayName: this.toTitleCase(cluster.canonicalPhrase),
      contextPhrase,
      verb,
      noun,
      rawPhrases: [...new Set(cluster.phrases.map(p => p.rawPhrase))],
      mentionCount: cluster.count,
      examples
    };
  }

  /**
   * Filter and rank topics by relevance
   */
  private filterAndRank(topics: SemanticTopic[], config?: ExtractionConfig): SemanticTopic[] {
    return topics
      .filter(t => t.mentionCount >= 2) // Minimum threshold
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 50); // Top 50 topics
  }
}
```

---

### 3.3 Classification Engine

#### File: `src/engines/insight-classification.engine.ts`

```typescript
/**
 * INSIGHT CLASSIFICATION ENGINE
 *
 * Classifies semantic topics as ASO-relevant or Product-relevant
 * using rule-based classification and category-specific logic
 */

export type InsightType = 'aso' | 'product' | 'both';

export interface Classification {
  type: InsightType;
  category: string;
  subcategory: string | null;
  confidence: number; // 0-1
  reasoning: string;
}

export class InsightClassificationEngine {

  /**
   * Classify a semantic topic
   */
  classify(topic: SemanticTopic, appCategory?: string): Classification {
    // Rule 1: Check for ASO discovery verbs
    if (this.isASODiscoveryLanguage(topic)) {
      return {
        type: 'aso',
        category: 'discovery',
        subcategory: this.detectASOSubcategory(topic),
        confidence: 0.9,
        reasoning: `Topic uses discovery language: "${topic.verb}"`
      };
    }

    // Rule 2: Check for Product UX/retention keywords
    if (this.isProductRetentionFeature(topic)) {
      return {
        type: 'product',
        category: 'retention',
        subcategory: this.detectProductSubcategory(topic),
        confidence: 0.85,
        reasoning: `Topic relates to user retention: "${topic.contextPhrase}"`
      };
    }

    // Rule 3: Check for Product reliability/performance
    if (this.isProductReliabilityIssue(topic)) {
      return {
        type: 'product',
        category: 'reliability',
        subcategory: 'stability',
        confidence: 0.95,
        reasoning: `Topic relates to app stability: "${topic.contextPhrase}"`
      };
    }

    // Rule 4: Category-specific classification
    if (appCategory) {
      const categoryClassification = this.classifyByCategory(topic, appCategory);
      if (categoryClassification) {
        return categoryClassification;
      }
    }

    // Default: Product insight with low confidence
    return {
      type: 'product',
      category: 'general',
      subcategory: null,
      confidence: 0.5,
      reasoning: 'Could not confidently classify'
    };
  }

  /**
   * Check if topic uses ASO discovery language
   */
  private isASODiscoveryLanguage(topic: SemanticTopic): boolean {
    const asoVerbs = [
      'identify', 'scan', 'find', 'search', 'discover', 'detect',
      'recognize', 'locate', 'track', 'lookup', 'browse'
    ];

    const asoNouns = [
      'scanner', 'identifier', 'detector', 'finder', 'search',
      'discovery', 'lookup', 'recognition'
    ];

    const hasASOVerb = topic.verb && asoVerbs.some(v =>
      topic.verb?.toLowerCase().includes(v)
    );

    const hasASONoun = topic.noun && asoNouns.some(n =>
      topic.noun?.toLowerCase().includes(n)
    );

    return hasASOVerb || hasASONoun;
  }

  /**
   * Check if topic is a product retention feature
   */
  private isProductRetentionFeature(topic: SemanticTopic): boolean {
    const retentionKeywords = [
      'offline', 'save', 'backup', 'sync', 'cloud', 'export',
      'notification', 'reminder', 'widget', 'shortcut'
    ];

    return retentionKeywords.some(keyword =>
      topic.contextPhrase.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if topic is a reliability/stability issue
   */
  private isProductReliabilityIssue(topic: SemanticTopic): boolean {
    const reliabilityKeywords = [
      'crash', 'freeze', 'bug', 'glitch', 'error', 'fail',
      'slow', 'lag', 'hang', 'stuck', 'broken'
    ];

    return reliabilityKeywords.some(keyword =>
      topic.contextPhrase.toLowerCase().includes(keyword)
    );
  }

  /**
   * Category-specific classification logic
   */
  private classifyByCategory(topic: SemanticTopic, category: string): Classification | null {
    const categoryRules: Record<string, CategoryClassificationRules> = {
      plant_care: {
        asoKeywords: ['identify', 'scan', 'plant ID', 'species', 'recognize'],
        productKeywords: ['care tips', 'watering', 'reminders', 'notifications']
      },
      fitness: {
        asoKeywords: ['workout', 'exercise', 'training', 'fitness tracker'],
        productKeywords: ['sync', 'Apple Health', 'goals', 'progress']
      },
      // ... more categories
    };

    const rules = categoryRules[category];
    if (!rules) return null;

    // Check ASO keywords for this category
    if (rules.asoKeywords.some(k => topic.contextPhrase.includes(k))) {
      return {
        type: 'aso',
        category: 'discovery',
        subcategory: category,
        confidence: 0.85,
        reasoning: `Matches ${category} ASO patterns`
      };
    }

    // Check product keywords for this category
    if (rules.productKeywords.some(k => topic.contextPhrase.includes(k))) {
      return {
        type: 'product',
        category: 'retention',
        subcategory: category,
        confidence: 0.85,
        reasoning: `Matches ${category} product patterns`
      };
    }

    return null;
  }
}
```

---

### 3.4 Enrichment Engine

#### File: `src/engines/insight-enrichment.engine.ts`

```typescript
/**
 * INSIGHT ENRICHMENT ENGINE
 *
 * Enriches semantic topics with:
 * - Sentiment analysis per topic
 * - Trend detection (MoM growth)
 * - Impact scoring (weighted formula)
 * - ASO keyword mapping
 */

export interface EnrichedInsight {
  // Core
  topic: SemanticTopic;
  classification: Classification;

  // Sentiment
  sentimentScore: number;         // -1 to 1
  sentimentPositivePct: number;
  sentimentNegativePct: number;

  // Demand & Impact
  mentionCount: number;
  demandLevel: 'critical' | 'high' | 'medium' | 'low';
  impactScore: number;            // 0-100
  exploitability: 'high' | 'medium' | 'low';

  // Trends
  trendMoM: number | null;        // Month-over-month % change
  trendDirection: 'rising' | 'stable' | 'declining';

  // ASO Mapping (if ASO-relevant)
  asoKeywords: string[];
  asoRelevanceScore: number;      // 0-1

  // Examples
  examples: Array<{
    text: string;
    rating: number;
    date: string;
  }>;
}

export class InsightEnrichmentEngine {

  /**
   * Enrich a semantic topic with all metadata
   */
  enrich(
    topic: SemanticTopic,
    classification: Classification,
    reviews: EnhancedReviewItem[],
    historicalData?: InsightTrendSnapshot[]
  ): EnrichedInsight {
    // 1. Calculate sentiment for this topic
    const sentiment = this.calculateTopicSentiment(topic, reviews);

    // 2. Calculate demand level
    const demand = this.calculateDemandLevel(topic.mentionCount, reviews.length);

    // 3. Calculate weighted impact score
    const impactScore = this.calculateImpactScore({
      mentionCount: topic.mentionCount,
      sentiment: sentiment.score,
      recency: this.calculateRecency(topic, reviews),
      trendMoM: historicalData ? this.calculateTrend(topic, historicalData) : null
    });

    // 4. Detect trend direction
    const trend = historicalData
      ? this.detectTrend(topic, historicalData)
      : { trendMoM: null, direction: 'stable' as const };

    // 5. Map to ASO keywords (if ASO-relevant)
    const asoMapping = classification.type === 'aso' || classification.type === 'both'
      ? this.mapToASOKeywords(topic)
      : { keywords: [], relevanceScore: 0 };

    // 6. Calculate exploitability (for gaps/opportunities)
    const exploitability = this.calculateExploitability(
      impactScore,
      sentiment.score,
      classification.type
    );

    // 7. Select best examples
    const examples = this.selectBestExamples(topic, reviews);

    return {
      topic,
      classification,
      sentimentScore: sentiment.score,
      sentimentPositivePct: sentiment.positivePct,
      sentimentNegativePct: sentiment.negativePct,
      mentionCount: topic.mentionCount,
      demandLevel: demand,
      impactScore,
      exploitability,
      trendMoM: trend.trendMoM,
      trendDirection: trend.direction,
      asoKeywords: asoMapping.keywords,
      asoRelevanceScore: asoMapping.relevanceScore,
      examples
    };
  }

  /**
   * Calculate sentiment specific to this topic
   */
  private calculateTopicSentiment(topic: SemanticTopic, reviews: EnhancedReviewItem[]) {
    const relevantReviews = reviews.filter(r =>
      topic.rawPhrases.some(phrase =>
        r.text?.toLowerCase().includes(phrase.toLowerCase())
      )
    );

    if (relevantReviews.length === 0) {
      return { score: 0, positivePct: 0, negativePct: 0 };
    }

    let positive = 0;
    let negative = 0;
    let totalScore = 0;

    relevantReviews.forEach(r => {
      if (r.sentiment === 'positive') positive++;
      if (r.sentiment === 'negative') negative++;

      const score = r.sentiment === 'positive' ? 1 : r.sentiment === 'negative' ? -1 : 0;
      totalScore += score;
    });

    return {
      score: totalScore / relevantReviews.length,
      positivePct: (positive / relevantReviews.length) * 100,
      negativePct: (negative / relevantReviews.length) * 100
    };
  }

  /**
   * Calculate weighted impact score (0-100)
   *
   * Formula:
   * impactScore = (
   *   mentionWeight * 0.4 +
   *   sentimentWeight * 0.3 +
   *   recencyWeight * 0.2 +
   *   trendWeight * 0.1
   * ) * 100
   */
  private calculateImpactScore(factors: {
    mentionCount: number;
    sentiment: number;
    recency: number;
    trendMoM: number | null;
  }): number {
    // Normalize mention count (0-1)
    const mentionWeight = Math.min(factors.mentionCount / 50, 1);

    // Normalize sentiment (-1 to 1) → (0 to 1)
    const sentimentWeight = (factors.sentiment + 1) / 2;

    // Recency is already 0-1
    const recencyWeight = factors.recency;

    // Normalize trend (if available)
    const trendWeight = factors.trendMoM !== null
      ? Math.min(Math.abs(factors.trendMoM) / 100, 1)
      : 0.5; // Neutral if no trend data

    const score = (
      mentionWeight * 0.4 +
      sentimentWeight * 0.3 +
      recencyWeight * 0.2 +
      trendWeight * 0.1
    ) * 100;

    return Math.round(score);
  }

  /**
   * Map semantic topic to ASO keywords
   */
  private mapToASOKeywords(topic: SemanticTopic): {
    keywords: string[];
    relevanceScore: number;
  } {
    const keywords: string[] = [];

    // Extract keywords from verb + noun
    if (topic.verb && topic.noun) {
      keywords.push(`${topic.noun} ${topic.verb}`);
      keywords.push(`${topic.verb} ${topic.noun}`);
    }

    // Extract from context phrase
    const words = topic.contextPhrase.split(' ');
    if (words.length >= 2) {
      keywords.push(words.slice(0, 2).join(' '));
      keywords.push(words.slice(0, 3).join(' '));
    }

    // Extract from raw phrases
    topic.rawPhrases.forEach(phrase => {
      if (phrase.length <= 30 && !keywords.includes(phrase)) {
        keywords.push(phrase);
      }
    });

    // Calculate relevance score
    const relevanceScore = this.calculateASORelevance(topic);

    return {
      keywords: [...new Set(keywords)].slice(0, 5), // Top 5 unique keywords
      relevanceScore
    };
  }
}
```

---

## 🎨 PART 4: UI Redesign

### 4.1 New Dashboard Layout

```
┌────────────────────────────────────────────────────────────┐
│                     COMPETITIVE ANALYSIS                    │
│  [Primary App] vs [Competitor 1, Competitor 2, Competitor 3]│
│  Cache age: 2 hours ago  [Refresh]                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  📊 ENHANCED EXECUTIVE SUMMARY                              │
│  Position: LEADING  |  Rating: 4.7★ vs 4.2★  |  +12%      │
│  AI Insight: "You outperform competitors in plant ID..."   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  📈 BENCHMARK OVERVIEW TABLE                                │
│  Metric         | Your App | Comp Avg | Top Comp | Delta  │
│  Avg Rating     | 4.7★     | 4.2★     | 4.5★     | +12%   │
│  Total Reviews  | 12,453   | 8,234    | 10,122   | +51%   │
│  Pos. Sentiment | 78%      | 65%      | 71%      | +20%   │
│  Issue Rate     | 12%      | 18%      | 15%      | -33%   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🎯 INSIGHTS PANEL (NEW)                                    │
│                                                             │
│  [ASO Insights] [Product Insights] [All Insights]          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 ASO INSIGHT: Plant Identification                 │  │
│  │ Context: "identify plants quickly and accurately"    │  │
│  │ Type: Discovery Language  |  Demand: HIGH            │  │
│  │                                                       │  │
│  │ 📊 Metrics:                                           │  │
│  │   Mentions: 47  |  Sentiment: 85%  |  Trend: ↗ +23% │  │
│  │   Impact Score: 87/100                                │  │
│  │                                                       │  │
│  │ 🎯 ASO Keywords:                                      │  │
│  │   • plant identifier (Relevance: 95%)                 │  │
│  │   • identify plants (Relevance: 92%)                  │  │
│  │   • plant ID app (Relevance: 88%)                     │  │
│  │                                                       │  │
│  │ 💬 Example Reviews:                                   │  │
│  │   "Love how fast it identifies plants!"              │  │
│  │   "Best plant ID app I've tried"                     │  │
│  │                                                       │  │
│  │ ✅ Recommendation:                                    │  │
│  │   Add "plant identifier" to app title               │  │
│  │   Emphasize speed in description                      │  │
│  │                                                       │  │
│  │ [View Full Analysis] [Add to ASO Plan]               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🧠 PRODUCT INSIGHT: Offline Mode                     │  │
│  │ Context: "works offline without internet"            │  │
│  │ Type: Retention Feature  |  Demand: MEDIUM           │  │
│  │                                                       │  │
│  │ 📊 Metrics:                                           │  │
│  │   Mentions: 23  |  Sentiment: 92%  |  Trend: ↗ +15% │  │
│  │   Impact Score: 72/100                                │  │
│  │                                                       │  │
│  │ 💡 Insight:                                           │  │
│  │   Users highly value offline functionality           │  │
│  │   Competitors have this feature                       │  │
│  │                                                       │  │
│  │ ✅ Recommendation:                                    │  │
│  │   Prioritize offline mode in product roadmap         │  │
│  │   Highlight in marketing once implemented            │  │
│  │                                                       │  │
│  │ [View Full Analysis] [Add to Roadmap]                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  📊 TREND CHARTS (NEW)                                      │
│                                                             │
│  [Topic Trends] [Sentiment Over Time] [Volume Comparison]  │
│                                                             │
│  Plant Identification                                       │
│  Mentions │   ●                                             │
│     50    │  ●                                              │
│     40    │ ●     ●                                         │
│     30    │●         ●                                      │
│     20    │             ●                                   │
│           └────────────────────────                         │
│            Week 1  2  3  4  5  6                           │
│                                                             │
│  Trend: ↗ +23% MoM  |  Projected: 60 mentions next month  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🗺️ GAP HEATMAP (NEW)                                       │
│                                                             │
│  Feature              │ You │ Comp1 │ Comp2 │ Comp3 │ Gap  │
│  Plant Identification │ ✓   │  ✓    │  ✓    │  ✓    │ ─    │
│  Offline Mode         │ ✗   │  ✓    │  ✓    │  ✗    │ ⚠    │
│  Widget Support       │ ✗   │  ✗    │  ✓    │  ✓    │ ⚠⚠   │
│  Care Reminders       │ ✓   │  ✓    │  ✗    │  ✓    │ ─    │
│                                                             │
│  Legend: ✓ Has  ✗ Missing  ─ No Gap  ⚠ Opportunity        │
└────────────────────────────────────────────────────────────┘
```

---

### 4.2 New UI Components

#### Component: `SemanticInsightCard.tsx`

```typescript
interface SemanticInsightCardProps {
  insight: EnrichedInsight;
  onViewDetails: () => void;
  onAddToASOPlan?: () => void;
  onAddToRoadmap?: () => void;
}

export const SemanticInsightCard: React.FC<SemanticInsightCardProps> = ({
  insight,
  onViewDetails,
  onAddToASOPlan,
  onAddToRoadmap
}) => {
  const isASO = insight.classification.type === 'aso' || insight.classification.type === 'both';
  const isProduct = insight.classification.type === 'product' || insight.classification.type === 'both';

  return (
    <Card className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {isASO && <Badge variant="default">🔍 ASO</Badge>}
          {isProduct && <Badge variant="secondary">🧠 Product</Badge>}
          <h4 className="font-semibold text-lg">{insight.topic.displayName}</h4>
        </div>
        <Badge variant={
          insight.demandLevel === 'critical' ? 'destructive' :
          insight.demandLevel === 'high' ? 'default' :
          insight.demandLevel === 'medium' ? 'secondary' : 'outline'
        }>
          {insight.demandLevel.toUpperCase()} DEMAND
        </Badge>
      </div>

      {/* Context Phrase */}
      <div className="text-sm text-muted-foreground">
        Context: "{insight.topic.contextPhrase}"
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Mentions</div>
          <div className="text-2xl font-bold">{insight.mentionCount}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Sentiment</div>
          <div className="text-2xl font-bold">
            {(insight.sentimentPositivePct).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Trend</div>
          <div className="text-2xl font-bold flex items-center gap-1">
            {insight.trendDirection === 'rising' && <TrendingUp className="h-5 w-5 text-green-500" />}
            {insight.trendMoM !== null && `${insight.trendMoM > 0 ? '+' : ''}${insight.trendMoM}%`}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Impact Score</div>
          <div className="text-2xl font-bold">{insight.impactScore}/100</div>
        </div>
      </div>

      {/* ASO Keywords (if ASO-relevant) */}
      {isASO && insight.asoKeywords.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">🎯 ASO Keywords:</div>
          <div className="flex flex-wrap gap-2">
            {insight.asoKeywords.map((keyword, idx) => (
              <Badge key={idx} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Example Reviews */}
      <div>
        <div className="text-sm font-medium mb-2">💬 Example Reviews:</div>
        <div className="space-y-2">
          {insight.examples.slice(0, 2).map((example, idx) => (
            <div key={idx} className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
              "{example.text.substring(0, 100)}..."
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={onViewDetails}>
          View Full Analysis
        </Button>
        {isASO && onAddToASOPlan && (
          <Button size="sm" onClick={onAddToASOPlan}>
            Add to ASO Plan
          </Button>
        )}
        {isProduct && onAddToRoadmap && (
          <Button size="sm" onClick={onAddToRoadmap}>
            Add to Roadmap
          </Button>
        )}
      </div>
    </Card>
  );
};
```

---

## 📋 PART 5: Implementation Roadmap

### Phase 1: Database Foundation (Week 1)
- [ ] Create `semantic_insights` table migration
- [ ] Create `insight_examples` table migration
- [ ] Create `insight_trends` table migration
- [ ] Create `aso_keyword_mapping` table migration
- [ ] Create `insight_classifications` table migration
- [ ] Deploy migrations to production
- [ ] Verify schema with test queries

### Phase 2: NLP Engine (Week 2-3)
- [ ] Build `SemanticExtractionEngine` class
  - [ ] Implement noun-verb pair extraction
  - [ ] Implement semantic clustering
  - [ ] Implement context phrase extraction
- [ ] Build `InsightClassificationEngine` class
  - [ ] Implement ASO/Product classification rules
  - [ ] Add category-specific logic
  - [ ] Add confidence scoring
- [ ] Build `InsightEnrichmentEngine` class
  - [ ] Implement impact score calculation
  - [ ] Implement trend detection
  - [ ] Implement ASO keyword mapping
- [ ] Unit tests for all engines

### Phase 3: Service Layer Integration (Week 4)
- [ ] Create `semantic-insight.service.ts`
  - [ ] Methods to save insights to database
  - [ ] Methods to query insights by type/category
  - [ ] Methods to fetch trend data
- [ ] Update `competitor-review-intelligence.service.ts`
  - [ ] Call new NLP engines instead of old extraction
  - [ ] Save results to new tables
  - [ ] Return enriched insights
- [ ] Update `useCompetitorComparison` hook
  - [ ] Fetch semantic insights after analysis
  - [ ] Display loading states
- [ ] Integration tests

### Phase 4: UI Components (Week 5)
- [ ] Build `SemanticInsightCard.tsx`
- [ ] Build `InsightsPanel.tsx` with ASO/Product tabs
- [ ] Build `TrendChart.tsx` for MoM trends
- [ ] Build `GapHeatmap.tsx` for feature comparison
- [ ] Build `ASOKeywordMapper.tsx` for keyword linking
- [ ] Update `CompetitorComparisonView.tsx` to use new components

### Phase 5: Testing & Refinement (Week 6)
- [ ] End-to-end testing with real app data
- [ ] Accuracy validation: Manual review of extracted insights
- [ ] Performance testing: Query optimization
- [ ] UI/UX testing with users
- [ ] Bug fixes and refinements

### Phase 6: Documentation & Rollout (Week 7)
- [ ] API documentation
- [ ] User guide for new insights
- [ ] Migration guide for existing data
- [ ] Feature announcement
- [ ] Monitor production usage

---

## 🎯 Success Metrics

### Accuracy Metrics
- **Semantic Extraction Accuracy**: >85% of extracted topics are meaningful and contextually correct
- **Classification Accuracy**: >90% of ASO/Product classifications are correct (validated manually)
- **ASO Keyword Relevance**: >80% of mapped ASO keywords are actually used in competitor metadata

### Performance Metrics
- **Analysis Time**: <60 seconds for full analysis (primary + 3 competitors, 500 reviews each)
- **Database Query Time**: <200ms for insight queries
- **Cache Hit Rate**: >70% of analyses served from cache

### User Impact Metrics
- **Insight Actioned**: Track how many insights are added to ASO plans or product roadmaps
- **Conversion Rate**: % of insights that lead to actual ASO changes or product features
- **User Satisfaction**: Survey ratings for usefulness of new insights (target: 4.5/5)

---

## 🔚 Conclusion

This redesign transforms the Competitive Intelligence system from a **simple keyword counter** into a **semantic intelligence platform** that:

1. **Extracts contextualized insights** using noun-verb pairs and clustering
2. **Classifies insights** as ASO-relevant (discovery language) or Product-relevant (UX/retention)
3. **Enriches every insight** with sentiment, trends, impact scores, and examples
4. **Maps ASO insights** to actual keyword opportunities
5. **Provides a modular pipeline** that can scale across categories and languages
6. **Delivers actionable recommendations** with clear next steps

The new system will enable ASO teams to:
- **Identify keyword opportunities** from user language patterns
- **Prioritize product features** based on demand and impact
- **Track competitive trends** over time
- **Make data-driven decisions** with confidence

---

**Next Steps**: Review this blueprint, get stakeholder approval, and begin Phase 1 implementation.
