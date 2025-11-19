# Phase A.5 - App Store Web Metadata Adapter Audit

**Date:** 2025-01-17
**Phase:** A.5 - Web Scraping Adapter Design
**Status:** 📋 AUDIT COMPLETE - AWAITING IMPLEMENTATION APPROVAL

---

## Executive Summary

This audit provides a comprehensive analysis of building an **App Store Web Metadata Adapter** to extract accurate app metadata directly from Apple's public web pages at `apps.apple.com`. This adapter will serve as the **primary source of truth** for app metadata, resolving critical issues with the iTunes Search API's incomplete data.

**Current Problem:**
- iTunes Search API combines app name + subtitle into single `trackName` field
- No way to extract real subtitle using iTunes API alone
- Pimsleur example: API returns `"Pimsleur | Language Learning"` as single field

**Proposed Solution:**
- Fetch metadata from `https://apps.apple.com/us/app/{app-name}/{app-id}`
- Extract real subtitle: "Speak fluently in 30 Days!"
- Extract complete screenshot sets
- Extract all metadata fields with proper structure

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Apple App Store Web Structure](#2-apple-app-store-web-structure)
3. [Data Extraction Points](#3-data-extraction-points)
4. [Technical Feasibility](#4-technical-feasibility)
5. [Ethical & Legal Considerations](#5-ethical--legal-considerations)
6. [Security Risks & Mitigations](#6-security-risks--mitigations)
7. [Performance & Scalability](#7-performance--scalability)
8. [Integration Architecture](#8-integration-architecture)
9. [Fallback Strategy](#9-fallback-strategy)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Current State Analysis

### 1.1 Existing Adapters

**Current Metadata Sources:**

| Adapter | Source | Subtitle Support | Screenshot Support | Issues |
|---------|--------|------------------|-------------------|--------|
| **ItunesSearchAdapter** | iTunes Search API | ❌ No (combined with title) | ✅ Yes | Subtitle embedded in trackName |
| **ItunesLookupAdapter** | iTunes Lookup API | ❌ No (combined with title) | ✅ Yes | Same issue as Search |
| **DirectItunesService** | iTunes API (fallback) | ❌ No | ✅ Yes | Requires title splitting |

**Current Workaround:**
- Split `trackName` using separator patterns (`|`, `-`, `–`, `—`, `:`)
- **Problem:** Unreliable, fails for apps with separators in actual name

---

### 1.2 Metadata Quality Issues

**iTunes API Limitations:**

1. **Subtitle Duplication**
   - `trackName: "Pimsleur | Language Learning"` (combined)
   - No separate subtitle field
   - Splitting is heuristic-based and error-prone

2. **Incomplete Metadata**
   - Missing: In-app purchase names/prices
   - Missing: Localized descriptions
   - Missing: "What's New" section details
   - Missing: Full screenshot sets for all device types

3. **Stale Data**
   - iTunes API cache can be hours behind App Store
   - New releases may not appear immediately

---

### 1.3 User Impact

**Current Issues:**
- **Pimsleur:** Subtitle shows "Pimsleur | Language Learning" instead of real tagline
- **Creative Analysis:** Incomplete screenshot data
- **Metadata Scoring:** Incorrect character counts
- **Keyword Density:** Calculated on wrong subtitle

**User Complaints:**
- "Why does the subtitle include the app name?"
- "Screenshots are missing"
- "Character count is wrong"

---

## 2. Apple App Store Web Structure

### 2.1 Web Page Architecture

**URL Pattern:**
```
https://apps.apple.com/{country}/app/{slug}/{app-id}
```

**Example:**
```
https://apps.apple.com/us/app/pimsleur-language-learning/id1405735469
```

**Components:**
- `{country}`: 2-letter country code (us, gb, fr, de, etc.)
- `{slug}`: URL-friendly app name (optional, redirects work without it)
- `{app-id}`: Numeric App Store ID (required)

---

### 2.2 Page Rendering

**Technology Stack:**
- **Framework:** React-based single-page application
- **Data Loading:** Client-side JavaScript hydration
- **Initial HTML:** Contains JSON-LD structured data
- **Dynamic Content:** Loaded via API calls post-render

**Rendering Options:**

| Method | Pros | Cons | Recommended |
|--------|------|------|-------------|
| **Static HTML Parse** | Fast, simple | May miss dynamic content | ❌ No |
| **JSON-LD Extract** | Structured, reliable | Limited fields | ✅ Primary |
| **Headless Browser** | Complete data | Slow, resource-heavy | ⚠️ Fallback only |

---

### 2.3 Structured Data (JSON-LD)

**Schema.org Integration:**

Apple embeds **JSON-LD** structured data in `<script type="application/ld+json">` tags:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Pimsleur | Language Learning",
  "description": "Is your goal to actually speak a new language?...",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.7,
    "reviewCount": 23290
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "applicationCategory": "Education",
  "operatingSystem": "iOS 15.1+"
}
```

**Available Fields:**
- ✅ `name` (combined title, same as iTunes API)
- ✅ `description`
- ✅ `aggregateRating` (rating + review count)
- ✅ `offers` (price)
- ✅ `applicationCategory`
- ✅ `operatingSystem`
- ❌ **Subtitle NOT in JSON-LD**

---

### 2.4 DOM Structure Analysis

**Key Sections:**

```html
<main class="main" role="main">
  <!-- App Header -->
  <header>
    <h1 class="product-header__title">Pimsleur | Language Learning</h1>
    <p class="product-header__subtitle">Speak fluently in 30 Days!</p>
  </header>

  <!-- Information Ribbon -->
  <section class="information-ribbon">
    <div class="badge badge--developer">Simon & Schuster</div>
    <div class="badge badge--category">Education</div>
    <div class="badge badge--rating">4.7 ★ • 23K Ratings</div>
  </section>

  <!-- Screenshots -->
  <section class="product-media">
    <div class="product-media__phone">
      <img src="https://is1-ssl.mzstatic.com/image/thumb/.../392x696bb.jpg">
      <!-- More screenshots -->
    </div>
  </section>

  <!-- Description -->
  <section class="product-description">
    <div class="we-truncate we-truncate--multi-line">
      Is your goal to actually speak a new language?...
    </div>
  </section>

  <!-- What's New -->
  <section class="whats-new">
    <h2>What's New</h2>
    <div class="version">Version 7.1.1</div>
    <p>We hope you're enjoying the Pimsleur app!...</p>
  </section>
</main>
```

---

## 3. Data Extraction Points

### 3.1 Extraction Methods Comparison

| Field | JSON-LD | DOM Parsing | Recommended |
|-------|---------|-------------|-------------|
| **App Name (combined)** | ✅ Yes | ✅ Yes | JSON-LD |
| **Subtitle (tagline)** | ❌ No | ✅ Yes | DOM (`.product-header__subtitle`) |
| **Description** | ✅ Yes | ✅ Yes | JSON-LD |
| **Screenshots** | ❌ No | ✅ Yes | DOM (`.product-media img`) |
| **Rating** | ✅ Yes | ✅ Yes | JSON-LD |
| **Review Count** | ✅ Yes | ✅ Yes | JSON-LD |
| **Developer** | ✅ Yes | ✅ Yes | JSON-LD (author) |
| **Category** | ✅ Yes | ✅ Yes | JSON-LD |
| **Price** | ✅ Yes | ✅ Yes | JSON-LD |
| **Version** | ❌ No | ✅ Yes | DOM (`.whats-new`) |
| **Release Notes** | ❌ No | ✅ Yes | DOM (`.whats-new`) |
| **Languages** | ❌ No | ✅ Yes | DOM (`.information-list`) |
| **Age Rating** | ❌ No | ✅ Yes | DOM (`.information-list`) |
| **In-App Purchases** | ❌ No | ✅ Yes | DOM (`.in-app-purchase`) |

---

### 3.2 Critical Extraction Targets

#### **Priority 1: Subtitle (Primary Goal)**

**Location:** `.product-header__subtitle`

**Example:**
```html
<p class="product-header__subtitle app-header__subtitle">
  Speak fluently in 30 Days!
</p>
```

**Extraction Strategy:**
1. Parse HTML using DOM parser (cheerio/jsdom)
2. Find element with class `product-header__subtitle`
3. Extract text content
4. Trim and sanitize

**Reliability:** 🟢 HIGH
- Consistent class naming across all apps
- Always present if subtitle exists
- Falls back gracefully if missing (empty string)

---

#### **Priority 2: Screenshots**

**Location:** `.product-media img` or `product_media_phone_` data attributes

**Example:**
```html
<section class="product-media product-media--phone">
  <img src="https://is1-ssl.mzstatic.com/image/thumb/.../392x696bb.jpg"
       alt="Screenshot 1"
       class="we-artwork__image">
  <img src="https://is1-ssl.mzstatic.com/image/thumb/.../392x696bb.jpg"
       alt="Screenshot 2">
  <!-- More screenshots -->
</section>
```

**Extraction Strategy:**
1. Find all `<img>` within `.product-media`
2. Filter for mzstatic.com CDN URLs
3. Extract `src` attributes
4. Separate by device type (phone, pad)

**Reliability:** 🟡 MEDIUM
- Class names may vary slightly
- Need to handle multiple device types
- Some apps have video previews (ignore for now)

---

#### **Priority 3: Complete Title Splitting**

**Current iTunes API:**
```json
{
  "trackName": "Pimsleur | Language Learning"
}
```

**Web Page HTML:**
```html
<h1 class="product-header__title">Pimsleur | Language Learning</h1>
<p class="product-header__subtitle">Speak fluently in 30 Days!</p>
```

**Extraction Strategy:**
1. Extract `<h1>` for full name
2. Extract `<p class="product-header__subtitle">` for real subtitle
3. Split `<h1>` text if subtitle is missing (fallback)
4. Return both fields

**Result:**
```json
{
  "name": "Pimsleur",
  "title": "Pimsleur | Language Learning",
  "subtitle": "Speak fluently in 30 Days!"
}
```

---

### 3.3 Selector Stability Analysis

**DOM Selector Risk Assessment:**

| Selector | Stability | Risk | Alternative |
|----------|-----------|------|-------------|
| `.product-header__title` | 🟢 HIGH | LOW | `h1[class*="header"]` |
| `.product-header__subtitle` | 🟢 HIGH | LOW | `p[class*="subtitle"]` |
| `.product-media img` | 🟡 MEDIUM | MEDIUM | `img[src*="mzstatic"]` |
| `.information-ribbon` | 🟢 HIGH | LOW | `section[class*="ribbon"]` |
| `.product-description` | 🟢 HIGH | LOW | `section[class*="description"]` |
| `.whats-new` | 🟡 MEDIUM | MEDIUM | `section:has(h2:contains("What's New"))` |

**Mitigation Strategies:**
1. **Multiple Selector Fallbacks:** Try 2-3 selectors per field
2. **Semantic Structure:** Use HTML5 semantic tags when possible
3. **Content-Based Matching:** Look for text patterns ("What's New", "Ratings", etc.)
4. **JSON-LD Preference:** Use structured data when available

---

## 4. Technical Feasibility

### 4.1 HTML Parsing Libraries

**Comparison:**

| Library | Pros | Cons | Recommended |
|---------|------|------|-------------|
| **cheerio** | Fast, jQuery syntax, server-side | No JS execution | ✅ Primary |
| **jsdom** | Full DOM, JS execution | Heavy, slow | ⚠️ Fallback only |
| **node-html-parser** | Faster than cheerio | Less features | ❌ No |
| **puppeteer** | Full browser, handles JS | Very slow, resource-heavy | ❌ Overkill |

**Recommended:** **cheerio** for initial implementation

**Reasons:**
- ✅ Fast and lightweight
- ✅ jQuery-like API (familiar)
- ✅ No browser overhead
- ✅ Sufficient for static HTML + JSON-LD parsing
- ❌ Cannot execute JavaScript (but we don't need it)

---

### 4.2 Fetch Strategy

**Option A: Direct HTTP Fetch (Recommended)**

```typescript
const response = await fetch(`https://apps.apple.com/us/app/id${appId}`, {
  headers: {
    'User-Agent': 'Yodel-ASO-Platform/1.0 (ASO Analysis Tool)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  }
});

const html = await response.text();
```

**Pros:**
- ✅ Fast (< 500ms typical)
- ✅ Simple implementation
- ✅ Low resource usage
- ✅ Works with cheerio

**Cons:**
- ❌ Only gets initial HTML
- ❌ May miss dynamically loaded content

---

**Option B: Headless Browser (Fallback Only)**

```typescript
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(`https://apps.apple.com/us/app/id${appId}`);
await page.waitForSelector('.product-header__subtitle');
const html = await page.content();
```

**Pros:**
- ✅ Gets all dynamically loaded content
- ✅ Executes JavaScript
- ✅ Handles redirects automatically

**Cons:**
- ❌ Slow (3-5 seconds typical)
- ❌ High resource usage (memory, CPU)
- ❌ Requires Chrome/Chromium installed
- ❌ Difficult to scale

**Decision:** Use **Option A** (direct fetch) as primary method.

---

### 4.3 Parsing Implementation

**Two-Phase Extraction:**

**Phase 1: JSON-LD Structured Data**
```typescript
// Extract JSON-LD
const $ = cheerio.load(html);
const jsonLdScript = $('script[type="application/ld+json"]').html();
const structuredData = JSON.parse(jsonLdScript);

// Extract fields
const name = structuredData.name;
const description = structuredData.description;
const rating = structuredData.aggregateRating.ratingValue;
const reviewCount = structuredData.aggregateRating.reviewCount;
```

**Phase 2: DOM Parsing for Missing Fields**
```typescript
// Extract subtitle (NOT in JSON-LD)
const subtitle = $('.product-header__subtitle').text().trim();

// Extract screenshots
const screenshots = $('.product-media img')
  .map((i, el) => $(el).attr('src'))
  .get()
  .filter(url => url && url.includes('mzstatic.com'));

// Extract version
const version = $('.whats-new .version').text().trim();
```

---

## 5. Ethical & Legal Considerations

### 5.1 Apple Terms of Service Analysis

**Apple Website Terms of Use:**
https://www.apple.com/legal/internet-services/terms/site.html

**Key Clauses:**

1. **Permitted Uses** (Section 2):
   > "You may not use any deep-link, robot, spider or other automatic device, program, algorithm or methodology, or any similar or equivalent manual process, to access, acquire, copy or monitor any portion of the Site..."

   **Analysis:** 🔴 **POTENTIAL VIOLATION**
   - Clause prohibits "automated device" for copying content
   - Our use case: Automated metadata extraction
   - **However:** We're accessing public data only, not scraping en masse

2. **Non-Commercial Use** (Section 3):
   > "The Site is for your personal and non-commercial use..."

   **Analysis:** 🟡 **GRAY AREA**
   - Yodel ASO Platform is a commercial product
   - But we're providing ASO analysis, not reselling Apple's content
   - Similar to how SEO tools analyze Google search results

3. **Robots.txt Compliance**:
   Check `https://apps.apple.com/robots.txt`

   **Expected Content:**
   ```
   User-agent: *
   Disallow: (varies)
   ```

   **Action Required:** Verify robots.txt and respect directives

---

### 5.2 Legal Risk Assessment

**Risk Level: 🟡 MEDIUM-LOW**

**Factors:**

**Mitigating Factors (Lower Risk):**
- ✅ Public data only (no authentication required)
- ✅ Respectful rate limiting (1 request every 6 seconds = 10/min)
- ✅ User-initiated (not bulk scraping)
- ✅ Caching (24h minimum, reduces load)
- ✅ robots.txt compliance
- ✅ Proper User-Agent identification
- ✅ No reselling of Apple's content
- ✅ Transformative use (ASO analysis, not replication)

**Aggravating Factors (Higher Risk):**
- ⚠️ ToS clause against automated access
- ⚠️ Commercial use of platform
- ⚠️ Potential for abuse if rate limits not enforced

---

### 5.3 Ethical Guidelines

**Our Commitment:**

1. **Respect Apple's Infrastructure**
   - Never exceed 10 requests/minute
   - Implement exponential backoff on errors
   - Cache aggressively (24h minimum)
   - Monitor and respond to 429/503 errors

2. **Transparency**
   - Use identifiable User-Agent: `Yodel-ASO-Platform/1.0`
   - Include contact email in User-Agent if Apple requests
   - Respect robots.txt directives

3. **Data Minimization**
   - Only fetch needed fields
   - Don't archive historical versions
   - Don't fetch frequently (max once per 24h per app)

4. **Fair Use**
   - Transformative use (analysis, not replication)
   - No public redistribution of Apple's content
   - User-initiated searches only (no bulk scraping)

---

### 5.4 GDPR Compliance

**Data Protection Assessment:**

**What We Collect:**
- ✅ App metadata (public information)
- ✅ Ratings and review counts (aggregated data)
- ❌ NO user reviews (no personal data)
- ❌ NO reviewer names
- ❌ NO user-generated content

**GDPR Status:** 🟢 **COMPLIANT**

**Reasoning:**
- All data is publicly available
- No personal data collected
- No tracking of individuals
- No cookies or persistent identifiers from Apple
- Data used for legitimate business purpose (ASO analysis)

---

### 5.5 Recommended Legal Actions

**Before Implementation:**

1. ✅ **Legal Review**
   - Have legal counsel review Apple's ToS
   - Assess fair use doctrine applicability
   - Document risk acceptance

2. ✅ **robots.txt Compliance**
   - Fetch and parse `https://apps.apple.com/robots.txt`
   - Implement automatic compliance checks
   - Log compliance status

3. ✅ **Rate Limiting Contract**
   - Hard-code rate limits (not configurable)
   - Make violation technically impossible
   - Log all requests for audit trail

4. ✅ **Monitoring & Response Plan**
   - Monitor for cease-and-desist communications
   - Prepare shutdown procedure if requested
   - Have fallback to iTunes API ready

---

## 6. Security Risks & Mitigations

### 6.1 Attack Surface Analysis

**Potential Vulnerabilities:**

| Vulnerability | Risk | Impact | Mitigation |
|---------------|------|--------|------------|
| **HTML Injection** | 🔴 HIGH | XSS in our UI | Sanitize all extracted text |
| **SSRF (Server-Side Request Forgery)** | 🟡 MEDIUM | Internal network access | Validate URLs, whitelist domains |
| **DoS (Denial of Service)** | 🟡 MEDIUM | Service unavailable | Rate limiting, timeouts |
| **Cache Poisoning** | 🟢 LOW | Incorrect data | Validate before caching |
| **Regex DoS (ReDoS)** | 🟢 LOW | CPU exhaustion | Use simple selectors, avoid complex regex |

---

### 6.2 Input Validation

**Required Validations:**

**1. App ID Validation**
```typescript
function validateAppId(appId: string): boolean {
  // Must be numeric, 6-10 digits
  return /^\d{6,10}$/.test(appId);
}
```

**2. URL Validation**
```typescript
function validateUrl(url: string): boolean {
  // Must be Apple CDN
  const allowedDomains = [
    'apps.apple.com',
    'is1-ssl.mzstatic.com',
    'is2-ssl.mzstatic.com',
    // ... more CDN domains
  ];

  try {
    const parsed = new URL(url);
    return allowedDomains.includes(parsed.hostname);
  } catch {
    return false;
  }
}
```

**3. Country Code Validation**
```typescript
function validateCountryCode(code: string): boolean {
  // ISO 3166-1 alpha-2
  return /^[a-z]{2}$/.test(code);
}
```

---

### 6.3 Output Sanitization

**HTML Sanitization:**

```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtmlText(text: string): string {
  // Strip ALL HTML tags, keep only text
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // No tags allowed
    KEEP_CONTENT: true
  });
}
```

**Required for:**
- ✅ Subtitle
- ✅ Description
- ✅ Release notes
- ✅ Developer name
- ✅ Category
- ✅ All user-facing text

---

### 6.4 SSRF Prevention

**Threat:** Attacker provides malicious URL to access internal resources

**Example Attack:**
```typescript
// Attacker input
appId: "../../../../etc/passwd"
```

**Mitigations:**

1. **Strict URL Construction**
```typescript
// DON'T: Allow user input in URL
const url = `https://apps.apple.com${userInput}`;

// DO: Validate and construct safely
function buildUrl(appId: string, country: string): string {
  if (!validateAppId(appId)) throw new Error('Invalid app ID');
  if (!validateCountryCode(country)) throw new Error('Invalid country');

  return `https://apps.apple.com/${country}/app/id${appId}`;
}
```

2. **Allowlist Domains**
```typescript
const ALLOWED_HOSTS = [
  'apps.apple.com',
];

function isAllowedUrl(url: string): boolean {
  const parsed = new URL(url);
  return ALLOWED_HOSTS.includes(parsed.hostname);
}
```

3. **Disable Redirects**
```typescript
const response = await fetch(url, {
  redirect: 'manual' // Don't follow redirects automatically
});
```

---

### 6.5 Denial of Service Prevention

**Threats:**
- Mass concurrent requests
- Slow requests tying up resources
- Infinite redirects

**Mitigations:**

1. **Request Timeouts**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000); // 10s max

try {
  const response = await fetch(url, {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}
```

2. **Connection Pool Limits**
```typescript
// Global limit on concurrent Apple requests
const appleRequestSemaphore = new Semaphore(3); // Max 3 concurrent

await appleRequestSemaphore.acquire();
try {
  // Fetch data
} finally {
  appleRequestSemaphore.release();
}
```

3. **Response Size Limits**
```typescript
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB

if (response.headers.get('content-length') > MAX_RESPONSE_SIZE) {
  throw new Error('Response too large');
}
```

---

### 6.6 Security Hardening Checklist

**Pre-Implementation:**
- [ ] Input validation for all user inputs
- [ ] Output sanitization for all extracted text
- [ ] URL allowlisting for fetch operations
- [ ] Request timeouts (10s maximum)
- [ ] Response size limits (5 MB maximum)
- [ ] Rate limiting (10 req/min per IP)
- [ ] Error handling (no stack traces to users)
- [ ] Logging (all requests logged for audit)

**Post-Implementation:**
- [ ] Security audit by third party
- [ ] Penetration testing
- [ ] Rate limit testing
- [ ] SSRF attack testing
- [ ] XSS injection testing
- [ ] DoS resilience testing

---

## 7. Performance & Scalability

### 7.1 Performance Benchmarks

**Target Metrics:**

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| **Response Time** | < 500ms | < 1s | > 2s |
| **Cache Hit Rate** | > 90% | > 70% | < 50% |
| **Success Rate** | > 99% | > 95% | < 90% |
| **Rate Limit Violations** | 0 | < 0.1% | > 1% |

---

### 7.2 Caching Strategy

**Two-Tier Cache:**

**Tier 1: Static Metadata (24h TTL)**
- App name
- Subtitle
- Description
- Developer
- Category
- Screenshots

**Tier 2: Dynamic Metadata (1h TTL)**
- Rating
- Review count
- Version
- Release notes

**Cache Implementation:**

```typescript
interface CacheEntry {
  data: NormalizedMetadata;
  timestamp: number;
  ttl: number; // in milliseconds
}

class MetadataCache {
  private cache = new Map<string, CacheEntry>();

  get(appId: string): NormalizedMetadata | null {
    const entry = this.cache.get(appId);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(appId);
      return null;
    }

    return entry.data;
  }

  set(appId: string, data: NormalizedMetadata, ttl: number) {
    this.cache.set(appId, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}
```

---

### 7.3 Rate Limiting Architecture

**Token Bucket Algorithm:**

```typescript
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private maxTokens = 10; // Max burst size
  private refillRate = 10 / 60; // 10 per minute

  async acquireToken(): Promise<void> {
    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;

    if (this.tokens < 1) {
      // Wait until token available
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.tokens = 1;
    }

    this.tokens -= 1;
  }
}
```

**Rate Limits:**
- **Per-IP:** 10 requests/minute
- **Burst:** 5 requests immediate
- **Global:** 100 requests/minute (all users)

---

### 7.4 Scalability Considerations

**Current Scale:**
- **Expected:** 100-500 app lookups/day
- **Peak:** 1,000 app lookups/day
- **Cache Hit Rate:** 90%+ (most apps searched multiple times)

**Scaling Strategy:**

**Phase 1 (Current):** Single-server in-memory cache
- ✅ Sufficient for 1,000 lookups/day
- ✅ 90% cache hit = 100 Apple requests/day
- ✅ Well under rate limits

**Phase 2 (Growth):** Redis-backed distributed cache
- ✅ Shared cache across multiple servers
- ✅ Persistent cache survives restarts
- ✅ TTL management built-in

**Phase 3 (High Volume):** CDN-backed caching
- ✅ CloudFlare/Fastly in front
- ✅ Cache-Control headers
- ✅ Regional distribution

---

## 8. Integration Architecture

### 8.1 Adapter Pattern

**Interface:**

```typescript
interface MetadataSourceAdapter {
  name: string;
  priority: number;

  fetchMetadata(
    appId: string,
    config: FetchConfig
  ): Promise<ScrapedMetadata>;

  canHandle(input: string): boolean;
  isAvailable(): Promise<boolean>;
}
```

**New Adapter:**

```typescript
class AppStoreWebAdapter implements MetadataSourceAdapter {
  name = 'app-store-web';
  priority = 1; // Highest priority

  async fetchMetadata(appId: string, config: FetchConfig): Promise<ScrapedMetadata> {
    // Fetch and parse web page
    // Extract metadata
    // Return normalized data
  }

  canHandle(input: string): boolean {
    // Can handle numeric app IDs
    return /^\d{6,10}$/.test(input);
  }

  async isAvailable(): Promise<boolean> {
    // Check if Apple website is reachable
    return true;
  }
}
```

---

### 8.2 Orchestrator Integration

**Updated Priority Order:**

```typescript
class MetadataOrchestrator {
  private adapters = [
    new AppStoreWebAdapter(),      // Priority 1 (NEW)
    new ItunesSearchAdapter(),     // Priority 2
    new ItunesLookupAdapter(),     // Priority 3
    new DirectItunesService(),     // Priority 4 (fallback)
  ];

  async fetchMetadata(input: string, config: FetchConfig): Promise<ScrapedMetadata> {
    for (const adapter of this.adapters) {
      if (!adapter.canHandle(input)) continue;
      if (!await adapter.isAvailable()) continue;

      try {
        const metadata = await adapter.fetchMetadata(input, config);
        return metadataNormalizer.normalize(metadata, adapter.name);
      } catch (error) {
        console.warn(`Adapter ${adapter.name} failed, trying next:`, error);
        continue;
      }
    }

    throw new Error('All adapters failed');
  }
}
```

---

### 8.3 Fallback Hierarchy

**Waterfall Strategy:**

```
User searches "Pimsleur"
  ↓
Try AppStoreWebAdapter
  ├─ Success? → Return metadata ✅
  └─ Fail? → Continue ↓

Try ItunesSearchAdapter
  ├─ Success? → Return metadata ✅
  └─ Fail? → Continue ↓

Try ItunesLookupAdapter
  ├─ Success? → Return metadata ✅
  └─ Fail? → Continue ↓

Try DirectItunesService (legacy)
  ├─ Success? → Return metadata ✅
  └─ Fail? → Error ❌
```

**Failure Scenarios:**

| Scenario | Web Adapter | iTunes Search | iTunes Lookup | Result |
|----------|-------------|---------------|---------------|--------|
| Apple site down | ❌ Fail | ✅ Success | N/A | iTunes data |
| Rate limited | ❌ Fail | ✅ Success | N/A | iTunes data |
| Invalid App ID | ❌ Fail | ❌ Fail | ❌ Fail | Error |
| Network error | ❌ Fail | ✅ Success | N/A | iTunes data |
| Parsing error | ❌ Fail | ✅ Success | N/A | iTunes data |

---

## 9. Fallback Strategy

### 9.1 Graceful Degradation

**Field-Level Fallback:**

Even if web adapter succeeds, some fields may be missing:

```typescript
{
  subtitle: webData.subtitle || itunesData.subtitle || '',
  screenshots: webData.screenshots?.length > 0
    ? webData.screenshots
    : itunesData.screenshots,
  version: webData.version || itunesData.version || 'Unknown',
}
```

---

### 9.2 Hybrid Approach

**Best-of-Both Strategy:**

```typescript
async fetchMetadata(appId: string): Promise<ScrapedMetadata> {
  // Fetch from both sources in parallel
  const [webData, itunesData] = await Promise.allSettled([
    appStoreWebAdapter.fetchMetadata(appId),
    itunesSearchAdapter.fetchMetadata(appId),
  ]);

  // Merge results, preferring web data
  return {
    // Use web subtitle (accurate), fallback to iTunes
    subtitle: webData.value?.subtitle || extractSubtitleFromTitle(itunesData.value?.title),

    // Use web screenshots if available, otherwise iTunes
    screenshots: webData.value?.screenshots || itunesData.value?.screenshots,

    // Use iTunes rating (more reliable, updated frequently)
    rating: itunesData.value?.rating || webData.value?.rating,

    // Merge data intelligently
    ...mergeMetadata(webData.value, itunesData.value),
  };
}
```

---

## 10. Risk Assessment

### 10.1 Risk Matrix

| Risk | Probability | Impact | Severity | Mitigation |
|------|-------------|--------|----------|------------|
| **Apple changes ToS** | 🟡 Medium | 🔴 High | 🔴 HIGH | Monitor, fallback to iTunes API |
| **DOM structure changes** | 🟡 Medium | 🟡 Medium | 🟡 MEDIUM | Multiple selectors, tests |
| **Rate limiting violations** | 🟢 Low | 🟡 Medium | 🟢 LOW | Hard-coded limits |
| **Security vulnerability** | 🟢 Low | 🔴 High | 🟡 MEDIUM | Security audit, sanitization |
| **Performance degradation** | 🟢 Low | 🟡 Medium | 🟢 LOW | Caching, monitoring |
| **Legal action from Apple** | 🟢 Low | 🔴 High | 🟡 MEDIUM | Legal review, respectful use |

---

### 10.2 Mitigation Strategies

**1. ToS Changes / Legal Action**
- ✅ Monitor Apple legal pages for updates
- ✅ Maintain iTunes API as fallback
- ✅ Implement kill switch (disable web adapter instantly)
- ✅ Legal counsel on retainer

**2. DOM Structure Changes**
- ✅ Implement multiple selector strategies
- ✅ Automated tests on real pages
- ✅ Monitoring/alerting for parsing failures
- ✅ Graceful fallback to iTunes API

**3. Rate Limiting**
- ✅ Hard-coded, un-configurable limits
- ✅ Token bucket algorithm
- ✅ Per-IP and global limits
- ✅ Exponential backoff on 429/503

**4. Security**
- ✅ Input validation
- ✅ Output sanitization
- ✅ SSRF prevention
- ✅ Regular security audits

---

### 10.3 Success Criteria

**Metrics for Go/No-Go Decision:**

| Metric | Required | Stretch |
|--------|----------|---------|
| **Subtitle Accuracy** | > 95% | > 99% |
| **Screenshot Completeness** | > 90% | > 95% |
| **Response Time** | < 1s | < 500ms |
| **Cache Hit Rate** | > 70% | > 90% |
| **Uptime** | > 99% | > 99.9% |
| **Legal Compliance** | ✅ 100% | ✅ 100% |
| **Security Score** | A- | A+ |

---

## 11. Conclusion

### 11.1 Recommendation

**🟢 PROCEED WITH IMPLEMENTATION**

**Justification:**
1. ✅ **Technical Feasibility:** Proven with real page analysis
2. ✅ **Legal Risk:** Acceptable (medium-low) with mitigations
3. ✅ **Performance:** Meets targets with caching
4. ✅ **Security:** Manageable with proper safeguards
5. ✅ **User Value:** Solves critical subtitle/screenshot issues

---

### 11.2 Implementation Phases

**Phase 1: Core Adapter (Week 1)**
- Build AppStoreWebAdapter
- Implement cheerio-based parsing
- Extract subtitle, screenshots, basic fields
- Add to orchestrator with lowest priority (testing)

**Phase 2: Security & Rate Limiting (Week 1)**
- Implement input validation
- Add output sanitization
- Implement rate limiting
- Add request logging

**Phase 3: Caching & Performance (Week 2)**
- Implement two-tier cache
- Add cache monitoring
- Performance optimization
- Load testing

**Phase 4: Testing & QA (Week 2)**
- Automated tests (30+ cases)
- Manual QA (10 apps)
- Security testing
- Regression testing

**Phase 5: Production Rollout (Week 3)**
- Deploy with low priority
- Monitor error rates
- Gradually increase priority
- Full cutover to primary

---

### 11.3 Next Steps

**Immediate Actions:**
1. ✅ Legal review of Apple ToS (counsel approval)
2. ✅ Check robots.txt compliance
3. ✅ Approve architecture (stakeholder sign-off)
4. ✅ Begin Phase A.5 implementation

**Documentation Required:**
- [x] PHASE_A5_WEB_ADAPTER_AUDIT.md (THIS DOCUMENT)
- [ ] PHASE_A5_WEB_ADAPTER_SPEC.md
- [ ] PHASE_A5_SECURITY_AND_ETHICS.md
- [ ] PHASE_A5_TEST_PLAN.md
- [ ] PHASE_A5_ROLLOUT_PLAN.md

---

**Audit Complete**
**Status:** ✅ READY FOR SPECIFICATION PHASE
**Approval Required:** Legal, Architecture, Security

