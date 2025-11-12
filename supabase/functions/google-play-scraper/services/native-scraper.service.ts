/**
 * Native Deno Google Play Scraper
 * Uses fetch() to scrape Google Play Store pages directly
 * No external dependencies - pure Deno implementation
 */

interface ScrapedApp {
  app_name: string;
  app_id: string;
  platform: 'android';
  bundle_id: string;
  developer_name: string;
  app_icon_url: string;
  app_rating: number;
  category: string;
  installs: string;
  price: string;
}

interface ScrapedReview {
  review_id: string;
  app_id: string;
  platform: 'android';
  country: string;
  title: string;
  text: string;
  rating: number;
  version: string;
  author: string;
  review_date: string;
  developer_reply?: string;
  developer_reply_date?: string;
  thumbs_up_count: number;
  reviewer_language?: string;
}

export class NativeGooglePlayScraper {
  private baseUrl = 'https://play.google.com';
  private userAgent = 'YodelASO-ReviewBot/1.0 (compatible; +https://yodel-aso.com/bot)';

  // Simple rate limiting - wait between requests
  private lastRequestTime = 0;
  private minRequestDelay = 1000; // 1 second between requests

  /**
   * Rate limiter - ensures minimum delay between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestDelay) {
      const waitTime = this.minRequestDelay - timeSinceLastRequest;
      console.log(`[RATE-LIMITER] Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Extract structured JSON data from Google Play HTML script tags
   */
  private extractStructuredData(html: string): any[] {
    const structuredData: any[] = [];

    // Google Play embeds data in script tags like: AF_initDataCallback({...})
    const scriptPattern = /AF_initDataCallback\(({[^}]+data[^}]+})\)/g;
    let match;

    while ((match = scriptPattern.exec(html)) !== null) {
      try {
        // Try to parse the JSON object
        const jsonStr = match[1];
        // Add proper JSON structure if needed
        const fixedJson = jsonStr.replace(/([{,]\s*)(\w+):/g, '$1"$2":');
        const data = JSON.parse(fixedJson);
        if (data.data) {
          structuredData.push(data.data);
        }
      } catch (e) {
        // Silently fail - some script blocks aren't valid JSON
      }
    }

    return structuredData;
  }

  /**
   * Search for apps on Google Play
   */
  async searchApps(query: string, country: string = 'us', limit: number = 10): Promise<ScrapedApp[]> {
    try {
      console.log(`[NATIVE-SCRAPER] Searching for: "${query}", country=${country}`);

      // Rate limiting
      await this.rateLimit();

      // Validate and sanitize query
      const sanitizedQuery = query.replace(/[^\w\s-]/g, '').trim().slice(0, 100);
      if (!sanitizedQuery) {
        throw new Error('Invalid search query');
      }

      // Google Play search URL
      const searchUrl = `${this.baseUrl}/store/search?q=${encodeURIComponent(sanitizedQuery)}&c=apps&hl=en&gl=${country}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`);
      }

      const html = await response.text();

      // Extract app data using regex patterns
      const apps = this.parseSearchResults(html, limit);

      console.log(`[NATIVE-SCRAPER] Found ${apps.length} apps`);
      return apps;

    } catch (error: any) {
      console.error(`[NATIVE-SCRAPER] Search failed:`, error);
      throw new Error(`Google Play search failed: ${error.message}`);
    }
  }

  /**
   * Parse search results from HTML
   */
  private parseSearchResults(html: string, limit: number): ScrapedApp[] {
    const apps: ScrapedApp[] = [];

    // Google Play embeds data in script tags as JSON
    // Look for patterns like: "data":[...] or DS:... structures

    // Pattern to match app package IDs in links
    const appIdPattern = /\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g;
    const appIds = new Set<string>();

    let match;
    while ((match = appIdPattern.exec(html)) !== null && apps.length < limit) {
      const packageId = match[1];
      if (!appIds.has(packageId)) {
        appIds.add(packageId);

        // Extract app data around this package ID
        const appData = this.extractAppDataFromHtml(html, packageId);
        if (appData) {
          apps.push(appData);
        }
      }
    }

    return apps.slice(0, limit);
  }

  /**
   * Extract app data from HTML around a package ID
   */
  private extractAppDataFromHtml(html: string, packageId: string): ScrapedApp | null {
    try {
      // Find the section containing this app's data
      const idIndex = html.indexOf(packageId);
      if (idIndex === -1) return null;

      // Get a larger chunk of HTML around the package ID
      const start = Math.max(0, idIndex - 3000);
      const end = Math.min(html.length, idIndex + 3000);
      const chunk = html.substring(start, end);

      // Try multiple strategies to extract app name
      let appName = packageId; // Fallback

      // Strategy 1: Look for aria-label with app name
      const ariaMatch = chunk.match(/aria-label="([^"]{5,80})"/);
      if (ariaMatch && !ariaMatch[1].includes('http') && !ariaMatch[1].includes('.com')) {
        appName = ariaMatch[1];
      }

      // Strategy 2: Look for quoted strings near the package ID
      if (appName === packageId) {
        const quotedMatch = chunk.match(/"([A-Z][^"]{5,60})"[^"]*"/);
        if (quotedMatch && !quotedMatch[1].includes(packageId)) {
          appName = quotedMatch[1];
        }
      }

      // Extract developer
      const devMatch = chunk.match(/developer\?id=([^"]+)"/);
      const developer = devMatch ? decodeURIComponent(devMatch[1].replace(/\+/g, ' ')) : 'Unknown';

      // Extract icon URL - look for googleusercontent.com image URLs
      let iconUrl = 'https://play-lh.googleusercontent.com/';
      const iconMatch = chunk.match(/(https:\/\/play-lh\.googleusercontent\.com\/[^"'\s]+)/);
      if (iconMatch) {
        iconUrl = iconMatch[1].split('=')[0] + '=s128'; // Standardize size
      }

      // Extract rating - look for decimal numbers followed by "star"
      let rating = 0;
      const ratingMatch = chunk.match(/([0-9]\.[0-9])\s*(?:star|★)/i);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]);
      }

      return {
        app_name: appName,
        app_id: packageId,
        platform: 'android',
        bundle_id: packageId,
        developer_name: developer,
        app_icon_url: iconUrl,
        app_rating: rating,
        category: 'Apps',
        installs: '1,000+',
        price: 'Free'
      };

    } catch (error) {
      console.error(`[NATIVE-SCRAPER] Failed to extract app data for ${packageId}:`, error);
      return null;
    }
  }

  /**
   * Get detailed app information
   */
  async getAppDetails(packageId: string, country: string = 'us'): Promise<ScrapedApp> {
    try {
      console.log(`[NATIVE-SCRAPER] Fetching app details: ${packageId}`);

      // Rate limiting
      await this.rateLimit();

      const appUrl = `${this.baseUrl}/store/apps/details?id=${packageId}&hl=en&gl=${country}`;

      const response = await fetch(appUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`App details request failed: ${response.status}`);
      }

      const html = await response.text();

      // Extract app name from title
      const titleMatch = html.match(/<title>([^<]+)</);
      const title = titleMatch ? titleMatch[1].replace(' - Apps on Google Play', '').trim() : packageId;

      // Extract developer
      const devMatch = html.match(/developer\?id=([^"]+)"|"([^"]+)"\s*<\/a>\s*<\/div>\s*<\/div>/);
      const developer = devMatch ? decodeURIComponent((devMatch[1] || devMatch[2] || '').replace(/\+/g, ' ')) : 'Unknown';

      // Extract rating
      const ratingMatch = html.match(/([0-9]\.[0-9])\s*(?:star|★)/i);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

      // Extract icon URL
      let iconUrl = 'https://play-lh.googleusercontent.com/';
      const iconMatch = html.match(/(https:\/\/play-lh\.googleusercontent\.com\/[^"'\s]+)/);
      if (iconMatch) {
        iconUrl = iconMatch[1].split('=')[0] + '=s512';
      }

      // Extract installs
      let installs = '1,000+';
      const installsMatch = html.match(/([0-9,]+\+?)\s*(?:downloads|installs)/i);
      if (installsMatch) {
        installs = installsMatch[1];
      }

      return {
        app_name: title,
        app_id: packageId,
        platform: 'android',
        bundle_id: packageId,
        developer_name: developer,
        app_icon_url: iconUrl,
        app_rating: rating,
        category: 'Apps',
        installs: installs,
        price: 'Free'
      };

    } catch (error: any) {
      console.error(`[NATIVE-SCRAPER] Failed to get app details:`, error);
      throw new Error(`Failed to get app details: ${error.message}`);
    }
  }

  /**
   * Fetch reviews for an app (CRITICAL FOR REVIEW MANAGEMENT)
   */
  async fetchReviews(packageId: string, country: string = 'us', limit: number = 100): Promise<ScrapedReview[]> {
    try {
      console.log(`[NATIVE-SCRAPER] Fetching reviews for: ${packageId}, country=${country}, limit=${limit}`);

      // Rate limiting
      await this.rateLimit();

      // Google Play reviews are loaded dynamically via JavaScript, making them harder to scrape
      // The initial page load only shows a few reviews in the HTML
      const reviewsUrl = `${this.baseUrl}/store/apps/details?id=${packageId}&hl=en&gl=${country}&showAllReviews=true`;

      const response = await fetch(reviewsUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`Reviews request failed: ${response.status}`);
      }

      const html = await response.text();
      const reviews: ScrapedReview[] = [];

      // Google Play embeds reviews in the page HTML, but in a complex structure
      // Look for review content patterns
      const reviewSections = html.split('<div data-review-id="');

      for (let i = 1; i < reviewSections.length && reviews.length < limit; i++) {
        const section = reviewSections[i];

        try {
          // Extract review ID
          const reviewIdMatch = section.match(/^([^"]+)"/);
          const reviewId = reviewIdMatch ? reviewIdMatch[1] : `review_${i}`;

          // Extract author name
          const authorMatch = section.match(/<span[^>]*>([^<]+)<\/span>/);
          const author = authorMatch ? authorMatch[1].trim() : 'Anonymous';

          // Extract rating (number of stars)
          const starsMatch = section.match(/([1-5])\s*(?:star|★)/i);
          const rating = starsMatch ? parseInt(starsMatch[1]) : 5;

          // Extract review text
          const textMatch = section.match(/<span[^>]*>([^<]{20,500})<\/span>/);
          const text = textMatch ? textMatch[1].trim() : '';

          // Extract review date
          const dateMatch = section.match(/([A-Z][a-z]+\s+\d+,\s+\d{4})/);
          const reviewDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

          // Extract version
          const versionMatch = section.match(/Version\s+([0-9.]+)/i);
          const version = versionMatch ? versionMatch[1] : '1.0';

          // Extract developer reply (if exists)
          let developerReply: string | undefined;
          let developerReplyDate: string | undefined;
          const replyMatch = section.match(/Developer response[\s\S]{0,100}?<span[^>]*>([^<]{10,500})<\/span>/i);
          if (replyMatch) {
            developerReply = replyMatch[1].trim();
            const replyDateMatch = section.match(/Developer response.*?([A-Z][a-z]+\s+\d+,\s+\d{4})/);
            if (replyDateMatch) {
              developerReplyDate = new Date(replyDateMatch[1]).toISOString();
            }
          }

          // Extract thumbs up count
          let thumbsUpCount = 0;
          const thumbsMatch = section.match(/([0-9,]+)\s*(?:people|person)\s*found\s*this\s*helpful/i);
          if (thumbsMatch) {
            thumbsUpCount = parseInt(thumbsMatch[1].replace(/,/g, ''));
          }

          if (text.length > 0) {
            reviews.push({
              review_id: reviewId,
              app_id: packageId,
              platform: 'android',
              country: country,
              title: '', // Google Play doesn't have review titles
              text: text,
              rating: rating,
              version: version,
              author: author,
              review_date: reviewDate,
              developer_reply: developerReply,
              developer_reply_date: developerReplyDate,
              thumbs_up_count: thumbsUpCount,
              reviewer_language: 'en'
            });
          }
        } catch (error) {
          console.error(`[NATIVE-SCRAPER] Failed to parse review:`, error);
          // Continue to next review
        }
      }

      console.log(`[NATIVE-SCRAPER] Successfully parsed ${reviews.length} reviews`);
      return reviews;

    } catch (error: any) {
      console.error(`[NATIVE-SCRAPER] Failed to fetch reviews:`, error);
      // Return empty array instead of throwing - graceful degradation
      return [];
    }
  }
}
