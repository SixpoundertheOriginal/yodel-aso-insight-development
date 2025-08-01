interface AppInfo {
  appId: string;
  screenshots: string[];
  title: string;
  icon?: string;
  rating?: number;
  developer?: string;
}

interface CreativeAnalysisResult {
  success: boolean;
  apps: AppInfo[];
  totalResults: number;
  keyword: string;
  error?: string;
}

export class CreativeAnalysisService {
  private static async fetchAppScreenshots(keyword: string): Promise<AppInfo[]> {
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `https://itunes.apple.com/search?term=${encodedKeyword}&country=US&media=software&limit=3`;

    try {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`);
      }

      const data = await response.json();
      const apps = data.results || [];

      return apps.map((app: any) => ({
        appId: app.trackId.toString(),
        screenshots: app.screenshotUrls || [],
        title: app.trackName || 'Unknown App',
        icon: app.artworkUrl100 || app.artworkUrl60,
        rating: app.averageUserRating,
        developer: app.artistName
      }));
    } catch (error) {
      console.error('Error fetching app screenshots:', error);
      throw new Error('Failed to fetch screenshots for the keyword');
    }
  }

  static async analyzeCreativesByKeyword(keyword: string): Promise<CreativeAnalysisResult> {
    try {
      if (!keyword.trim()) {
        throw new Error('Keyword is required');
      }

      const apps = await this.fetchAppScreenshots(keyword.trim());
      
      return {
        success: true,
        apps,
        totalResults: apps.length,
        keyword: keyword.trim()
      };
    } catch (error) {
      console.error('Creative analysis error:', error);
      return {
        success: false,
        apps: [],
        totalResults: 0,
        keyword: keyword.trim(),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async analyzeCreativesByAppId(appId: string): Promise<CreativeAnalysisResult> {
    try {
      if (!appId.trim()) {
        throw new Error('App ID is required');
      }

      const searchUrl = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=US`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`);
      }

      const data = await response.json();
      const app = data.results?.[0];

      if (!app) {
        throw new Error('App not found');
      }

      const appInfo: AppInfo = {
        appId: app.trackId.toString(),
        screenshots: app.screenshotUrls || [],
        title: app.trackName || 'Unknown App',
        icon: app.artworkUrl100 || app.artworkUrl60,
        rating: app.averageUserRating,
        developer: app.artistName
      };

      return {
        success: true,
        apps: [appInfo],
        totalResults: 1,
        keyword: app.trackName || appId
      };
    } catch (error) {
      console.error('Creative analysis by app ID error:', error);
      return {
        success: false,
        apps: [],
        totalResults: 0,
        keyword: appId,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export type { AppInfo, CreativeAnalysisResult };