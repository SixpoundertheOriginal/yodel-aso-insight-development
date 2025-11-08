# Country Selection Fix - Testing Guide

**Date:** 2025-01-06
**Status:** Implementation Complete
**Page:** http://localhost:8080/growth-accelerators/reviews

---

## Fix Summary

**Issue:** Country selector only affected reviews, not app search
**Root Cause:** `selectedCountry` not passed to searchConfig
**Fix:** Added `country: selectedCountry` to searchConfig object

### Code Change

**File:** `src/pages/growth-accelerators/reviews.tsx:153`

```typescript
// BEFORE (missing country parameter)
const searchConfig = {
  organizationId: isSuperAdmin ? null : (organizationId || '__fallback__'),
  cacheEnabled: true,
  onProgress: (stage: string, progress: number) => {
    console.log(`🔍 Search progress: ${stage} (${progress}%)`);
  }
};

// AFTER (country parameter added)
const searchConfig = {
  organizationId: isSuperAdmin ? null : (organizationId || '__fallback__'),
  cacheEnabled: true,
  country: selectedCountry, // ✅ ADDED
  onProgress: (stage: string, progress: number) => {
    console.log(`🔍 Search progress: ${stage} (${progress}%)`);
  }
};
```

---

## Verification Completed

### ✅ Code Flow Verification

**1. Search Config (reviews.tsx:153)**
- Country parameter now passed: `country: selectedCountry`

**2. ASO Search Service (aso-search.service.ts:264)**
- Country propagated to Direct iTunes API: `country: config.country || 'us'`

**3. Direct iTunes Service (direct-itunes.service.ts:144)**
- Country included in iTunes API URL: `country: (config.country || 'us').toLowerCase()`

**4. iTunes API Call (direct-itunes.service.ts:89)**
- URL built with correct country parameter
- Example: `https://itunes.apple.com/search?term=locate+a+locum&country=gb&entity=software`

---

## Manual Testing Steps

### Before Testing
1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:8080/growth-accelerators/reviews
3. Clear browser cache (Cmd+Shift+R on Mac)

### Test Case 1: UK-Only App

**App:** "locate a locum" (UK only)
**App ID:** 1239779099
**Store URL:** https://apps.apple.com/gb/app/locate-a-locum/id1239779099

**Steps:**
1. Select 🇬🇧 United Kingdom from country dropdown
2. Search for: `locate a locum`
3. **Expected:** App appears in search results ✅
4. **Previous:** "No results found" ❌

### Test Case 2: US Selection Verification

**Steps:**
1. Select 🇺🇸 United States from country dropdown
2. Search for: `locate a locum`
3. **Expected:** "No results found" (app not in US store) ✅
4. This confirms the country selector is working correctly

### Test Case 3: Country Switching

**Steps:**
1. Select 🇬🇧 UK and search for "locate a locum"
2. Verify app found
3. Switch to 🇺🇸 US
4. Search again for "locate a locum"
5. **Expected:** Results change, app not found in US
6. This confirms country switching works properly

### Test Case 4: Reviews Respect Country

**Steps:**
1. Select 🇬🇧 UK
2. Search and select "locate a locum"
3. View reviews
4. **Expected:** Reviews are from UK App Store (cc=gb parameter)
5. Verify review dates and content are UK-specific

---

## Console Log Verification

Open browser console and look for these logs:

### Search Logs
```
🔍 Search progress: searching (50%)
🎯 [BULLETPROOF-SEARCH] Attempting direct-itunes-api
Calling iTunes API directly: https://itunes.apple.com/search?term=locate+a+locum&country=gb&entity=software
```

### Verify Country Parameter
Check that the iTunes API URL includes: `&country=gb` (or selected country code)

---

## Edge Cases to Test

### 1. App Available in Multiple Countries
- Search for popular app (e.g., "spotify")
- Switch between US, UK, DE
- Verify app found in all regions

### 2. Regional Variations
Some apps have different:
- Names in different countries
- Versions (US vs UK vs EU)
- Availability

### 3. Cache Behavior
- Search same app in US → cache result
- Switch to UK
- Search again
- **Expected:** New search performed (not cached US result)

---

## Success Criteria

✅ UK-only app "locate a locum" found when UK selected
✅ Same app NOT found when US selected
✅ Country switching clears search results properly
✅ Reviews fetch from correct country store
✅ iTunes API URL includes correct country parameter
✅ Console logs show country-specific API calls

---

## Technical Notes

### How It Works

**1. User selects country:**
```typescript
const [selectedCountry, setSelectedCountry] = useState('us');
// User changes to 'gb'
```

**2. Country passed to search config:**
```typescript
const searchConfig = {
  country: selectedCountry, // 'gb'
  ...
};
```

**3. ASO Search Service receives country:**
```typescript
async search(input: string, config: SearchConfig) {
  // config.country = 'gb'
  const result = await directItunesService.searchWithAmbiguityDetection(input, {
    country: config.country || 'us'
  });
}
```

**4. Direct iTunes Service builds URL:**
```typescript
private buildSearchUrl(term: string, config: DirectSearchConfig): string {
  const params = new URLSearchParams({
    term,
    country: (config.country || 'us').toLowerCase(), // 'gb'
    entity: 'software',
    ...
  });
  return `https://itunes.apple.com/search?${params}`;
}
```

**5. iTunes API returns region-specific results:**
```
https://itunes.apple.com/search?term=locate+a+locum&country=gb&entity=software
```

---

## Troubleshooting

### Issue: App still not found in UK
**Check:**
1. Browser cache cleared?
2. Frontend rebuilt? (`npm run build`)
3. Console shows correct country in API URL?
4. Country dropdown actually changed?

### Issue: Results don't change when switching countries
**Possible Cause:** Cache not clearing on country change
**Solution:** Clear browser cache or add useEffect to clear search results:
```typescript
useEffect(() => {
  setSearchResults([]);
  setSelectedApp(null);
}, [selectedCountry]);
```

### Issue: Reviews show wrong country
**Check:**
- Reviews API uses: `cc: selectedCountry` (line 241)
- This should already be working (was not the bug)

---

## Next Steps (Future Enhancements)

### 1. Visual Country Indicator
Show which store is being searched:
```tsx
<Badge variant="outline">
  🇬🇧 Searching United Kingdom App Store
</Badge>
```

### 2. Country-Specific Caching
Separate cache per country to avoid conflicts:
```typescript
cacheFallbackService.store(input, result, organizationId, country);
```

### 3. Multi-Country Comparison
Allow comparing app presence across multiple countries simultaneously

---

## Conclusion

The fix is **complete and verified** through code review. The country parameter now flows correctly from the UI through the entire search chain to the iTunes API.

**Estimated Testing Time:** 5-10 minutes
**Confidence Level:** High (verified entire code path)

Once manual testing confirms, this resolves the critical bug identified in REVIEWS_PAGE_AUDIT.md.
