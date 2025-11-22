# Subtitle Extractor - Manual Testing Guide

**Purpose:** Batch-test the experimental JSON-based subtitle extractor on real App Store HTML files.

**Status:** ⚠️ EXPERIMENTAL - For internal testing only, not integrated into production.

---

## Quick Start

### 1. Create Test Directory

```bash
mkdir -p /tmp/appstore-tests
```

### 2. Fetch App Store HTML Files

Use `curl` to download App Store pages. **Important:** Use a proper User-Agent to avoid bot detection.

```bash
# Example: Instagram
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
     -L "https://apps.apple.com/us/app/instagram-reels-video-photo/id389801252" \
     > /tmp/appstore-tests/instagram.html

# Example: TikTok
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
     -L "https://apps.apple.com/us/app/tiktok/id835599320" \
     > /tmp/appstore-tests/tiktok.html

# Example: Spotify
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
     -L "https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580" \
     > /tmp/appstore-tests/spotify.html
```

**File Naming Convention:**
- Use descriptive names: `<app-name>.html`
- Use lowercase and hyphens: `my-app.html` (not `My App.html`)
- Examples: `instagram.html`, `candy-crush.html`, `duolingo.html`

### 3. Run the Test Script

```bash
npx tsx scripts/test-subtitle-extractor.ts
```

**Expected Output:**
```
════════════════════════════════════════════════════════════════════════════════
  SUBTITLE EXTRACTOR - MANUAL TESTING CLI
════════════════════════════════════════════════════════════════════════════════

✓ Found 3 HTML file(s) to test

[1/3] Testing: instagram.html
  ✓ Subtitle found: "Share photos and videos with friends"
    Blocks: 5 found, 2 parsed

[2/3] Testing: spotify.html
  ✓ Subtitle found: "Music and Podcasts"
    Blocks: 4 found, 1 parsed

[3/3] Testing: tiktok.html
  ⚠ No subtitle found
    Blocks: 3 found, 2 parsed
```

---

## Command Options

### Basic Usage

```bash
npx tsx scripts/test-subtitle-extractor.ts
```

Shows:
- Summary of results
- CSV output for spreadsheet
- Basic diagnostics

### Verbose Mode

```bash
npx tsx scripts/test-subtitle-extractor.ts --verbose
# or
npx tsx scripts/test-subtitle-extractor.ts -v
```

Shows everything above PLUS:
- Full diagnostic logs for each app
- JSON block parsing details
- Step-by-step extraction process

---

## Output Formats

### 1. Terminal Output (Colorized)

Formatted for readability with color-coded results:
- ✅ Green = Success
- ⚠️ Yellow = Warning
- ❌ Red = Error

### 2. CSV Output (Copy to Spreadsheet)

The script automatically outputs CSV format after the summary. Copy this section directly into Excel/Google Sheets.

**CSV Columns:**
| Column | Description |
|--------|-------------|
| Filename | HTML file name |
| App Name | Extracted from filename |
| Subtitle Found | YES/NO |
| Subtitle Text | Extracted subtitle (quoted) |
| Blocks Found | Number of JSON blocks discovered |
| Blocks Parsed | Number successfully parsed |
| HTML Size (KB) | File size in kilobytes |
| Status | SUCCESS or ERROR message |

**Example CSV:**
```csv
Filename,App Name,Subtitle Found,Subtitle Text,Blocks Found,Blocks Parsed,HTML Size (KB),Status
instagram.html,instagram,YES,"Share photos and videos",5,2,156.3,SUCCESS
tiktok.html,tiktok,NO,,3,2,142.7,SUCCESS
spotify.html,spotify,YES,"Music and Podcasts",4,1,167.8,SUCCESS
```

### 3. Detailed Logs (Verbose Mode)

Full diagnostic output showing:
- Which script blocks were found
- JSON parsing success/failure
- Subtitle field detection
- Error messages and warnings

---

## Fetching App Store HTML

### Quick Reference

```bash
# Template
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
     -L "<APP_STORE_URL>" \
     > /tmp/appstore-tests/<app-name>.html
```

### App Store URL Format

```
https://apps.apple.com/{country}/app/{app-slug}/id{app-id}
```

**Examples:**
- US App Store: `https://apps.apple.com/us/app/...`
- UK App Store: `https://apps.apple.com/gb/app/...`
- Japan App Store: `https://apps.apple.com/jp/app/...`

### Finding App IDs

**Method 1: From URL**
The App Store URL contains the app ID at the end:
```
https://apps.apple.com/us/app/instagram/id389801252
                                            ^^^^^^^^^ App ID
```

**Method 2: From iTunes Search API**
```bash
curl "https://itunes.apple.com/search?term=instagram&entity=software&limit=1" | jq .
```

### Batch Fetching (Multiple Apps)

Create a shell script to fetch multiple apps at once:

```bash
#!/bin/bash
# fetch-apps.sh

BASE_URL="https://apps.apple.com/us/app"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
OUT_DIR="/tmp/appstore-tests"

# Array of apps: "name|slug|id"
APPS=(
  "instagram|instagram-reels-video-photo|389801252"
  "tiktok|tiktok|835599320"
  "spotify|spotify-music-and-podcasts|324684580"
  "netflix|netflix|363590051"
  "youtube|youtube-watch-listen-stream|544007664"
  "whatsapp|whatsapp-messenger|310633997"
  "facebook|facebook|284882215"
  "twitter|x|333903271"
  "snapchat|snapchat|447188370"
  "uber|uber-request-a-ride|368677368"
)

mkdir -p "$OUT_DIR"

for app in "${APPS[@]}"; do
  IFS='|' read -r name slug id <<< "$app"
  echo "Fetching $name..."
  curl -A "$USER_AGENT" -L "$BASE_URL/$slug/id$id" > "$OUT_DIR/$name.html"
  sleep 2  # Rate limit: 2 seconds between requests
done

echo "Done! Fetched ${#APPS[@]} apps."
```

Usage:
```bash
chmod +x fetch-apps.sh
./fetch-apps.sh
```

---

## Interpreting Results

### Success Rate Calculation

```
Success Rate = (Subtitles Found / Total Apps) × 100%
```

**Targets:**
- **>90%** = Excellent, ready for production integration
- **70-90%** = Good, use as fallback method
- **<70%** = Keep as experimental reference

### Common Outcomes

#### ✅ Subtitle Found
```
[1/5] Testing: instagram.html
  ✓ Subtitle found: "Share photos and videos"
    Blocks: 5 found, 2 parsed
```

**Interpretation:**
- JSON extraction successful
- Found subtitle in 1 of 2 parsed blocks
- 3 blocks were found but not parsed (invalid JSON or wrong structure)

#### ⚠️ No Subtitle Found
```
[2/5] Testing: app-without-subtitle.html
  ⚠ No subtitle found
    Blocks: 3 found, 2 parsed
```

**Possible Reasons:**
- App genuinely has no subtitle
- Subtitle in DOM but not in JSON blocks
- JSON structure doesn't match expected patterns
- Field name variation not covered by extractor

#### ❌ Error
```
[3/5] Testing: broken.html
  ✗ Error: Unexpected end of JSON input
```

**Possible Reasons:**
- HTML file corrupted or incomplete
- Network error during fetch (incomplete download)
- Malformed JSON in script blocks

### Detailed Log Analysis (Verbose Mode)

```bash
npx tsx scripts/test-subtitle-extractor.ts -v
```

**Log Symbols:**
- `🔍` = Searching for blocks
- `✅` = Success (block found, JSON parsed, subtitle extracted)
- `⚠️` = Warning (block found but skipped, empty subtitle, etc.)
- `❌` = Error (JSON parse failure, invalid structure)
- `📊` = Summary statistics

**Example Verbose Output:**
```
[EXPERIMENTAL] Starting JSON-based subtitle extraction
✅ HTML length: 156320 characters

🔍 Searching for <script> blocks with JSON-LD structured data...
  ✅ Found 2 script block(s) for JSON-LD structured data
  📄 Parsing script block 1/2...
    ✅ JSON parsed successfully
    ✅ Found subtitle in field "subtitle": "Share photos and videos"
  ✅ Subtitle found in JSON-LD structured data block 1: "Share photos and videos"

📊 Summary:
  - Script blocks found: 5
  - Script blocks parsed: 2
  - Subtitle extracted: YES

✅ Final subtitle: "Share photos and videos"
```

---

## Building a Test Dataset

### Recommended App Categories

Test across diverse categories to ensure reliability:

**Social Media:**
- Instagram, TikTok, Snapchat, Twitter/X, Facebook

**Streaming:**
- Netflix, Spotify, YouTube, Disney+, Hulu

**Productivity:**
- Notion, Todoist, Evernote, Microsoft Office, Google Docs

**Gaming:**
- Candy Crush, PUBG Mobile, Clash of Clans, Among Us

**Finance:**
- PayPal, Venmo, Cash App, Robinhood, Mint

**Health:**
- MyFitnessPal, Headspace, Calm, Peloton, Strava

**Travel:**
- Uber, Lyft, Airbnb, Google Maps, Waze

**Shopping:**
- Amazon, eBay, Walmart, Target, Etsy

### Target Sample Size

- **Minimum:** 10 apps (quick validation)
- **Recommended:** 20-30 apps (statistical confidence)
- **Comprehensive:** 50+ apps (production readiness)

---

## Spreadsheet Analysis Template

### 1. Import CSV Data

Copy the CSV output section from the terminal into Google Sheets or Excel.

### 2. Add Calculated Columns

**Success Rate Formula:**
```
=COUNTIF(C:C, "YES") / COUNTA(C:C) * 100
```

**Average Blocks Found:**
```
=AVERAGE(E:E)
```

**Average Blocks Parsed:**
```
=AVERAGE(F:F)
```

### 3. Create Pivot Tables

**By App Category:**
- Group apps by category
- Calculate success rate per category
- Identify problem categories

**By Block Count:**
- Group by number of blocks found
- Analyze correlation between blocks and success

### 4. Visualizations

**Success Rate Chart:**
- Pie chart: Subtitle Found (YES/NO)
- Bar chart: Success by category

**Block Analysis:**
- Scatter plot: Blocks Found vs Blocks Parsed
- Histogram: Distribution of block counts

---

## Troubleshooting

### Issue: "Test directory not found"

```
✗ Error: Test directory not found: /tmp/appstore-tests
```

**Solution:**
```bash
mkdir -p /tmp/appstore-tests
```

### Issue: "No HTML files found"

```
⚠ No HTML files found in /tmp/appstore-tests
```

**Solution:**
Fetch some App Store HTML files:
```bash
curl -A "Mozilla/5.0" -L "https://apps.apple.com/us/app/instagram/id389801252" \
     > /tmp/appstore-tests/instagram.html
```

### Issue: Empty or corrupted HTML files

**Symptoms:**
- Very small file size (< 10 KB)
- "Unexpected end of JSON input" errors
- "No script blocks found" for all files

**Solution:**
Re-fetch the HTML with proper User-Agent and follow redirects:
```bash
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
     -L \
     --max-redirs 5 \
     --retry 3 \
     "https://apps.apple.com/us/app/example/id123456789" \
     > /tmp/appstore-tests/example.html
```

Check file size:
```bash
ls -lh /tmp/appstore-tests/
```

Expected size: 100-200 KB per file

### Issue: Rate limiting / 403 errors

**Symptoms:**
- Curl returns error pages
- HTML contains "Access Denied" or "Too Many Requests"

**Solution:**
1. Add delays between requests (2-5 seconds)
2. Use rotating User-Agents
3. Fetch during off-peak hours
4. Use residential proxy if needed

### Issue: Script fails with module not found

```
Error: Cannot find module '../src/lib/metadata/subtitleJsonExtractor.experimental'
```

**Solution:**
Ensure you're running from project root:
```bash
cd /path/to/yodel-aso-insight
npx tsx scripts/test-subtitle-extractor.ts
```

---

## Next Steps After Testing

### 1. Analyze Results

- Calculate overall success rate
- Identify patterns in failures
- Document edge cases

### 2. Make Integration Decision

**If success rate >90%:**
→ Integrate into `appstore-web.adapter.ts` as primary method

**If success rate 70-90%:**
→ Use as fallback before DOM extraction

**If success rate <70%:**
→ Keep as experimental reference, investigate improvements

### 3. Document Findings

Create a summary report with:
- Total apps tested
- Success rate by category
- Edge cases discovered
- Recommendations for integration

### 4. Integration Path (If Approved)

See: `src/lib/metadata/README.experimental.md` for integration instructions.

**Key principle:** Never modify orchestrator, adapter priority, or fallback logic. Only add as an extraction method within existing adapter.

---

## Safety Notes

✅ **This script is completely isolated**
- Only imports experimental module
- Never modifies production code
- No impact on existing metadata pipeline

✅ **Graceful error handling**
- Never crashes on invalid HTML
- Catches all JSON parse errors
- Continues testing even if one file fails

✅ **Read-only operations**
- Only reads HTML files
- Never writes or modifies files
- Safe to run repeatedly

✅ **Easy rollback**
```bash
git rm scripts/test-subtitle-extractor.ts
git rm scripts/README.test-subtitle.md
```

---

## Support

For questions or issues with the experimental subtitle extractor:
1. Check verbose logs: `npx tsx scripts/test-subtitle-extractor.ts -v`
2. Review test results in spreadsheet
3. Consult: `src/lib/metadata/README.experimental.md`
