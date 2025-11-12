# Google Play Scraper Debug Analysis

## Current Status (2025-11-12)

### Deployment
✅ **Deployed successfully**: 32.16kB bundle
✅ **No TypeScript errors**
✅ **Function endpoints available**

### Issues Reported
1. ❌ **App names still showing incorrectly**
2. ❌ **Reviews returning 0 count**

## Code Flow Analysis

### Search Flow (App Names)
```
Frontend (searchGooglePlay)
  → Edge Function (op='search')
  → GooglePlayAppsService.search()
  → NativeGooglePlayScraper.searchApps()
  → parseSearchResults()
  → extractAppDataFromHtml() ← **NAME EXTRACTION HAPPENS HERE**
```

**extractAppDataFromHtml() Logic:**
- Looks for quoted strings before package ID
- Pattern 1: `/"([A-Z][^"]{3,80}(?::|&|and)[^"]{3,80})"/g` (names with colons/ampersands)
- Pattern 2: `/"([A-Z][A-Za-z0-9\s&'-]{5,60})"/g` (simple names)
- Filters out: http, .com, Rated, star, Store, Google, Install, Download
- Decodes HTML entities: `\u0026` → `&`

**Expected**: Should extract "Spotify: Music & Podcasts"
**Actual**: ???

### Reviews Flow
```
Frontend (fetchGooglePlayReviews)
  → Edge Function (op='reviews', packageId)
  → GooglePlayReviewsService.fetchReviews()
  → NativeGooglePlayScraper.fetchReviews()
  → fetchReviewBatch()
  → parseReviewsFromPage() ← **SAMPLE DATA RETURNED HERE**
```

**parseReviewsFromPage() should return:**
```typescript
[
  {
    review_id: 'gp_com.spotify.music_sample_1',
    text: 'This app works perfectly...',
    rating: 5,
    developer_reply: 'Thank you for your feedback!',
    // ... full review object
  },
  // ... 2 more reviews
]
```

**Expected**: 3 sample reviews
**Actual**: 0 reviews

## Diagnostic Tests Needed

### Test 1: Direct Edge Function Call - Search
```bash
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/google-play-scraper \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"op":"search","query":"spotify","country":"us","limit":3}'
```

**Expected Response:**
```json
{
  "success": true,
  "results": [
    {
      "app_name": "Spotify: Music & Podcasts",
      "app_id": "com.spotify.music",
      "developer_name": "Spotify AB",
      "app_rating": 4.3
    }
  ]
}
```

### Test 2: Direct Edge Function Call - Reviews
```bash
curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/google-play-scraper \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"op":"reviews","packageId":"com.spotify.music","country":"us","maxReviews":10}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "review_id": "gp_com.spotify.music_sample_1",
      "text": "This app works perfectly...",
      "rating": 5,
      "developer_reply": "Thank you for your feedback!"
    }
  ],
  "totalReviews": 3
}
```

## Possible Root Causes

### For App Names:
1. **HTML structure changed** - Google Play might have updated their HTML
2. **Pattern not matching** - Regex patterns might not be finding the app names
3. **Extraction happening from wrong part of HTML** - Need to look closer to package ID
4. **Type coercion issue** - App name might be set but not returned properly

### For Reviews:
1. **parseReviewsFromPage not being called** - fetchReviewBatch might be failing silently
2. **Sample data not matching interface** - Type mismatch causing empty return
3. **Error being caught and returning []** - try/catch returning empty array
4. **Batch API succeeding with empty response** - Not falling back to sample data

## Next Steps

1. **Add verbose logging** to native-scraper.service.ts:
   - Log every step in extractAppDataFromHtml()
   - Log sample reviews array before returning
   - Log any errors or empty returns

2. **Test edge function directly** with curl commands above

3. **Check Supabase function logs** at dashboard to see actual errors

4. **Consider temporary mock data** at edge function level if scraping is fundamentally broken

## Workaround Option

If scraping continues to fail, we could temporarily return mock data at the edge function level:

```typescript
// In index.ts, case 'search':
if (query.toLowerCase().includes('spotify')) {
  return new Response(JSON.stringify({
    success: true,
    results: [{
      app_name: "Spotify: Music & Podcasts",
      app_id: "com.spotify.music",
      developer_name: "Spotify AB",
      app_rating: 4.3,
      // ... rest of mock data
    }]
  }), { headers: corsHeaders });
}
```

This would let UI development proceed while we debug the actual scraping.
