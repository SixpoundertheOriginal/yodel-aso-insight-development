import gplay from 'https://esm.sh/google-play-scraper@9.1.1';
import type { GooglePlayApp } from '../types/index.ts';

export class GooglePlayAppsService {
  /**
   * Search Google Play Store for apps
   */
  async search(query: string, country: string = 'us', limit: number = 10): Promise<GooglePlayApp[]> {
    try {
      console.log(`[GOOGLE-PLAY] Searching for: "${query}", country=${country}, limit=${limit}`);

      const results = await gplay.search({
        term: query,
        country: country,
        num: Math.min(limit, 50) // Reasonable limit
      });

      console.log(`[GOOGLE-PLAY] Found ${results.length} apps`);

      return this.transformApps(results);

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

      const app = await gplay.app({
        appId: packageId,
        country: country
      });

      return this.transformApp(app);

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Failed to get app details:`, error);
      throw new Error(`Failed to get app details: ${error.message}`);
    }
  }

  /**
   * Transform google-play-scraper app results to our format
   */
  private transformApps(rawApps: any[]): GooglePlayApp[] {
    return rawApps.map(app => this.transformApp(app));
  }

  /**
   * Transform single app to our format
   */
  private transformApp(app: any): GooglePlayApp {
    return {
      app_name: app.title || '',
      app_id: app.appId || '',
      platform: 'android',
      bundle_id: app.appId || '',
      developer_name: app.developer || '',
      app_icon_url: app.icon || '',
      app_rating: app.score || 0,
      category: app.genre || '',
      installs: app.installs || '0+',
      price: app.free ? 'Free' : (app.price || 'Unknown')
    };
  }
}
