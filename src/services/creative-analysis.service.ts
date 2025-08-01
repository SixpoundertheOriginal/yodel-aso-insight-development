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

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface MessageAnalysis {
  primaryMessage: string;
  messageType: 'feature' | 'benefit' | 'social_proof' | 'emotional' | 'functional';
  confidence: number;
  keywords: string[];
}

export interface VisualHierarchy {
  focal_point: string;
  visual_flow: string[];
  ui_elements: string[];
  layout_type: string;
}

export interface ScreenshotAnalysis {
  appId: string;
  appName: string;
  screenshotUrl: string;
  colorPalette: ColorPalette;
  messageAnalysis: MessageAnalysis;
  visualHierarchy: VisualHierarchy;
  textContent: string[];
  designPatterns: string[];
  confidence: number;
}

export interface CreativeAnalysisWithAI {
  success: boolean;
  individual: ScreenshotAnalysis[];
  patterns?: {
    commonMessageTypes: Array<{ item: string; count: number; percentage: number }>;
    commonDesignPatterns: Array<{ item: string; count: number; percentage: number }>;
    commonLayoutTypes: Array<{ item: string; count: number; percentage: number }>;
    insights: string[];
  };
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

  static async analyzeCreativesWithAI(apps: AppInfo[]): Promise<CreativeAnalysisWithAI> {
    try {
      if (!apps || apps.length === 0) {
        throw new Error('No apps provided for analysis');
      }

      // Prepare screenshots for analysis (max 3 screenshots per app)
      const screenshots = apps.flatMap(app => 
        app.screenshots.slice(0, 3).map((url, index) => ({
          url,
          appName: app.title,
          appId: app.appId
        }))
      );

      if (screenshots.length === 0) {
        throw new Error('No screenshots found to analyze');
      }

      // Call the edge function
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('creative-vision-analyzer', {
        body: {
          screenshots,
          analysisType: screenshots.length > 1 ? 'batch' : 'individual'
        }
      });

      if (error) {
        throw new Error(`Analysis failed: ${error.message}`);
      }

      return {
        success: true,
        individual: data.individual || [],
        patterns: data.patterns,
      };
    } catch (error) {
      console.error('AI creative analysis error:', error);
      return {
        success: false,
        individual: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export type { AppInfo, CreativeAnalysisResult };