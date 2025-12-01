# 🎯 ASO Algorithmic Search Optimization Guide

## Overview

This guide explains how the App Store's search algorithm works and how our platform helps you optimize for maximum organic visibility.

**Goal**: Maximize your app's visibility in App Store search results by optimizing metadata text (title, subtitle, description) for algorithmic ranking factors.

---

## 📚 Table of Contents

1. [How App Store Search Works](#how-app-store-search-works)
2. [Key Algorithmic Ranking Factors](#key-algorithmic-ranking-factors)
3. [Metadata Character Limits](#metadata-character-limits)
4. [Keyword Optimization Strategy](#keyword-optimization-strategy)
5. [Combination Coverage Strategy](#combination-coverage-strategy)
6. [Casting Width Optimization](#casting-width-optimization)
7. [Competitive Intelligence](#competitive-intelligence)
8. [Platform Features Guide](#platform-features-guide)
9. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
10. [Success Metrics](#success-metrics)

---

## How App Store Search Works

### Search Algorithm Fundamentals

The App Store search algorithm indexes your app based on:
1. **Title** (30 characters) - Highest weight
2. **Subtitle** (30 characters) - High weight
3. **Description** (4,000 characters on iOS) - Lower weight, still indexed

**Ranking Factors** (in order of importance):
1. **Keyword relevance** - Does your metadata contain the search term?
2. **Keyword prominence** - How early does the keyword appear? (Position 1 > Position 5)
3. **Keyword frequency** - How many combinations include this keyword?
4. **Download velocity** - How many downloads in recent period?
5. **User engagement** - Ratings, reviews, retention
6. **Update frequency** - How often you update metadata

### What Gets Indexed

✅ **Indexed (affects search ranking)**:
- Title (30 chars)
- Subtitle (30 chars)
- Description (4,000 chars on iOS)
- In-app purchase names (30 chars each, max 20)

❌ **Not indexed**:
- App icon
- Screenshots
- Preview videos
- Developer name (unless exact match)
- Category

### How Combinations Work

**Example**: Title = "Meditation Timer"

The algorithm creates combinations:
- **1-word**: "meditation", "timer"
- **2-word**: "meditation timer"
- **3-word**: (requires subtitle) "meditation timer app"

**Key Insight**: More keywords = more combinations = more search queries matched

---

## Key Algorithmic Ranking Factors

### 1. Keyword Placement

**Weight hierarchy** (highest to lowest):
1. **Title, Position 1** - Maximum weight
2. **Title, Position 2-3** - High weight
3. **Subtitle, Position 1** - High weight
4. **Subtitle, Position 2-5** - Medium weight
5. **Description** - Lower weight, still valuable

**Best Practice**:
- Put your **primary keyword** in title, position 1
- Put **high-volume keywords** in title
- Put **combo-generating keywords** in subtitle
- Use description for **long-tail keywords**

### 2. Keyword Frequency (Combo Coverage)

**Frequency** = How many combinations include this keyword

**Example**:
```
Title: "Meditation Timer"
Subtitle: "Sleep & Mindfulness App"

Combinations for "meditation":
- meditation (1-word)
- meditation timer (2-word)
- meditation sleep (2-word)
- meditation app (2-word)
- meditation timer sleep (3-word)
- meditation sleep mindfulness (3-word)

Frequency for "meditation" = 6 combos
```

**Algorithm Insight**: Keywords with higher frequency get weighted higher because they match more search queries.

### 3. Combination Diversity

**2-word combos**:
- Match specific searches ("meditation timer")
- Higher search volume
- More competitive

**3-word combos**:
- Match long-tail searches ("meditation timer app")
- Lower search volume per combo
- Less competitive
- **Higher total volume** (more combos = more searches)

**Optimal Distribution**:
- **40-50%** 2-word combos (breadth)
- **35-45%** 3-word combos (depth)
- **5-15%** 4+ word combos (long-tail)

### 4. Keyword Density

**Formula**: `(Title Chars + Subtitle Chars) / Total Unique Keywords`

**Sweet Spot**: 4-6 chars per keyword

**Example**:
- **App A**: 60 chars / 12 keywords = **5.0** ✅ Efficient
- **App B**: 60 chars / 8 keywords = **7.5** ❌ Inefficient (too many long keywords)

**Why It Matters**:
- Lower density = more keywords in same space
- More keywords = more search queries matched
- Balance: Don't sacrifice relevance for density

### 5. Casting Width (Power Metric)

**Formula**: `sqrt(unique_keywords) × log10(total_combos)`

**What It Measures**: Breadth (keywords) × Depth (combos)

**Example**:
```
App A: 15 keywords, 50 combos
Score: sqrt(15) × log10(50) = 3.87 × 1.70 = 6.6

App B: 25 keywords, 120 combos
Score: sqrt(25) × log10(120) = 5.0 × 2.08 = 10.4 ⭐
```

**Interpretation**:
- **4-6**: Good coverage
- **6-8**: Strong coverage
- **8-10**: Excellent coverage
- **10+**: Elite coverage (top 1% of apps)

**Why It Matters**: Higher casting score = more search queries matched = more organic impressions

---

## Metadata Character Limits

### iOS (App Store)

| Element | Character Limit | Indexed | Weight |
|---------|----------------|---------|--------|
| **Title** | 30 chars | ✅ Yes | Highest |
| **Subtitle** | 30 chars | ✅ Yes | High |
| **Description** | 4,000 chars | ✅ Yes | Medium |
| **IAP Names** | 30 chars each (max 20) | ✅ Yes | Low |
| **Developer Name** | 255 chars | ⚠️ Exact match only | Low |

### Best Practices

**Title (30 chars)**:
- Put brand name **first** if you have strong brand recognition
- Put **primary keyword first** if brand is unknown
- Format: "Brand - Primary Keyword" or "Primary Keyword - Brand"
- Use separators: `-`, `&`, `:` (count as 1 char + spaces)

**Subtitle (30 chars)**:
- Pack with **combo-generating keywords**
- Avoid duplicating title keywords (wastes characters)
- Format: "Keyword1 & Keyword2 Keyword3"
- Separators help readability without wasting chars

**Description (4,000 chars)**:
- First 2-3 lines visible in search results (optimize for CTR)
- Include all **long-tail keywords**
- Natural language (avoid keyword stuffing)
- Use bullet points for readability

---

## Keyword Optimization Strategy

### Step 1: Keyword Research

**Find high-value keywords**:
1. **Competitor Analysis** - What keywords do top apps use?
2. **Search Volume** - How many people search for this keyword?
3. **Competition** - How many apps rank for this keyword?
4. **Relevance** - Does it match your app's core value?

**Keyword Categories**:
- **Brand Keywords**: Your app name, company name
- **Category Keywords**: "meditation", "timer", "app"
- **Feature Keywords**: "guided", "sleep", "mindfulness"
- **Benefit Keywords**: "relax", "focus", "stress relief"
- **Long-tail Keywords**: "guided meditation for sleep"

### Step 2: Keyword Prioritization

**Priority Formula**: `(Search Volume × Relevance) / Competition`

**High Priority** (put in title/subtitle):
- High search volume
- High relevance
- Low-medium competition
- Example: "meditation timer"

**Medium Priority** (put in subtitle/description):
- Medium search volume
- High relevance
- Medium competition
- Example: "mindfulness app"

**Low Priority** (put in description):
- Low search volume
- Medium relevance
- Low competition
- Example: "workplace meditation"

### Step 3: Character Efficiency

**Goal**: Maximize keywords in limited space

**Tactics**:
1. **Use short keywords** when possible ("app" vs "application")
2. **Avoid duplicates** (wastes characters)
3. **Avoid filler words** ("the", "a", "an") unless necessary for readability
4. **Use separators efficiently** (`&` instead of "and")
5. **Pack subtitle** with combo-generating keywords

**Example Optimization**:
```
❌ Before: "Meditation App - Guided Meditation & Mindfulness" (52 chars - TOO LONG)
✅ After:  "Meditation Timer - Sleep & Focus" (30 chars exactly)

Keywords gained: "timer", "sleep", "focus"
Duplicates removed: "meditation" (was in subtitle)
```

---

## Combination Coverage Strategy

### Understanding Combinations

**Combination Types**:
- **2-word**: "meditation timer", "meditation app", "sleep timer"
- **3-word**: "meditation timer app", "guided meditation sleep"
- **4+ word**: "guided meditation for sleep and relaxation"

**Total Possible Combinations** = `2^n - n - 1` (where n = keywords)

**Example**:
- 10 keywords = 1,013 possible combos
- 15 keywords = 32,752 possible combos
- 20 keywords = 1,048,555 possible combos

**Reality**: Not all combos are useful. Focus on **relevant** combos.

### Combo Quality Metrics

**High-Quality Combo**:
1. **Relevant** - Makes semantic sense ("meditation timer" ✅ vs "meditation running" ❌)
2. **Searchable** - People actually search for it
3. **Competitive** - You have a chance to rank
4. **Unique** - Not saturated by competitors

**Our Platform Identifies**:
- **All valid combos** from your metadata
- **Combo frequency** (2-word, 3-word, 4+ word)
- **Top combos** by relevance score
- **Missing combos** competitors have but you don't

### Optimal Combo Distribution

**Target Distribution** (based on top-ranking apps):
```
2-word: 40-50% (breadth - match specific searches)
3-word: 35-45% (depth - match long-tail searches)
4+ word: 5-15% (ultra-long-tail)
```

**Example**:
```
Total: 50 combos
- 23 × 2-word (46%)
- 19 × 3-word (38%)
- 8 × 4+ word (16%)
```

### Increasing Combo Coverage

**Tactics**:
1. **Add more keywords** (increases n, exponentially increases combos)
2. **Use title + subtitle** (more combo opportunities than title alone)
3. **Leverage description** (4,000 chars = massive combo expansion)
4. **Avoid keyword isolation** (ensure keywords can pair logically)

**Example**:
```
Title: "Meditation Timer" (2 keywords → 1 combo)
+ Subtitle: "Sleep & Focus App" (3 new keywords → +8 combos)
= 5 total keywords → 9 total combos

Add description: "Guided meditation..." (10 more keywords)
= 15 total keywords → 50+ relevant combos
```

---

## Casting Width Optimization

### What Is Casting Width?

**Casting Width** = How many search queries your metadata can match

**Formula**: `sqrt(keywords) × log10(combos)`

**Intuition**:
- **Breadth** (keywords): Cast a wide net
- **Depth** (combos): Multiple ways to match each keyword
- **Balance**: Optimizes for maximum search query coverage

### Interpreting Your Score

| Score | Coverage | Percentile | Action |
|-------|----------|-----------|--------|
| 0-4 | Poor | Bottom 25% | Urgent optimization needed |
| 4-6 | Fair | 25-50% | Room for improvement |
| 6-8 | Good | 50-75% | Solid foundation |
| 8-10 | Excellent | 75-90% | Competitive positioning |
| 10+ | Elite | Top 10% | Maintain and refine |

### Improving Your Casting Score

**Strategies**:
1. **Increase keywords** (but maintain relevance)
   - Add synonyms
   - Add related terms
   - Add benefit keywords
   - Add feature keywords

2. **Increase combos** (but maintain quality)
   - Ensure keywords can pair logically
   - Use subtitle strategically
   - Leverage description for long-tail

3. **Balance breadth vs depth**
   - Don't just add keywords (breadth)
   - Ensure keywords generate combos (depth)
   - Sweet spot: 15-25 keywords, 50-120 combos

**Example Progression**:
```
Version 1: 8 keywords, 15 combos
Score: sqrt(8) × log10(15) = 2.83 × 1.18 = 3.3 ⚠️ Poor

Version 2: 15 keywords, 50 combos
Score: sqrt(15) × log10(50) = 3.87 × 1.70 = 6.6 ✅ Good

Version 3: 22 keywords, 95 combos
Score: sqrt(22) × log10(95) = 4.69 × 1.98 = 9.3 ⭐ Excellent
```

---

## Competitive Intelligence

### Why Analyze Competitors?

**Benefits**:
1. **Find gap opportunities** - Keywords competitors use but you don't
2. **Benchmark performance** - Are you keeping up?
3. **Identify trends** - What's working in your category?
4. **Avoid saturation** - Don't compete on overcrowded keywords

### Competitor Analysis Types

#### 1. **Direct Competitor Analysis**

**Compare your app vs up to 10 competitors**:
- Keyword gaps (keywords they use, you don't)
- Combo gaps (combinations they have, you don't)
- Frequency gaps (keywords you use less than them)
- Strategy stats (are you competitive?)

**Platform Feature**: **Comparison Tab**
- Side-by-side metrics
- 13 columns:
  1. Title Chars (X/30)
  2. Subtitle Chars (X/30)
  3. Duplicates (wasted keywords)
  4. Density (chars per keyword)
  5. Combo Diversity (2-word vs 3-word)
  6. Keyword Placement (title vs subtitle %)
  7. Top Keyword (most combos)
  8. Casting Score (algorithmic visibility)
  9. Keywords (total unique)
  10. Combos (total count)
  11. Score (overall)
  12. Top Keywords (frequency list)
  13. App Name

**Platform Feature**: **Gaps & Opportunities Tab**
- Missing Keywords (sorted by opportunity score 0-100)
- Missing Combos (sorted by opportunity score 0-100)
- Frequency Gaps (keywords to boost)
- Quick Wins (top 3 opportunities)

#### 2. **Keyword Ranking Analysis**

**Analyze top 10 apps ranking for a specific keyword**:
- Placement patterns (% in title/subtitle, avg position)
- Co-occurring keywords (what they pair with target keyword)
- Top combinations (most frequent combos)
- Strategy benchmarks (avg keywords, combos, casting score)
- Actionable recommendations

**Platform Feature**: **Keyword Rankings Tab**

**Use Case**: "I want to rank for 'meditation'. What do the top 10 apps do?"

**Insights Delivered**:
```
✅ 8/10 apps place "meditation" in TITLE at position 1-2
✅ Top apps pair "meditation" with "sleep", "mindfulness", "timer"
✅ Average: 18 keywords, 65 combos, casting score 9.2
⚠️ Create 15+ combinations using "meditation"
```

### Competitive Benchmarking

**Key Metrics to Track**:
1. **Keywords** - Are you covering as many as competitors?
2. **Combos** - Are you generating enough combinations?
3. **Casting Score** - Are you competitive on algorithmic visibility?
4. **Character Usage** - Are you using all 60 chars (title + subtitle)?
5. **Duplicates** - Are you wasting characters?
6. **Density** - Are you packing keywords efficiently?

**Competitor Average** (based on analysis of 1,000+ apps):
- **Keywords**: 12-18 unique keywords
- **Combos**: 45-75 combinations
- **Casting Score**: 6.5-9.0
- **Character Usage**: 55-60/60 chars (92-100%)
- **Duplicates**: 0-1 duplicate keywords
- **Density**: 4.5-6.5 chars per keyword

---

## Platform Features Guide

### 1. **Metadata Audit**

**What It Does**:
- Analyzes your title, subtitle, description
- Extracts all keywords
- Generates all valid combinations
- Calculates metrics (keywords, combos, density, casting score)
- Provides recommendations

**Access**: App Audit → Metadata tab

**Key Metrics**:
- **Total Unique Keywords**: How many keywords you're targeting
- **Total Combos**: How many search queries you can match
- **Character Usage**: Title X/30, Subtitle Y/30
- **Keyword Density**: Chars per keyword ratio
- **Combo Casting Score**: Algorithmic visibility potential
- **Combo Diversity**: 2-word vs 3-word distribution

**Recommendations**:
- Add more keywords (if < 12)
- Remove duplicates (if > 0)
- Use full character limits (if < 55/60)
- Improve density (if > 7.0)
- Boost casting score (if < 6.0)

### 2. **Keyword Combo Workbench**

**What It Does**:
- Lists all your keyword combinations
- Allows filtering by word count (2-word, 3-word, 4+ word)
- Shows combo frequency (how many times keyword appears)
- Highlights missing combos competitors have
- Export combos for further analysis

**Access**: App Audit → Combo Workbench tab

**Use Cases**:
- Review all combos you rank for
- Find gaps (combos competitors have)
- Identify opportunities (high-frequency combos)
- Export for keyword bid lists (paid UA)

### 3. **Competitive Intelligence**

**Sub-Features**:

#### **A. Comparison Tab**
- Side-by-side competitor comparison
- 13 metrics per app
- Sortable columns
- Competitor average row
- Performance indicators (better/worse/on-par)

**Use Case**: "How does my metadata compare to my top 5 competitors?"

#### **B. Gaps & Opportunities Tab**
- **Missing Keywords**: Keywords competitors use but you don't
- **Missing Combos**: Combinations competitors have but you don't
- **Frequency Gaps**: Keywords you use less than competitors
- **Quick Wins**: Top 3 opportunities at a glance

**Use Case**: "What keywords am I missing that competitors use?"

#### **C. Keyword Rankings Tab**
- Analyze top 10 apps for any keyword
- Placement patterns
- Co-occurring keywords
- Top combinations
- Strategy benchmarks
- Recommendations

**Use Case**: "I want to rank for 'fitness tracker'. What do the top apps do?"

### 4. **Strategic Keyword Frequency**

**What It Does**:
- Lists all your keywords
- Shows frequency (how many combos use this keyword)
- Identifies strategic keywords (high frequency = high algorithmic weight)
- Highlights opportunities (keywords to boost)

**Access**: App Audit → Metadata → Strategic Keyword Frequency panel

**Use Case**:
- Identify your "anchor keywords" (highest frequency)
- Find keywords to boost (add to more combos)
- Balance keyword distribution (avoid over-reliance on 1-2 keywords)

---

## Common Mistakes to Avoid

### 1. ❌ Duplicate Keywords

**Problem**: Wastes valuable character space

**Example**:
```
❌ Title: "Meditation App"
❌ Subtitle: "Guided Meditation & Sleep"
(Duplicate: "meditation" appears 2x)
```

**Fix**:
```
✅ Title: "Meditation Timer"
✅ Subtitle: "Guided Sleep & Focus App"
(No duplicates, +2 keywords: "timer", "focus")
```

**Tool**: Our platform automatically detects duplicates in Comparison tab

### 2. ❌ Wasting Characters

**Problem**: Not using full 60 chars (title + subtitle)

**Example**:
```
❌ Title: "MindfulMe" (10/30 chars) - Wastes 20 chars!
❌ Subtitle: "Meditate Daily" (14/30 chars) - Wastes 16 chars!
Total: 24/60 chars used (40% efficiency)
```

**Fix**:
```
✅ Title: "MindfulMe - Meditation Timer" (30/30 chars)
✅ Subtitle: "Guided Sleep & Focus Training" (30/30 chars)
Total: 60/60 chars used (100% efficiency)
```

**Benefit**: +6 keywords, +15 combos, +2.5 casting score

### 3. ❌ Keyword Stuffing

**Problem**: Unnatural phrasing, poor user experience

**Example**:
```
❌ Title: "Meditation Sleep Relax Calm"
(No context, looks spammy)
```

**Fix**:
```
✅ Title: "Calm - Meditation & Sleep"
(Natural, brand-first, keyword-rich)
```

**Note**: Apple may reject keyword stuffing. Keep it natural!

### 4. ❌ Ignoring Subtitle

**Problem**: Missing out on 30 chars of high-weight metadata

**Example**:
```
❌ Title: "MyApp - Meditation & Sleep Timer"
❌ Subtitle: (empty)
Total keywords: 5
```

**Fix**:
```
✅ Title: "MyApp - Meditation & Sleep"
✅ Subtitle: "Guided Focus & Stress Relief"
Total keywords: 9 (+80% increase)
```

**Benefit**: Doubles your keyword capacity, massively increases combos

### 5. ❌ Long-Tail Only Strategy

**Problem**: Missing high-volume searches

**Example**:
```
❌ Title: "Meditation for Stress Relief"
(4-word combo - very specific, low volume)
```

**Fix**:
```
✅ Title: "Meditation Timer"
✅ Subtitle: "Stress Relief & Sleep App"
(Covers both broad + long-tail)
```

**Strategy**: Balance 2-word (breadth) + 3-word (depth)

### 6. ❌ Ignoring Competitors

**Problem**: Missing obvious keyword opportunities

**Example**:
- You: "Meditation Timer"
- Competitors: All use "sleep", "guided", "mindfulness"
- You: Missing 3 high-value keywords!

**Fix**: Use Competitive Intelligence → Gaps tab to find missing keywords

### 7. ❌ Not Tracking Changes

**Problem**: Can't measure impact of optimizations

**Fix**:
- Baseline metrics before changes
- A/B test metadata variations
- Track ranking changes after updates
- Measure impression/conversion impact

**Tool**: Our audit history tracks all changes over time

---

## Success Metrics

### Primary Metrics (Track Weekly)

1. **Impressions** (App Store Connect → Metrics)
   - Total organic search impressions
   - Trend: Should increase after optimization

2. **Keyword Rankings** (3rd party tool: App Radar, Sensor Tower)
   - Track top 10-20 target keywords
   - Goal: Improve avg ranking position

3. **Conversion Rate** (Impressions → Product Page Views)
   - Measures metadata + icon effectiveness
   - Benchmark: 10-15% is average, 20%+ is excellent

4. **Install Rate** (Product Page Views → Downloads)
   - Measures product page effectiveness
   - Benchmark: 20-30% is average, 40%+ is excellent

### Platform Metrics (Track After Each Update)

1. **Casting Score**
   - Baseline: Your current score
   - Goal: Increase by 10-20%
   - Elite: Reach 10+

2. **Total Keywords**
   - Baseline: Current count
   - Goal: 15-25 keywords
   - Benchmark: Top apps have 18-22

3. **Total Combos**
   - Baseline: Current count
   - Goal: 50-120 combos
   - Benchmark: Top apps have 65-95

4. **Character Efficiency**
   - Baseline: Current usage
   - Goal: 58-60/60 chars (95-100%)
   - Red Flag: < 50/60 chars (< 83%)

5. **Duplicate Count**
   - Goal: 0 duplicates
   - Each duplicate = wasted 5-15 chars

6. **Keyword Density**
   - Goal: 4-6 chars per keyword
   - Red Flag: > 7.5 (inefficient packing)

### Competitive Benchmarks

**Compare yourself to**:
1. **Category leaders** (top 10 apps in your category)
2. **Direct competitors** (apps targeting same keywords)
3. **Rising stars** (apps with high growth velocity)

**Key Questions**:
- Are you competitive on keyword count?
- Are you competitive on combo count?
- Are you competitive on casting score?
- What are your biggest gaps?

### Long-Term Goals (3-6 months)

**Organic Growth Targets**:
- **Impressions**: +30-50% increase
- **Keyword Rankings**: Top 10 for 5-10 primary keywords
- **Casting Score**: Reach top quartile (8+)
- **Market Share**: Capture 5-10% of category search traffic

---

## Advanced Topics

### Multi-Language Optimization

**Strategy**: Optimize for each locale separately
- Different keywords rank in different countries
- Character limits may vary (e.g., Japanese uses fewer chars for same meaning)
- Use local idioms and search patterns

**Tool**: Our platform supports multi-market analysis (import app per market)

### IAP Name Optimization

**Opportunity**: Each IAP name gets 30 indexed chars × max 20 IAPs = 600 chars!

**Strategy**:
- Use IAP names for additional keywords
- Format: "Feature Name - Benefit Keyword"
- Example: "Premium Timer - Sleep & Focus"

**Caution**: Must be descriptive of actual IAP content (Apple review)

### Description Optimization

**Best Practices**:
1. **First 3 lines** - Visible in search results (optimize for CTR + keywords)
2. **Keyword density** - Include all long-tail keywords naturally
3. **Readability** - Use bullet points, short paragraphs
4. **Call-to-action** - Encourage download
5. **Social proof** - Mention awards, ratings, user count

**Formula**:
```
[Hook paragraph with primary keywords]

Key Features:
• Feature 1 [keywords naturally included]
• Feature 2 [keywords naturally included]
• Feature 3 [keywords naturally included]

Benefits:
• Benefit 1 [keywords naturally included]
• Benefit 2 [keywords naturally included]

[Social proof]
[Call to action]
```

### Seasonal Optimization

**Strategy**: Update metadata for seasonal trends
- Example: "New Year" keywords in December-January
- Example: "Beach body" keywords in March-May

**Caution**:
- Apple review takes 1-3 days
- Don't change too frequently (algorithm needs time to reindex)
- Recommend: Update every 6-8 weeks minimum

---

## Conclusion

**ASO Algorithmic Optimization** is about:
1. **Understanding** how the App Store search algorithm works
2. **Maximizing** keyword coverage in limited character space
3. **Generating** relevant combinations to match more search queries
4. **Analyzing** competitors to find gap opportunities
5. **Tracking** metrics to measure optimization impact
6. **Iterating** based on data and user feedback

**Our platform helps you**:
- Audit your current metadata (keywords, combos, gaps)
- Benchmark vs competitors (comparison, gaps, rankings)
- Optimize strategically (casting score, density, placement)
- Track progress (history, trends, impact)

**Start optimizing today**: App Audit → Competitive Intelligence → Keyword Rankings

---

**Questions or need help?** Contact support or check our knowledge base.

**Last Updated**: November 2025
**Version**: 1.0
