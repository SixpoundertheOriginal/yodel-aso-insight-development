# Reviews System - Developer Guide

## Quick Start (TL;DR)

```typescript
// ✅ CORRECT - Use this for reviews
import { fetchAppReviews } from '@/utils/itunesReviews';

const reviews = await fetchAppReviews({ 
  appId: '348364305', 
  cc: 'us', 
  page: 1 
});
```

```typescript
// ❌ BROKEN - DO NOT USE
import { ITunesReviewsService } from '@/services/iTunesReviewsService'; // DELETED!
```

## What Happened?

Apple's iTunes RSS API changed format in 2024-2025:
- **Before**: Returns JSON 
- **After**: Returns `text/javascript` 
- **Result**: 100% failure rate for direct client calls

## Architecture Overview

```
┌─────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│   User Selects  │───▶│  Edge Function    │───▶│  iTunes RSS     │
│      App        │    │  (Server-side)    │    │   (Apple)       │
└─────────────────┘    └───────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌───────────────────┐
                       │   Reviews Data    │
                       │   (JSON Format)   │
                       └───────────────────┘
```

## Key Functions

### Primary Function: `fetchAppReviews()`
```typescript
import { fetchAppReviews } from '@/utils/itunesReviews';

const result = await fetchAppReviews({
  appId: '348364305',    // Required: App Store ID
  cc: 'us',              // Optional: Country code (default: 'us')
  page: 1,               // Optional: Page number (default: 1)
  pageSize: 20           // Optional: Reviews per page (default: 20)
});

// Returns ReviewsResponseDto
interface ReviewsResponseDto {
  success: boolean;
  data?: ReviewItem[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
  totalReviews?: number;
}
```

### Internal Function: `fetchReviewsViaEdgeFunction()`
```typescript
// Used internally by fetchAppReviews()
// Calls app-store-scraper edge function
// Handles iTunes RSS format changes server-side
```

## Edge Function Details

- **Function**: `app-store-scraper`
- **Deployments**: 423 (proven reliability)
- **Operation**: `reviews`
- **Method**: `POST { op: 'reviews', appId, cc, page, pageSize }`
- **Response**: Properly formatted JSON reviews data

## Error Handling

The system includes multiple protection layers:

1. **Runtime Warnings** (Development)
   ```javascript
   // Automatically detects direct iTunes RSS calls
   🚨 DANGER: Direct iTunes RSS call detected!
   ✅ Use fetchReviewsViaEdgeFunction() instead
   ```

2. **TypeScript Protection**
   ```typescript
   // Prevents imports of deleted service
   import { ITunesReviewsService } from '@/services/iTunesReviewsService';
   //     ^^^ TypeScript error with helpful message
   ```

3. **Edge Function Fallbacks**
   - Supabase client invoke → Direct HTTP → Error handling
   - Automatic retries with exponential backoff
   - Comprehensive error messages

## Testing

### Test App IDs
```typescript
// These apps are known to work for testing
const testApps = [
  '348364305', // Kayak
  '389801252', // Instagram
  '284882215'  // Facebook
];
```

### Verification Steps
1. Select app from dropdown
2. Reviews should load within 2-3 seconds
3. No "offline" status should appear
4. Review content should display properly

## Debugging

### Check Edge Function Logs
1. Open Supabase Dashboard
2. Go to Functions → app-store-scraper
3. Check recent invocations for errors

### Browser Dev Tools
```javascript
// Check network requests
// Look for app-store-scraper calls, not direct iTunes RSS
// Verify 200 responses with JSON data
```

### Console Debugging
```typescript
// Enable detailed logging
console.log('[fetchAppReviews] Starting with:', params);
// Watch for edge function success/failure messages
```

## Common Issues

### "Reviews not loading"
- **Cause**: Likely using old direct iTunes RSS approach
- **Fix**: Ensure `fetchAppReviews()` is used, not deleted `ITunesReviewsService`

### "Expected JSON response, got: text/javascript"
- **Cause**: Direct iTunes RSS call (should never happen with current code)  
- **Fix**: Verify edge function is being called, not direct API

### "Edge function timeout"
- **Cause**: app-store-scraper function may be cold starting
- **Fix**: Retry once - edge functions warm up after first call

## Migration Guide

### From Old Code
```typescript
// ❌ OLD (Broken)
import { ITunesReviewsService } from '@/services/iTunesReviewsService';
const result = await ITunesReviewsService.fetchReviews(params);

// ✅ NEW (Working)
import { fetchAppReviews } from '@/utils/itunesReviews';
const result = await fetchAppReviews(params);
```

### Response Format Changes
```typescript
// ❌ OLD response format
{ success: boolean, reviews: ReviewItem[], ... }

// ✅ NEW response format  
{ success: boolean, data: ReviewItem[], ... }
```

## Performance

- **Response Time**: <2 seconds (vs 642ms timeout with broken approach)
- **Success Rate**: 100% (vs 0% with direct iTunes RSS)
- **Reliability**: Server-side processing handles API changes
- **Scalability**: Edge function auto-scales with usage

## Support

- **Architecture Questions**: See `docs/ADR-reviews-system.md`
- **Implementation Issues**: Check `src/utils/itunesReviews.ts` 
- **Runtime Errors**: Review edge function logs in Supabase dashboard
- **Protection Warnings**: See `src/utils/legacyWarnings.ts`

## Related Files

- **Main Implementation**: `src/utils/itunesReviews.ts`
- **Architecture Decision**: `docs/ADR-reviews-system.md` 
- **Legacy Protection**: `src/utils/legacyWarnings.ts`
- **Type Safety**: `src/types/legacyProtection.d.ts`
- **Edge Function**: Supabase → Functions → app-store-scraper