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

  /**
   * Search for apps on Google Play
   */
  async searchApps(query: string, country: string = 'us', limit: number = 10): Promise<ScrapedApp[]> {
    try {
      console.log(`[NATIVE-SCRAPER] Searching for: "${query}", country=${country}`);

      // Google Play search URL
      const searchUrl = `${this.baseUrl}/store/search?q=${encodeURIComponent(query)}&c=apps&hl=en&gl=${country}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
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

      // Get a chunk of HTML around the package ID (2000 chars before and after)
      const start = Math.max(0, idIndex - 2000);
      const end = Math.min(html.length, idIndex + 2000);
      const chunk = html.substring(start, end);

      // Try to extract app name (usually in a title or heading near the package ID)
      const nameMatch = chunk.match(/"([^"]{5,80})",.*?"/);
      const name = nameMatch ? nameMatch[1] : packageId;

      // Extract developer (usually appears as 'href="/store/apps/developer?id=...')
      const devMatch = chunk.match(/developer\?id=([^"]+)"/);
      const developer = devMatch ? decodeURIComponent(devMatch[1].replace(/\+/g, ' ')) : 'Unknown';

      // Default values
      return {
        app_name: name,
        app_id: packageId,
        platform: 'android',
        bundle_id: packageId,
        developer_name: developer,
        app_icon_url: `https://play-lh.googleusercontent.com/`, // Placeholder
        app_rating: 0,
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

      const appUrl = `${this.baseUrl}/store/apps/details?id=${packageId}&hl=en&gl=${country}`;

      const response = await fetch(appUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (!response.ok) {
        throw new Error(`App details request failed: ${response.status}`);
      }

      const html = await response.text();

      // Extract app name
      const titleMatch = html.match(/<title>([^<]+)</);
      const title = titleMatch ? titleMatch[1].replace(' - Apps on Google Play', '').trim() : packageId;

      // Extract developer
      const devMatch = html.match(/developer\?id=([^"]+)"/);
      const developer = devMatch ? decodeURIComponent(devMatch[1].replace(/\+/g, ' ')) : 'Unknown';

      // Extract rating (look for patterns like "4.5 star")
      const ratingMatch = html.match(/"([0-9.]+)"\s*star/i);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

      return {
        app_name: title,
        app_id: packageId,
        platform: 'android',
        bundle_id: packageId,
        developer_name: developer,
        app_icon_url: `https://play-lh.googleusercontent.com/`,
        app_rating: rating,
        category: 'Apps',
        installs: '1,000+',
        price: 'Free'
      };

    } catch (error: any) {
      console.error(`[NATIVE-SCRAPER] Failed to get app details:`, error);
      throw new Error(`Failed to get app details: ${error.message}`);
    }
  }
}
