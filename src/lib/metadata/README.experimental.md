# Subtitle JSON Extractor (EXPERIMENTAL)

**Status:** ⚠️ EXPERIMENTAL - Not integrated into production pipeline

## Purpose

This module extracts subtitle from Apple's embedded JSON blocks in App Store HTML pages (pre-hydration DOM). It serves as an alternative to DOM-based subtitle extraction for testing and comparison.

## Files Created

1. **Module:** `src/lib/metadata/subtitleJsonExtractor.experimental.ts` (9.7 KB)
2. **Tests:** `tests/subtitleJsonExtractor.experimental.test.ts` (15 KB)

## Usage

```typescript
import { extractSubtitleFromJsonExperimental } from '@/lib/metadata/subtitleJsonExtractor.experimental';

// Fetch HTML from App Store
const html = await fetch('https://apps.apple.com/us/app/example/id123456789');
const htmlText = await html.text();

// Extract subtitle
const result = extractSubtitleFromJsonExperimental(htmlText);

console.log('Subtitle:', result.subtitle);
console.log('Logs:', result.logs.join('\n'));
```

## Features

- ✅ Searches 4 types of JSON script blocks (in priority order)
- ✅ Safe JSON parsing with error handling
- ✅ Handles 5 subtitle field name variations
- ✅ Searches nested objects (up to 5 levels deep)
- ✅ Size limits for DoS prevention (2MB max)
- ✅ Detailed diagnostic logging
- ✅ Zero dependencies on existing metadata pipeline

## Script Block Types (Search Order)

1. `<script type="application/json">` - Primary JSON blocks
2. `<script type="application/ld+json">` - JSON-LD structured data
3. `<script data-ember-store>` - Ember data store
4. `<script data-storefront>` - App Store storefront data

## Subtitle Field Names Supported

- `subtitle` (primary)
- `subTitle` (camelCase variant)
- `tagline`
- `description`
- `shortDescription`

## Testing

Run the test suite:

```bash
npm test -- tests/subtitleJsonExtractor.experimental.test.ts
```

**Test Results:** ✅ 29/29 tests passing

**Coverage:**
- Valid extraction scenarios (9 tests)
- Error handling (8 tests)
- Logging and diagnostics (5 tests)
- Safety limits (2 tests)
- Multiple script blocks (2 tests)
- Real-world scenarios (2 tests)

## Manual Testing Workflow

1. **Collect Sample HTML Files**
   ```bash
   # Save App Store pages for manual testing
   curl 'https://apps.apple.com/us/app/example/id123456789' > test-app-1.html
   ```

2. **Test Extraction in REPL/Script**
   ```typescript
   import fs from 'fs';
   import { extractSubtitleFromJsonExperimental } from './src/lib/metadata/subtitleJsonExtractor.experimental';

   const html = fs.readFileSync('test-app-1.html', 'utf-8');
   const result = extractSubtitleFromJsonExperimental(html);

   console.log('='.repeat(60));
   console.log('SUBTITLE EXTRACTION TEST');
   console.log('='.repeat(60));
   console.log('\nSubtitle found:', result.subtitle || 'NONE');
   console.log('\nDiagnostic logs:');
   console.log(result.logs.join('\n'));
   ```

3. **Compare with DOM Extraction**
   - Run both JSON-based and DOM-based extraction
   - Compare accuracy and reliability
   - Document differences in a spreadsheet

## Future Integration Path

**If testing proves successful:**

1. **Add to appstore-web.adapter.ts:**
   ```typescript
   import { extractSubtitleFromJsonExperimental } from '@/lib/metadata/subtitleJsonExtractor.experimental';

   private extractSubtitle($: cheerio.CheerioAPI, html?: string): string {
     // Try JSON extraction first (if HTML available)
     if (html) {
       const jsonResult = extractSubtitleFromJsonExperimental(html);
       if (jsonResult.subtitle) {
         return jsonResult.subtitle;
       }
     }

     // Fallback to DOM extraction (existing logic)
     const selectors = [/* ... */];
     // ... existing code ...
   }
   ```

2. **Update telemetry:**
   - Track JSON vs DOM extraction success rates
   - Log extraction method used for each app
   - Monitor performance impact

3. **Preserve invariants:**
   - No changes to adapter priority
   - No changes to orchestration flow
   - No changes to fallback logic
   - No changes to metadata contract

## Rollback

Simple 2-file deletion:

```bash
git rm src/lib/metadata/subtitleJsonExtractor.experimental.ts
git rm tests/subtitleJsonExtractor.experimental.test.ts
git rm src/lib/metadata/README.experimental.md
```

## Safety Guarantees

- ✅ Completely isolated from production pipeline
- ✅ No modifications to existing adapters
- ✅ No impact on orchestrator or normalizer
- ✅ No changes to metadata contract
- ✅ No changes to fallback logic
- ✅ No runtime impact unless explicitly called
- ✅ Build and tests pass (20.51s build, 29/29 tests)

## Next Steps

1. **Collect 10-20 real App Store HTML files** for various app types:
   - Popular apps (Instagram, TikTok, etc.)
   - Niche apps
   - Apps with/without subtitles
   - Apps in different categories

2. **Run extraction tests** and document results:
   - Subtitle found: YES/NO
   - Match with DOM extraction: YES/NO
   - Logs show which block was used

3. **Analyze results:**
   - Success rate: __%
   - Compared to DOM extraction: __% agreement
   - Edge cases discovered: __

4. **Make decision:**
   - If >90% success rate → integrate into adapter
   - If 70-90% → use as fallback only
   - If <70% → keep as experimental reference

## Questions?

This is an isolated experimental module for internal testing only. It does not affect any existing metadata ingestion logic.
