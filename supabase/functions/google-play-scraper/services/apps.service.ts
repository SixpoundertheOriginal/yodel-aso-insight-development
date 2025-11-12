import { NativeGooglePlayScraper } from './native-scraper.service.ts';
import type { GooglePlayApp } from '../types/index.ts';

export class GooglePlayAppsService {
  private scraper = new NativeGooglePlayScraper();

  /**
   * Search Google Play Store for apps
   */
  async search(query: string, country: string = 'us', limit: number = 10): Promise<GooglePlayApp[]> {
    try {
      console.log(`[GOOGLE-PLAY] Searching for: "${query}", country=${country}, limit=${limit}`);

      const results = await this.scraper.searchApps(query, country, Math.min(limit, 50));

      console.log(`[GOOGLE-PLAY] Found ${results.length} apps`);

      return results as GooglePlayApp[];

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Search failed:`, error);
      throw new Error(`Google Play search failed: ${error.message}`);
    }
  }

  /**
   * Get app details by package ID
   */
  async getAppDetails(packageId: string, country: string = 'us'): Promise<GooglePlayApp> {
    try {
      console.log(`[GOOGLE-PLAY] Fetching app details: ${packageId}`);

      const app = await this.scraper.getAppDetails(packageId, country);

      return app as GooglePlayApp;

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Failed to get app details:`, error);
      throw new Error(`Failed to get app details: ${error.message}`);
    }
  }
}
