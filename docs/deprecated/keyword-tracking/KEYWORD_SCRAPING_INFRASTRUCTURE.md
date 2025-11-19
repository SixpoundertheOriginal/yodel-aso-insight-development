# Keyword Scraping Infrastructure - Deep Dive

## 1. How We'll Power the Scraping

### 1.1 Scraping Architecture Overview

To compete with AppTweak and Sensor Tower, we need a robust, scalable scraping infrastructure:

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Requests Layer                         │
│  - On-demand keyword checks                                      │
│  - Discovery requests                                            │
│  - Competitor analysis                                           │
└─────────────────────────────────────────────────────────────────┘
                              ║
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Job Queue & Scheduler                          │
│  - Supabase Edge Functions (cron)                               │
│  - Priority queue (high/normal/low)                             │
│  - Rate limiting coordinator                                     │
│  - Retry management                                              │
└─────────────────────────────────────────────────────────────────┘
                              ║
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Scraping Orchestrator                           │
│  - Load balancing across workers                                │
│  - Geographic distribution (multi-region)                       │
│  - Request routing (iOS vs Android)                             │
│  - Session management                                            │
└─────────────────────────────────────────────────────────────────┘
                              ║
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Scraping Workers                              │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  iOS Scraper     │  │ Android Scraper  │                    │
│  │  - iTunes API    │  │ - Play Store Web │                    │
│  │  - App Store Web │  │ - Play Store API │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Volume Estimator │  │ SERP Analyzer    │                    │
│  │ - Trend analysis │  │ - Position track │                    │
│  │ - ML predictions │  │ - Competitor ID  │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                              ║
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Anti-Detection & Proxy Layer                        │
│  - Residential proxy rotation                                    │
│  - User-Agent rotation                                           │
│  - Request fingerprinting randomization                         │
│  - CAPTCHA solving (when needed)                                │
│  - Cookie/session management                                     │
└─────────────────────────────────────────────────────────────────┘
                              ║
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Data Storage & Caching                          │
│  - PostgreSQL (structured data)                                  │
│  - Redis (rate limiting, sessions)                              │
│  - S3/Storage (raw HTML snapshots for debugging)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Scraping Technologies & Libraries

### 2.1 iOS App Store Scraping

**Method 1: iTunes Search API (Official, Recommended)**

```typescript
// Primary method - fast, reliable, no blocking risk
interface iTunesSearchConfig {
  term: string;        // Keyword to search
  country: string;     // 'us', 'gb', 'de', etc.
  media: 'software';
  entity: 'software';
  limit: 200;          // Max results per request
  lang?: string;       // Optional language
}

// Example implementation
class iTunesSearchScraper {
  private baseUrl = 'https://itunes.apple.com/search';

  async searchKeyword(keyword: string, country: string): Promise<AppResult[]> {
    const params = new URLSearchParams({
      term: keyword,
      country: country,
      media: 'software',
      entity: 'software',
      limit: '200'
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: {
        'User-Agent': 'YodelASO/1.0',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    return this.parseResults(data.results);
  }
}
```

**Method 2: App Store Web Scraping (Fallback)**

```typescript
// For data not available in iTunes API (like Featured positions)
import * as cheerio from 'cheerio';

class AppStoreWebScraper {
  async scrapeSearchResults(keyword: string, country: string): Promise<AppResult[]> {
    // 1. Construct App Store search URL
    const url = `https://apps.apple.com/${country}/search?term=${encodeURIComponent(keyword)}`;

    // 2. Fetch with browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.apple.com/',
        'Connection': 'keep-alive'
      }
    });

    const html = await response.text();

    // 3. Parse with Cheerio
    const $ = cheerio.load(html);
    const results: AppResult[] = [];

    $('.search-result').each((index, element) => {
      const $el = $(element);
      results.push({
        position: index + 1,
        appId: $el.attr('data-track-id'),
        appName: $el.find('.app-name').text(),
        developer: $el.find('.developer-name').text(),
        iconUrl: $el.find('.app-icon').attr('src'),
        rating: parseFloat($el.find('.rating').text()),
        ratingCount: parseInt($el.find('.rating-count').text())
      });
    });

    return results;
  }
}
```

### 2.2 Google Play Store Scraping

**Method 1: google-play-scraper Library (Open Source)**

```typescript
import gplay from 'google-play-scraper';

class GooglePlayScraper {
  async searchKeyword(keyword: string, country: string): Promise<AppResult[]> {
    try {
      const results = await gplay.search({
        term: keyword,
        country: country,
        lang: 'en',
        num: 250,  // Max results
        fullDetail: false
      });

      return results.map((app, index) => ({
        position: index + 1,
        appId: app.appId,
        appName: app.title,
        developer: app.developer,
        iconUrl: app.icon,
        rating: app.score,
        ratingCount: app.ratings
      }));
    } catch (error) {
      // Fallback to custom scraper
      return this.customPlayStoreScraper(keyword, country);
    }
  }
}
```

**Method 2: Puppeteer/Playwright (Browser Automation)**

For more reliable scraping with JavaScript rendering:

```typescript
import { chromium } from 'playwright';

class PlayStoreBrowserScraper {
  async searchKeyword(keyword: string, country: string): Promise<AppResult[]> {
    // Launch headless browser
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      locale: this.getLocale(country),
      geolocation: this.getGeolocation(country),
      permissions: ['geolocation'],
      userAgent: this.getRandomUserAgent()
    });

    const page = await context.newPage();

    try {
      // Navigate to Play Store search
      const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(keyword)}&c=apps&gl=${country}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle' });

      // Wait for results to load
      await page.waitForSelector('[data-ds-package-name]', { timeout: 10000 });

      // Extract app data
      const apps = await page.$$eval('[data-ds-package-name]', (elements) => {
        return elements.map((el, index) => ({
          position: index + 1,
          appId: el.getAttribute('data-ds-package-name'),
          appName: el.querySelector('.DdYX5')?.textContent,
          developer: el.querySelector('.wMUdtb')?.textContent,
          iconUrl: el.querySelector('img')?.src,
          rating: parseFloat(el.querySelector('.w2kbF')?.textContent || '0'),
          ratingCount: el.querySelector('.EHUI5b')?.textContent
        }));
      });

      return apps;
    } finally {
      await browser.close();
    }
  }
}
```

### 2.3 Recommended Tech Stack

**Core Libraries:**

```json
{
  "dependencies": {
    // Scraping
    "google-play-scraper": "^9.1.3",
    "app-store-scraper": "^1.2.0",
    "cheerio": "^1.0.0-rc.12",
    "playwright": "^1.40.0",

    // HTTP clients
    "axios": "^1.6.0",
    "node-fetch": "^3.3.0",

    // Proxy management
    "proxy-agent": "^6.3.0",
    "rotating-proxy": "^2.1.0",

    // Rate limiting
    "bottleneck": "^2.19.5",
    "redis": "^4.6.0",

    // Data parsing
    "jsdom": "^23.0.0",
    "htmlparser2": "^9.1.0",

    // Anti-detection
    "puppeteer-extra": "^3.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2",

    // ML for volume estimation
    "@tensorflow/tfjs-node": "^4.15.0",
    "natural": "^6.10.0"
  }
}
```

---

## 3. Multi-Market Keyword Research Capabilities

To compete with enterprise tools, we need comprehensive multi-market support:

### 3.1 Supported Markets

**Target: 150+ markets (all App Store/Play Store regions)**

**Priority Tier 1 (Immediate):**
- 🇺🇸 United States (us)
- 🇬🇧 United Kingdom (gb)
- 🇨🇦 Canada (ca)
- 🇦🇺 Australia (au)
- 🇩🇪 Germany (de)
- 🇫🇷 France (fr)
- 🇪🇸 Spain (es)
- 🇮🇹 Italy (it)
- 🇯🇵 Japan (jp)
- 🇰🇷 South Korea (kr)
- 🇧🇷 Brazil (br)
- 🇲🇽 Mexico (mx)
- 🇮🇳 India (in)
- 🇨🇳 China (cn)

**Priority Tier 2 (Phase 2):**
- All European countries (30+)
- Major Asian markets (15+)
- Latin America (10+)
- Middle East (8+)

### 3.2 Geographic Proxy Infrastructure

**Proxy Requirements:**

```typescript
interface ProxyConfig {
  country: string;           // Target country code
  city?: string;             // City for more precise geo-targeting
  provider: 'residential' | 'datacenter' | 'mobile';
  rotation: 'per_request' | 'session' | 'time_based';
}

class ProxyManager {
  private proxyPools: Map<string, ProxyPool> = new Map();

  // Initialize proxy pools for each target market
  async initialize() {
    const markets = ['us', 'gb', 'de', 'fr', 'es', 'jp', 'br', 'in'];

    for (const market of markets) {
      this.proxyPools.set(market, new ProxyPool({
        country: market,
        provider: 'residential',  // More expensive but harder to detect
        poolSize: 50,             // 50 proxies per market
        rotation: 'per_request'
      }));
    }
  }

  // Get proxy for specific market
  async getProxyForMarket(market: string): Promise<Proxy> {
    const pool = this.proxyPools.get(market);
    if (!pool) {
      throw new Error(`No proxy pool for market: ${market}`);
    }

    return pool.getNextProxy();
  }
}
```

**Recommended Proxy Providers:**

1. **Bright Data (formerly Luminati)** - Best for enterprise
   - Residential proxies in 195 countries
   - ~$12.75/GB
   - High success rate

2. **Smartproxy** - Good balance
   - 40M+ residential IPs
   - ~$7/GB
   - Good for scaling

3. **Oxylabs** - Premium option
   - ~$8/GB
   - Excellent reliability

**Monthly Cost Estimate:**
- 10K keywords/day across 10 markets = ~300K requests/month
- Average response size: 200KB
- Data usage: ~60GB/month
- **Cost: $450-750/month** for proxies

### 3.3 Multi-Market Search Volume Estimation

**Challenge:** iTunes API and Play Store don't provide search volume.

**Solution: Multi-Source Data Aggregation**

```typescript
class MultiSourceVolumeEstimator {
  /**
   * Aggregate volume signals from multiple sources
   */
  async estimateSearchVolume(
    keyword: string,
    platform: 'ios' | 'android',
    market: string
  ): Promise<number> {
    const signals: VolumeSignal[] = [];

    // Signal 1: SERP competition analysis
    signals.push(await this.analyzeSerpCompetition(keyword, platform, market));

    // Signal 2: Google Trends data
    signals.push(await this.getGoogleTrendsData(keyword, market));

    // Signal 3: App review velocity
    signals.push(await this.analyzeReviewVelocity(keyword, platform, market));

    // Signal 4: Category popularity
    signals.push(await this.getCategoryPopularity(keyword, platform, market));

    // Signal 5: Historical data (if available)
    signals.push(await this.getHistoricalData(keyword, platform, market));

    // Aggregate signals using ML model
    return this.aggregateSignals(signals);
  }

  /**
   * Use Google Trends as proxy for search interest
   */
  private async getGoogleTrendsData(
    keyword: string,
    market: string
  ): Promise<VolumeSignal> {
    // Use google-trends-api library
    const trends = await googleTrends.interestOverTime({
      keyword: keyword,
      geo: market.toUpperCase(),
      category: 'Computer & Electronics > Mobile Apps'
    });

    // Normalize to 0-100 scale
    const avgInterest = trends.averageInterest;

    return {
      source: 'google_trends',
      value: avgInterest,
      confidence: 0.7
    };
  }

  /**
   * Analyze SERP competition signals
   */
  private async analyzeSerpCompetition(
    keyword: string,
    platform: 'ios' | 'android',
    market: string
  ): Promise<VolumeSignal> {
    const serp = await this.scrapeSERP(keyword, platform, market);

    // Factors:
    // 1. Number of results
    // 2. Quality of apps (avg rating count of top 10)
    // 3. Presence of major publishers

    const resultCount = serp.length;
    const top10AvgRatings = this.averageRatingCount(serp.slice(0, 10));
    const hasMajorPublishers = this.detectMajorPublishers(serp);

    let score = 0;

    // More results = higher volume
    score += Math.min(resultCount / 50 * 30, 30);  // Max 30 points

    // Higher review counts = more popular category
    if (top10AvgRatings > 100000) score += 40;
    else if (top10AvgRatings > 50000) score += 30;
    else if (top10AvgRatings > 10000) score += 20;
    else if (top10AvgRatings > 1000) score += 10;

    // Major publishers indicate valuable keyword
    if (hasMajorPublishers) score += 30;

    return {
      source: 'serp_competition',
      value: score,
      confidence: 0.8
    };
  }

  /**
   * Aggregate signals using weighted average
   * Can be enhanced with ML model
   */
  private aggregateSignals(signals: VolumeSignal[]): number {
    const totalWeight = signals.reduce((sum, s) => sum + s.confidence, 0);
    const weightedSum = signals.reduce((sum, s) => sum + (s.value * s.confidence), 0);

    const normalizedScore = weightedSum / totalWeight;

    // Convert score (0-100) to estimated monthly searches
    return this.scoreToSearchVolume(normalizedScore);
  }

  /**
   * Convert 0-100 score to estimated monthly searches
   */
  private scoreToSearchVolume(score: number): number {
    // Logarithmic scale
    // Score 0 = 0 searches
    // Score 50 = 10K searches
    // Score 75 = 100K searches
    // Score 100 = 1M+ searches

    if (score === 0) return 0;

    return Math.round(Math.pow(10, (score / 25) + 1));
  }
}
```

### 3.4 Market-Specific Keyword Intelligence

**Local Language Support:**

```typescript
class LocalizedKeywordAnalyzer {
  /**
   * Analyze keyword relevance in local market
   */
  async analyzeLocalRelevance(
    keyword: string,
    market: string
  ): Promise<LocalRelevance> {
    // 1. Detect language
    const language = this.detectLanguage(keyword);

    // 2. Check if keyword matches market language
    const marketLanguages = this.getMarketLanguages(market);
    const isNativeLanguage = marketLanguages.includes(language);

    // 3. Translate if needed
    let localizedKeyword = keyword;
    if (!isNativeLanguage && marketLanguages.length > 0) {
      localizedKeyword = await this.translate(keyword, marketLanguages[0]);
    }

    // 4. Check local search trends
    const localTrends = await this.getLocalTrends(localizedKeyword, market);

    return {
      originalKeyword: keyword,
      localizedKeyword,
      isNativeLanguage,
      relevanceScore: this.calculateRelevance(localTrends),
      suggestedAlternatives: await this.getSuggestedLocalKeywords(keyword, market)
    };
  }

  /**
   * Get market-specific keyword suggestions
   */
  async getSuggestedLocalKeywords(
    seedKeyword: string,
    market: string
  ): Promise<string[]> {
    // 1. Find top apps in market for this category
    const topApps = await this.getTopAppsInMarket(market);

    // 2. Extract keywords from their metadata
    const extractedKeywords = await this.extractKeywordsFromApps(topApps);

    // 3. Filter by relevance to seed keyword
    const relevant = extractedKeywords.filter(kw =>
      this.calculateSimilarity(kw, seedKeyword) > 0.6
    );

    return relevant.slice(0, 20);
  }
}
```

---

## 4. Enterprise-Level Capabilities Needed

To truly compete with AppTweak and Sensor Tower:

### 4.1 Core Capabilities Comparison

| Feature | AppTweak | Sensor Tower | **Our System (Target)** |
|---------|----------|--------------|------------------------|
| **Keyword Tracking** |
| Max keywords per app | Unlimited | Unlimited | Unlimited ✅ |
| Ranking refresh | Daily | Daily | Daily + On-demand ✅ |
| Markets supported | 150+ | 150+ | 150+ (Phase 2) 🚧 |
| Historical data | 5 years | 5 years | Growing ✅ |
| Top N positions tracked | 100 | 100 | 50 → 100 (Phase 2) 🚧 |
| **Search Volume** |
| Real volume data | Yes (estimated) | Yes (estimated) | Yes (ML-based) ✅ |
| Volume by market | Yes | Yes | Yes ✅ |
| Trend data | Yes | Yes | Yes (Google Trends) ✅ |
| **Discovery** |
| Auto keyword discovery | Yes | Yes | Yes ✅ |
| Competitor keywords | Yes | Yes | Yes ✅ |
| AI suggestions | Yes | Yes | Yes (planned) 🚧 |
| Keyword gap analysis | Yes | Yes | Yes ✅ |
| **Competitor Intelligence** |
| Track competitors | Yes | Yes | Yes ✅ |
| Competitive positioning | Yes | Yes | Yes ✅ |
| Market share estimates | Yes | Yes | Planned 🚧 |
| **Advanced Features** |
| Category rankings | Yes | Yes | Planned 🚧 |
| Organic vs paid traffic | Yes | Yes | Planned 🚧 |
| Conversion tracking | No | Limited | Planned 🚧 |
| A/B testing integration | Limited | Limited | Planned 🚧 |
| API access | Yes | Yes | Yes ✅ |
| Custom reports | Yes | Yes | Yes ✅ |
| **Pricing** |
| Entry tier | ~$79/mo | ~$99/mo | **Competitive** 💰 |

### 4.2 Additional Capabilities to Build

**Phase 1 (Months 1-3):**
- ✅ Basic keyword tracking (iOS + Android)
- ✅ 15 priority markets
- ✅ Auto-discovery
- ✅ Daily refresh
- ✅ Basic metrics (position, volume estimate, trend)

**Phase 2 (Months 4-6):**
- 🚧 Expand to 150+ markets
- 🚧 Advanced volume estimation (ML model)
- 🚧 Keyword suggestions engine
- 🚧 Category rankings
- 🚧 Localized keyword intelligence

**Phase 3 (Months 7-9):**
- 🚧 Real-time tracking (hourly updates for priority keywords)
- 🚧 Predictive analytics (forecast ranking changes)
- 🚧 Organic vs paid traffic attribution
- 🚧 Conversion tracking integration
- 🚧 Advanced competitor intelligence

**Phase 4 (Months 10-12):**
- 🚧 A/B testing platform for metadata
- 🚧 Automated ASO recommendations
- 🚧 Market share estimation
- 🚧 ROI calculator
- 🚧 White-label solutions

---

## 5. Advanced Scraping Techniques

### 5.1 Anti-Detection Measures

**Browser Fingerprinting Randomization:**

```typescript
import { chromium } from 'playwright';
import { FingerprintGenerator } from 'fingerprint-generator';

class StealthScraper {
  async createStealthBrowser() {
    const fingerprintGenerator = new FingerprintGenerator();
    const fingerprint = fingerprintGenerator.getFingerprint();

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ]
    });

    const context = await browser.newContext({
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezone,
      screen: fingerprint.screen,
      colorScheme: fingerprint.colorScheme,
      // Add WebGL, Canvas, Audio fingerprints
      ...fingerprint.webgl,
      ...fingerprint.canvas
    });

    // Override navigator properties
    await context.addInitScript(() => {
      // Remove webdriver flag
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });

      // Randomize plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [/* randomized plugin list */]
      });
    });

    return context;
  }
}
```

**Request Pattern Randomization:**

```typescript
class HumanLikeBehavior {
  /**
   * Add human-like delays between requests
   */
  async randomDelay(min: number = 2000, max: number = 5000) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate human browsing behavior
   */
  async simulateHumanBrowsing(page: Page) {
    // Random mouse movements
    await page.mouse.move(
      Math.random() * 800,
      Math.random() * 600,
      { steps: 10 }
    );

    // Random scrolling
    await page.evaluate(() => {
      window.scrollBy({
        top: Math.random() * 500,
        behavior: 'smooth'
      });
    });

    // Random wait
    await this.randomDelay(500, 1500);
  }

  /**
   * Vary request patterns
   */
  async varyRequestPattern() {
    // Sometimes visit homepage first
    if (Math.random() > 0.7) {
      await this.visitHomepage();
    }

    // Sometimes search for related terms first
    if (Math.random() > 0.5) {
      await this.searchRelatedTerm();
    }
  }
}
```

### 5.2 CAPTCHA Handling

**Strategy 1: Avoid CAPTCHAs (Primary)**
- Use residential proxies
- Respect rate limits
- Randomize behavior
- Use official APIs when available

**Strategy 2: CAPTCHA Solving (Fallback)**

```typescript
import { CaptchaSolver } from '2captcha';

class CaptchaHandler {
  private solver = new CaptchaSolver(process.env.CAPTCHA_API_KEY);

  async handleCaptcha(page: Page): Promise<boolean> {
    // Detect CAPTCHA
    const captchaElement = await page.$('[data-recaptcha], [data-hcaptcha]');

    if (!captchaElement) return false;

    // Get site key
    const siteKey = await captchaElement.getAttribute('data-sitekey');
    const pageUrl = page.url();

    // Solve CAPTCHA using 2Captcha service
    const solution = await this.solver.recaptcha({
      googlekey: siteKey,
      pageurl: pageUrl
    });

    // Submit solution
    await page.evaluate((token) => {
      document.querySelector('[name="g-recaptcha-response"]').value = token;
      document.querySelector('form').submit();
    }, solution);

    return true;
  }
}
```

**CAPTCHA Service Costs:**
- 2Captcha: $2.99 per 1000 CAPTCHAs
- Anti-Captcha: $1-3 per 1000 CAPTCHAs
- Expected usage: <100/month if scraping is done right
- **Cost: ~$5-10/month**

---

## 6. Data Processing Pipeline

### 6.1 Real-Time Processing

```typescript
class KeywordDataPipeline {
  async processScrapedData(rawData: RawSerpData): Promise<ProcessedKeywordData> {
    // Stage 1: Validation
    const validated = await this.validateData(rawData);

    // Stage 2: Enrichment
    const enriched = await this.enrichData(validated);

    // Stage 3: ML Enhancement
    const enhanced = await this.applyMLModels(enriched);

    // Stage 4: Storage
    await this.storeData(enhanced);

    // Stage 5: Analytics Update
    await this.updateAnalytics(enhanced);

    // Stage 6: Notifications
    await this.checkAlertsAndNotify(enhanced);

    return enhanced;
  }

  /**
   * Apply ML models for better accuracy
   */
  private async applyMLModels(data: EnrichedData): Promise<EnhancedData> {
    return {
      ...data,
      // Volume prediction model
      predictedVolume: await this.volumePredictionModel.predict(data),

      // Trend prediction
      predictedTrend: await this.trendPredictionModel.predict(data),

      // Difficulty score
      difficultyScore: await this.difficultyModel.predict(data),

      // Opportunity score
      opportunityScore: await this.opportunityModel.predict(data)
    };
  }
}
```

### 6.2 Machine Learning Models

**Model 1: Search Volume Prediction**

```typescript
import * as tf from '@tensorflow/tfjs-node';

class VolumePredictor {
  private model: tf.LayersModel;

  async train(historicalData: HistoricalKeywordData[]) {
    // Features:
    // - Keyword length
    // - Word count
    // - SERP competition signals
    // - Google Trends data
    // - Category popularity
    // - Market size

    const features = this.extractFeatures(historicalData);
    const labels = historicalData.map(d => d.actualVolume);

    // Neural network architecture
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 128, activation: 'relu', inputShape: [10] }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });

    this.model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    await this.model.fit(features, labels, {
      epochs: 100,
      validationSplit: 0.2,
      callbacks: tf.callbacks.earlyStopping({ patience: 10 })
    });
  }

  async predict(keywordData: KeywordData): Promise<number> {
    const features = this.extractFeatures([keywordData]);
    const prediction = this.model.predict(features) as tf.Tensor;
    const volume = (await prediction.data())[0];

    return Math.round(volume);
  }
}
```

---

## 7. Infrastructure Requirements

### 7.1 Compute Resources

**Scraping Workers:**
- **Supabase Edge Functions**: 10-20 concurrent functions
- **Alternative**: AWS Lambda, Google Cloud Functions
- **Specs per worker**:
  - 1 GB RAM
  - 10 second timeout
  - Can handle 6 requests/minute (with rate limiting)

**Background Jobs:**
- **Scheduler**: Supabase cron or AWS EventBridge
- **Queue**: Redis or AWS SQS
- **Processing**: 5-10 workers running 24/7

**Cost Estimate:**
- Supabase Edge Functions: ~$25/month (2M invocations)
- Redis: ~$15/month (256MB)
- **Total: ~$40/month compute**

### 7.2 Proxy Infrastructure

**Required:**
- **Residential proxies**: $450-750/month for 60GB
- **Coverage**: 15 markets initially, scale to 150+

**Alternatives to reduce cost:**
- Start with datacenter proxies ($50/month) for low-risk markets
- Use residential only for problematic regions
- Implement smart proxy routing (only use residential if datacenter fails)

### 7.3 Storage

**Database:**
- PostgreSQL (Supabase included)
- Estimated growth: 10GB/month
- **Cost**: Included in Supabase plan

**Object Storage (S3):**
- Store raw HTML snapshots for debugging
- ~5GB/month
- **Cost**: ~$1/month

### 7.4 Total Monthly Infrastructure Cost

| Component | Cost |
|-----------|------|
| Compute (Edge Functions, Redis) | $40 |
| Proxies (60GB residential) | $600 |
| CAPTCHA solving | $10 |
| Storage | $1 |
| Monitoring/Logging | $20 |
| **Total** | **$671/month** |

**Optimization for early stage:**
- Start with 5 priority markets → $150/month proxies
- **Reduced total: $221/month**

---

## 8. Implementation Priority

### Immediate (Week 1-2):
1. ✅ Set up basic scraping for iOS (iTunes API)
2. ✅ Set up basic scraping for Android (google-play-scraper)
3. ✅ Implement rate limiting
4. ✅ Set up 5 priority markets (US, GB, DE, FR, ES)

### Short-term (Week 3-4):
5. 🚧 Add Playwright-based fallback scrapers
6. 🚧 Implement proxy rotation
7. 🚧 Set up background job queue
8. 🚧 Build volume estimation (heuristic-based)

### Medium-term (Month 2-3):
9. 🚧 Expand to 15 markets
10. 🚧 Train ML models for volume prediction
11. 🚧 Add Google Trends integration
12. 🚧 Implement anti-detection measures

### Long-term (Month 4+):
13. 🚧 Scale to 150+ markets
14. 🚧 Advanced ML models
15. 🚧 Real-time tracking
16. 🚧 Predictive analytics

---

## 9. Monitoring & Quality Assurance

### 9.1 Scraping Health Metrics

```typescript
interface ScrapingMetrics {
  // Success rates
  successRate: number;           // Target: >95%
  successRateByMarket: Map<string, number>;
  successRateByPlatform: Map<string, number>;

  // Performance
  avgResponseTime: number;       // Target: <3 seconds
  p95ResponseTime: number;       // Target: <5 seconds

  // Rate limiting
  rateLimitHitRate: number;      // Target: <5%
  captchaEncounterRate: number;  // Target: <1%

  // Data quality
  parseErrorRate: number;        // Target: <0.1%
  incompleteDataRate: number;    // Target: <1%

  // Resource usage
  proxyUsage: number;            // GB/day
  computeUsage: number;          // Function invocations/day
}
```

### 9.2 Alerting

```typescript
class ScrapingMonitor {
  async checkHealth(): Promise<void> {
    const metrics = await this.getMetrics();

    // Alert if success rate drops
    if (metrics.successRate < 0.90) {
      await this.alert('CRITICAL', 'Scraping success rate below 90%');
    }

    // Alert if specific market failing
    for (const [market, rate] of metrics.successRateByMarket) {
      if (rate < 0.80) {
        await this.alert('WARNING', `${market} success rate below 80%`);
      }
    }

    // Alert if hitting rate limits too often
    if (metrics.rateLimitHitRate > 0.10) {
      await this.alert('WARNING', 'Rate limit hit rate above 10%');
    }
  }
}
```

---

## 10. Legal & Ethical Considerations

### 10.1 Terms of Service Compliance

**App Store (Apple):**
- ✅ iTunes Search API: Explicitly allowed for commercial use
- ⚠️ App Store Web Scraping: Gray area, use as fallback only
- ✅ Rate limiting: Respect 20 req/min guideline
- ✅ Attribution: Not required for search data

**Google Play Store:**
- ⚠️ Web scraping: Not explicitly forbidden, but use responsibly
- ✅ Rate limiting: Keep to <30 req/min
- ✅ Robots.txt: Respect directives
- ✅ Public data only: Don't scrape private/restricted content

**Best Practices:**
- Always check robots.txt
- Implement conservative rate limits
- Use official APIs whenever available
- Don't scrape user-generated content without permission
- Don't scrape paid/premium content

### 10.2 Data Privacy

- Don't store personal user data
- Anonymize any user reviews/comments
- Comply with GDPR/CCPA for user data
- Clear data retention policies

---

## Summary

To compete with AppTweak and Sensor Tower, we'll build:

**Scraping Infrastructure:**
- iTunes Search API (primary for iOS)
- google-play-scraper + Playwright (for Android)
- Residential proxy rotation (15+ markets)
- Anti-detection measures
- Rate limiting and ethical scraping

**Intelligence Layer:**
- ML-based search volume estimation
- Google Trends integration
- Multi-source signal aggregation
- Predictive analytics

**Scale:**
- Start: 5 markets, basic tracking
- Phase 2: 15 markets, ML models
- Phase 3: 150+ markets, enterprise features

**Cost:**
- Initial: ~$221/month (5 markets)
- Scale: ~$671/month (15 markets)
- Enterprise: ~$2000/month (150 markets)

This infrastructure will allow us to provide keyword tracking that rivals enterprise solutions while maintaining ethical scraping practices and scalability.
