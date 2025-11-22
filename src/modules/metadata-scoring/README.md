# Metadata Scoring Module

**Pure TypeScript metadata scoring engine for app title and subtitle analysis.**

## Overview

This module provides deterministic, registry-driven scoring for App Store metadata (title + subtitle). It analyzes:

- **Character usage efficiency** (how well you use the 30-char limit)
- **Keyword density** (unique, meaningful tokens)
- **Keyword combinations** (n-grams for search coverage)
- **Semantic quality** (value propositions, trust signals, filler detection)
- **Incremental value** (subtitle adds new info vs title)

**Design Principles:**
- Pure TypeScript (no AI calls, no async operations)
- Configuration in JSON registry files (easy to tune without code changes)
- Fully reusable across features (ASO AI Hub, Metadata Copilot, competitor analysis)
- Zero dependencies on BigQuery, Edge Functions, or external adapters

## Architecture

```
src/modules/metadata-scoring/
├── registry/                    # JSON configuration files
│   ├── metadata_scoring.json    # Weights, thresholds, max chars
│   ├── stopwords.json           # Filler words to filter
│   └── semantic_rules.json      # Positive/negative patterns
├── types.ts                     # TypeScript interfaces
├── utils/                       # Pure utility functions
│   ├── tokenizer.ts             # Token analysis
│   ├── ngram.ts                 # Combination generation
│   └── semantic.ts              # Pattern matching
├── services/                    # Scoring services
│   ├── configLoader.ts          # Load JSON configs
│   ├── titleScoringService.ts   # Title scoring
│   ├── subtitleScoringService.ts # Subtitle scoring
│   └── combinedMetadataScore.ts # Combined weighted score
├── index.ts                     # Public API exports
└── README.md                    # This file
```

## Usage

### Basic Usage (Combined Score)

```typescript
import { scoreMetadata } from '@/modules/metadata-scoring';

const result = scoreMetadata(
  'Instagram', // title
  'Create & share photos, videos, reels & more' // subtitle
);

console.log(result.metadataScore); // 85
console.log(result.title.score); // 78
console.log(result.subtitle.score); // 92
console.log(result.subtitle.breakdown.newTokens); // ['create', 'share', 'photos', 'videos', 'reels']
```

### Individual Scoring

```typescript
import { scoreTitle, scoreSubtitle } from '@/modules/metadata-scoring';

const titleResult = scoreTitle('Instagram');
const subtitleResult = scoreSubtitle('Instagram', 'Create & share photos, videos, reels & more');
```

### Type-Safe Results

```typescript
import type { CombinedMetadataScoreResult } from '@/modules/metadata-scoring';

const result: CombinedMetadataScoreResult = scoreMetadata(title, subtitle);

// Access detailed breakdowns
result.title.breakdown.fillerTokens; // string[]
result.title.breakdown.duplicates; // string[]
result.title.breakdown.combos; // string[]
result.subtitle.breakdown.newTokens; // string[] (unique to subtitle)
result.subtitle.breakdown.newCombos; // string[] (unique to subtitle)
```

## Configuration

### `metadata_scoring.json`

Controls weights and thresholds:

```json
{
  "title": {
    "weight_in_metadata_score": 0.7,
    "character_usage_weight": 0.2,
    "unique_keyword_weight": 0.2,
    "combination_coverage_weight": 0.4,
    "semantic_quality_weight": 0.1,
    "duplication_penalty_weight": 0.1,
    "max_chars": 30
  },
  "subtitle": { ... }
}
```

### `stopwords.json`

Defines filler words (stopwords) to filter out:

```json
{
  "stopwords": ["a", "an", "and", "the", "for", "with", ...]
}
```

### `semantic_rules.json`

Defines positive/negative patterns:

```json
{
  "positive_patterns": [
    {
      "pattern": "^(free|unlimited|pro|premium|official)$",
      "bonus": 2,
      "reason": "Value proposition indicator"
    }
  ],
  "negative_patterns": [
    {
      "pattern": "^(app|application|mobile|software)$",
      "penalty": 2,
      "reason": "Generic filler"
    }
  ]
}
```

## Scoring Logic

### Title Score (0-100)

1. **Character Usage** (20%): How efficiently you use 30 chars
2. **Unique Keywords** (20%): Number of meaningful tokens
3. **Combination Coverage** (40%): Number of 2-3 word combos
4. **Semantic Quality** (10%): Pattern-based bonuses/penalties
5. **Duplication Penalty** (10%): Penalty for repeated tokens/fillers

### Subtitle Score (0-100)

1. **Character Usage** (15%): How efficiently you use 30 chars
2. **Incremental Value** (50%): New tokens/combos vs title (KEY METRIC)
3. **Combination Coverage** (20%): Number of 2-3 word combos
4. **Semantic Quality** (10%): Pattern-based bonuses/penalties
5. **Duplication Penalty** (5%): Penalty for repeated tokens/fillers

### Combined Metadata Score (0-100)

```
Metadata Score = (Title Score × 0.7) + (Subtitle Score × 0.3)
```

## Examples

### High Score Example

```typescript
scoreMetadata(
  'Duolingo - Language Lessons',
  'Learn Spanish, French, German'
);
// metadataScore: 92
// - Title: High keyword density, good combos
// - Subtitle: 100% new tokens, specific languages
```

### Low Score Example

```typescript
scoreMetadata(
  'My App',
  'The Best App for You'
);
// metadataScore: 35
// - Title: Too short, generic
// - Subtitle: All stopwords, no incremental value
```

## Integration Points

### ASO AI Hub (Current)

New `MetadataScoringPanel` component displays:
- Combined metadata score
- Title score card with breakdown
- Subtitle score card with incremental value analysis

### Metadata Copilot (Future)

Real-time scoring as user types metadata edits.

### Competitor Analysis (Future)

Batch scoring of competitor metadata for benchmarking.

## Testing

Run TypeScript validation:

```bash
npx tsc --noEmit --skipLibCheck
```

## Rollback

If needed, use the rollback script:

```bash
bash /tmp/rollback-metadata-scoring-phase1.sh
```

## Documentation

Created: 2025-01-21
Last Modified: 2025-01-21
Module Owner: ASO Intelligence Team
