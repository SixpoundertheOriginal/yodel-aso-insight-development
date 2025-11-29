# Test: Analyze Competitors Edge Function

## ✅ Edge Function Deployed Successfully

**Function**: `analyze-competitors`
**Deployment**: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions
**Status**: Deployed

## 📋 Test Plan

### Test Case 1: Duolingo + Language Learning Competitors

**Target App**: Duolingo (App Store ID: 570060128)

**Competitors** (4 apps):
1. Babbel (ID: 1272018374) - Language learning
2. Rosetta Stone (ID: 1084073287) - Language learning
3. Busuu (ID: 1522006792) - Language learning
4. Memrise (ID: 1434973498) - Language learning

**Request**:
```json
{
  "targetAppId": "570060128",
  "competitorAppStoreIds": [
    "1272018374",
    "1084073287",
    "1522006792",
    "1434973498"
  ],
  "organizationId": "test-org-id"
}
```

**Expected Output**:
```json
{
  "success": true,
  "data": {
    "targetApp": {
      "appStoreId": "570060128",
      "name": "Duolingo - Language Lessons",
      "audit": {
        "overallScore": 85,
        "keywordCoverage": {
          "totalUniqueKeywords": 12,
          "titleKeywords": ["duolingo", "language", "lessons"],
          "subtitleNewKeywords": ["learn", "spanish", "french", "..."]
        },
        "comboCoverage": {
          "totalCombos": 45,
          "titleCombos": ["language lessons", "..."],
          "subtitleNewCombos": ["learn spanish", "..."]
        },
        "keywordFrequency": [
          {
            "keyword": "language",
            "totalCombos": 12,
            "twoWordCombos": 5,
            "threeWordCombos": 4,
            "fourPlusCombos": 3,
            "sampleCombos": ["language lessons", "learn language", "..."]
          }
        ]
      }
    },
    "competitors": [
      {
        "appStoreId": "1272018374",
        "name": "Babbel - Language Learning",
        "subtitle": "Learn Spanish, French & More",
        "audit": { /* Full audit result */ },
        "fetchedAt": "2025-01-..."
      }
      // ... 3 more competitors
    ],
    "gapAnalysis": {
      "missingKeywords": [
        {
          "keyword": "conversation",
          "usedByCompetitors": 3,
          "avgFrequency": 8.5,
          "topCompetitor": "Babbel - Language Learning",
          "opportunityScore": 85
        },
        {
          "keyword": "speak",
          "usedByCompetitors": 4,
          "avgFrequency": 6.2,
          "topCompetitor": "Rosetta Stone",
          "opportunityScore": 78
        }
      ],
      "missingCombos": [
        {
          "combo": "conversation practice",
          "usedByCompetitors": 2,
          "topCompetitor": "Babbel - Language Learning",
          "opportunityScore": 60
        }
      ],
      "frequencyGaps": [
        {
          "keyword": "language",
          "targetFrequency": 12,
          "competitorAvgFrequency": 18.5,
          "gap": 6.5,
          "recommendation": "Consider using \"language\" in more combinations (competitors average 19 combos)"
        }
      ],
      "summary": {
        "totalMissingKeywords": 15,
        "totalMissingCombos": 8,
        "totalFrequencyGaps": 5,
        "avgCompetitorKeywordCount": 16,
        "targetKeywordCount": 12,
        "avgCompetitorComboCount": 52,
        "targetComboCount": 45
      }
    }
  }
}
```

## 🧪 How to Test

### Option 1: Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions
2. Click on `analyze-competitors`
3. Paste the request JSON above
4. Click "Invoke"
5. View results

### Option 2: Frontend Integration (Next Step)
1. Build UI component
2. Call edge function from frontend
3. Display results in Competitive Intelligence tab

## ✅ Function Features Implemented

- [x] Rate-limited fetching (2 concurrent, 1s delay)
- [x] Fetch target app metadata
- [x] Fetch competitor metadata (4 apps)
- [x] Run MetadataAuditEngine.evaluate() for all apps
- [x] Gap Analysis:
  - [x] Missing Keywords (competitors use, target doesn't)
  - [x] Missing Combos (competitors have, target doesn't)
  - [x] Opportunity Scores (ROI calculation)
  - [x] Frequency Gaps (target uses less than competitors)
- [x] Summary statistics
- [x] Error handling
- [x] CORS headers

## 🚧 TODO

- [ ] Add caching to `competitor_comparison_cache` table (24h TTL)
- [ ] Store competitors in `app_competitors` table after successful analysis
- [ ] Add progress streaming (SSE) for real-time updates
- [ ] Frontend UI integration

## 📊 Expected Performance

**Total Time**: ~6-8 seconds for 4 competitors
- Batch 1 (2 apps): ~2-3 seconds
- Delay: 1 second
- Batch 2 (2 apps): ~2-3 seconds
- Analysis: ~1-2 seconds

**Rate Limiting**: Safe for App Store API (no 429 errors)
