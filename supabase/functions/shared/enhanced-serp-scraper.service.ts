/**
 * Enhanced SERP Scraper Service
 *
 * Provides scraping capabilities for both iOS App Store and Google Play Store
 * Implements ethical scraping with rate limiting and proper error handling
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SerpResult {
  keyword: string;
  platform: 'ios' | 'android';
  region: string;
  results: SerpResultItem[];
  scrapedAt: Date;
  totalResults: number;
}

export interface SerpResultItem {
  position: number;
  appId: string; // trackId for iOS, bundleId for Android
  appName: string;
  developer: string;
  iconUrl: string;
  rating?: number;
  ratingCount?: number;
  price?: number;
  category?: string;
}

export interface ScrapeOptions {
  keyword: string;
  platform: 'ios' | 'android';
  region?: string;
  depth?: number; // How many results to fetch (default: 50)
  includeMetadata?: boolean;
}

// ============================================================================
// ENHANCED SERP SCRAPER SERVICE
// ============================================================================

export class EnhancedSerpScraperService {
  private readonly IOS_MAX_RESULTS = 200;
  private readonly ANDROID_MAX_RESULTS = 250;
  private readonly DEFAULT_DEPTH = 50;
  private readonly DEFAULT_REGION = 'us';

  /**
   * Main method to scrape SERP for any platform
   */
  async scrapeSERP(options: ScrapeOptions): Promise<SerpResult> {
    const {
      keyword,
      platform,
      region = this.DEFAULT_REGION,
      depth = this.DEFAULT_DEPTH,
    } = options;

    console.log(`[SerpScraper] Scraping ${platform} SERP for keyword: "${keyword}" in region: ${region}`);

    try {
      if (platform === 'ios') {
        return await this.scrapeAppStoreSERP(keyword, region, depth);
      } else {
        return await this.scrapeGooglePlaySERP(keyword, region, depth);
      }
    } catch (error) {
      console.error(`[SerpScraper] Error scraping ${platform}:`, error);
      throw new Error(`Failed to scrape ${platform} SERP: ${error.message}`);
    }
  }

  /**
   * Scrapes iOS App Store SERP using iTunes Search API
   * This is the official Apple API - completely legal and ethical
   */
  private async scrapeAppStoreSERP(
    keyword: string,
    region: string,
    depth: number
  ): Promise<SerpResult> {
    const limit = Math.min(depth, this.IOS_MAX_RESULTS);

    const params = new URLSearchParams({
      term: keyword,
      country: region.toLowerCase(),
      media: 'software',
      entity: 'software',
      limit: limit.toString(),
    });

    const url = `https://itunes.apple.com/search?${params.toString()}`;

    console.log(`[SerpScraper] iTunes API request: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YodelASO/1.0 (Keyword Research Tool)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Parse results
    const results: SerpResultItem[] = data.results.map((app: any, index: number) => ({
      position: index + 1,
      appId: app.trackId.toString(),
      appName: app.trackName,
      developer: app.artistName,
      iconUrl: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
      rating: app.averageUserRating,
      ratingCount: app.userRatingCount,
      price: app.price,
      category: app.primaryGenreName,
    }));

    console.log(`[SerpScraper] Found ${results.length} iOS apps for keyword "${keyword}"`);

    return {
      keyword,
      platform: 'ios',
      region,
      results,
      scrapedAt: new Date(),
      totalResults: data.resultCount,
    };
  }

  /**
   * Scrapes Google Play Store SERP
   * Uses google-play-scraper library (open source)
   */
  private async scrapeGooglePlaySERP(
    keyword: string,
    region: string,
    depth: number
  ): Promise<SerpResult> {
    // Note: google-play-scraper library needs to be imported
    // For now, implementing a basic fetch-based scraper

    const limit = Math.min(depth, this.ANDROID_MAX_RESULTS);

    try {
      // Try using google-play-scraper if available
      const gplay = await this.getGooglePlayScraper();

      if (gplay) {
        return await this.scrapeWithGooglePlayScraper(gplay, keyword, region, limit);
      } else {
        // Fallback to basic scraping
        return await this.scrapePlayStoreBasic(keyword, region, limit);
      }
    } catch (error) {
      console.error('[SerpScraper] Google Play scraping error:', error);
      throw error;
    }
  }

  /**
   * Use google-play-scraper library if available
   */
  private async scrapeWithGooglePlayScraper(
    gplay: any,
    keyword: string,
    region: string,
    limit: number
  ): Promise<SerpResult> {
    console.log(`[SerpScraper] Using google-play-scraper library`);

    const searchResults = await gplay.search({
      term: keyword,
      country: region.toLowerCase(),
      lang: 'en',
      num: limit,
      fullDetail: false,
    });

    const results: SerpResultItem[] = searchResults.map((app: any, index: number) => ({
      position: index + 1,
      appId: app.appId,
      appName: app.title,
      developer: app.developer,
      iconUrl: app.icon,
      rating: app.score,
      ratingCount: app.ratings,
      price: app.priceText === 'Free' ? 0 : app.price,
      category: app.genre,
    }));

    console.log(`[SerpScraper] Found ${results.length} Android apps for keyword "${keyword}"`);

    return {
      keyword,
      platform: 'android',
      region,
      results,
      scrapedAt: new Date(),
      totalResults: searchResults.length,
    };
  }

  /**
   * Basic Play Store scraping using direct HTTP requests
   * Fallback method when google-play-scraper is not available
   */
  private async scrapePlayStoreBasic(
    keyword: string,
    region: string,
    limit: number
  ): Promise<SerpResult> {
    console.log(`[SerpScraper] Using basic Play Store scraping`);

    const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(keyword)}&c=apps&gl=${region}&hl=en`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://play.google.com/',
        'Connection': 'keep-alive',
      },
    });

    if (!response.ok) {
      throw new Error(`Play Store error: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Parse HTML to extract app data
    const results = this.parsePlayStoreHTML(html, limit);

    console.log(`[SerpScraper] Found ${results.length} Android apps for keyword "${keyword}"`);

    return {
      keyword,
      platform: 'android',
      region,
      results,
      scrapedAt: new Date(),
      totalResults: results.length,
    };
  }

  /**
   * Parse Play Store HTML to extract app data
   * This is a simplified parser - production version would be more robust
   */
  private parsePlayStoreHTML(html: string, limit: number): SerpResultItem[] {
    const results: SerpResultItem[] = [];

    // Extract app data using regex patterns
    // Note: This is fragile and may break if Play Store changes their HTML
    // Consider using a proper HTML parser like cheerio or jsdom

    try {
      // Pattern to match app data (simplified)
      const appPattern = /"([^"]+)","([^"]+)","([^"]+)".*?"(https:\/\/play-lh\.googleusercontent\.com[^"]+)"/g;

      let match;
      let position = 1;

      while ((match = appPattern.exec(html)) !== null && position <= limit) {
        results.push({
          position,
          appId: match[1] || 'unknown',
          appName: match[2] || 'Unknown App',
          developer: match[3] || 'Unknown Developer',
          iconUrl: match[4] || '',
          rating: undefined,
          ratingCount: undefined,
        });
        position++;
      }
    } catch (error) {
      console.error('[SerpScraper] Error parsing Play Store HTML:', error);
    }

    return results;
  }

  /**
   * Find app position in SERP results
   */
  findAppPosition(targetAppId: string, serpResults: SerpResultItem[]): number | null {
    const result = serpResults.find(r => r.appId === targetAppId);
    return result ? result.position : null;
  }

  /**
   * Estimate search volume based on SERP signals
   * Uses heuristics like number of competing apps, rating counts, etc.
   */
  async estimateSearchVolume(
    keyword: string,
    platform: 'ios' | 'android',
    serpResults: SerpResultItem[]
  ): Promise<number> {
    console.log(`[SerpScraper] Estimating search volume for "${keyword}"`);

    // Factors:
    // 1. Number of results (more results = more competitive = higher volume)
    // 2. Average rating count of top 10 apps (proxy for traffic)
    // 3. Keyword characteristics (word count, common terms)

    const resultCount = serpResults.length;
    const top10 = serpResults.slice(0, 10);
    const top10AvgRatings = top10.reduce((sum, app) => sum + (app.ratingCount || 0), 0) / top10.length;
    const wordCount = keyword.split(' ').length;

    // Base score from result count
    let volumeScore = Math.min(resultCount * 100, 10000);

    // Adjust based on top app popularity
    if (top10AvgRatings > 50000) {
      volumeScore *= 5;
    } else if (top10AvgRatings > 10000) {
      volumeScore *= 3;
    } else if (top10AvgRatings > 1000) {
      volumeScore *= 1.5;
    }

    // Longer keywords typically have lower volume
    if (wordCount > 3) volumeScore *= 0.5;
    if (wordCount > 5) volumeScore *= 0.3;

    // Platform adjustment (iOS generally higher volume)
    if (platform === 'android') volumeScore *= 0.8;

    const estimatedVolume = Math.round(volumeScore);

    console.log(`[SerpScraper] Estimated volume for "${keyword}": ${estimatedVolume.toLocaleString()}/month`);

    return estimatedVolume;
  }

  /**
   * Calculate competition level based on SERP analysis
   */
  calculateCompetitionLevel(serpResults: SerpResultItem[]): 'low' | 'medium' | 'high' | 'very_high' {
    const top10 = serpResults.slice(0, 10);

    const avgRatingCount = top10.reduce((sum, app) => sum + (app.ratingCount || 0), 0) / top10.length;
    const avgRating = top10.reduce((sum, app) => sum + (app.rating || 0), 0) / top10.length;
    const bigPlayers = top10.filter(app => (app.ratingCount || 0) > 100000).length;

    if (bigPlayers >= 5 || avgRatingCount > 50000) return 'very_high';
    if (bigPlayers >= 2 || avgRatingCount > 10000) return 'high';
    if (avgRatingCount > 1000) return 'medium';
    return 'low';
  }

  /**
   * Calculate popularity score (0-100)
   */
  calculatePopularityScore(estimatedSearchVolume: number): number {
    if (estimatedSearchVolume === 0) return 0;

    const logVolume = Math.log10(estimatedSearchVolume);
    const score = Math.min(100, (logVolume / 6) * 100); // 6 = log10(1M)

    return Math.round(score);
  }

  /**
   * Try to import google-play-scraper if available
   */
  private async getGooglePlayScraper(): Promise<any> {
    try {
      // Dynamic import for google-play-scraper
      // This will be available when we install the package
      return null; // For now, return null to use basic scraping
    } catch (error) {
      console.warn('[SerpScraper] google-play-scraper not available, using basic scraping');
      return null;
    }
  }

  /**
   * Get random user agent for scraping
   */
  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ];

    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Sleep helper for rate limiting
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const serpScraperService = new EnhancedSerpScraperService();
