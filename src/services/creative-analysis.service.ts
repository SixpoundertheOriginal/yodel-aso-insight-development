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
  psychologicalTrigger: 'trust' | 'curiosity' | 'urgency' | 'fear' | 'desire' | 'social_validation';
  attentionScore: number;
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
  flowRole: 'hook' | 'feature' | 'proof' | 'CTA' | 'onboarding';
  recommendations: string[];
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

  static async analyzeCreativesWithAI(apps: AppInfo[], keyword?: string, sessionId?: string): Promise<CreativeAnalysisWithAI> {
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

      console.log('Preparing AI analysis for screenshots:', screenshots.length, screenshots);

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

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Analysis failed: ${error.message || 'Failed to send a request to the Edge Function'}`);
      }

      if (!data) {
        throw new Error('Analysis failed: No data returned from AI analysis');
      }

      // Fix: Extract the actual data from the nested response structure
      const analysisResult = data.data || data;
      console.log('Extracted analysis result:', analysisResult);

      if (analysisResult.error) {
        throw new Error(`AI Analysis failed: ${analysisResult.error}`);
      }

      // Store results in database if sessionId provided
      if (sessionId && analysisResult.individual) {
        await this.storeAnalysisResults(sessionId, analysisResult);
      }

      return {
        success: true,
        individual: analysisResult.individual || [],
        patterns: analysisResult.patterns,
      };
    } catch (error) {
      console.error('AI creative analysis error:', error);
      
      // More specific error messages
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to AI analysis service';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Analysis timed out: Please try again with fewer screenshots';
        } else if (error.message.includes('OpenAI')) {
          errorMessage = `AI service error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        individual: [],
        error: errorMessage
      };
    }
  }

  // Create a new analysis session
  static async createAnalysisSession(keyword: string, searchType: 'keyword' | 'appid', totalApps: number): Promise<string> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get current user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('User organization not found');
    }

    const { data, error } = await supabase
      .from('creative_analysis_sessions')
      .insert({
        organization_id: profile.organization_id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        keyword,
        search_type: searchType,
        total_apps: totalApps,
        analysis_status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create analysis session:', error);
      throw new Error('Failed to create analysis session');
    }

    return data.id;
  }

  // Store analysis results in database
  private static async storeAnalysisResults(sessionId: string, analysisResult: any): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get current user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('User organization not found');
    }

    try {
      // Store individual screenshot analyses
      if (analysisResult.individual && analysisResult.individual.length > 0) {
        const screenshotData = analysisResult.individual.map((analysis: ScreenshotAnalysis) => ({
          organization_id: profile.organization_id,
          session_id: sessionId,
          app_id: analysis.appId,
          app_name: analysis.appName,
          screenshot_url: analysis.screenshotUrl,
          analysis_data: {
            colorPalette: analysis.colorPalette,
            messageAnalysis: analysis.messageAnalysis,
            visualHierarchy: analysis.visualHierarchy,
            textContent: analysis.textContent,
            designPatterns: analysis.designPatterns
          },
          confidence_score: analysis.confidence
        }));

        const { error: screenshotError } = await supabase
          .from('screenshot_analyses')
          .insert(screenshotData);

        if (screenshotError) {
          console.error('Failed to store screenshot analyses:', screenshotError);
        }
      }

      // Store pattern analysis if available
      if (analysisResult.patterns) {
        const { error: patternError } = await supabase
          .from('pattern_analyses')
          .insert({
            organization_id: profile.organization_id,
            session_id: sessionId,
            patterns_data: analysisResult.patterns,
            insights: analysisResult.patterns.insights || []
          });

        if (patternError) {
          console.error('Failed to store pattern analysis:', patternError);
        }
      }

      // Update session status to completed
      await supabase
        .from('creative_analysis_sessions')
        .update({ analysis_status: 'completed' })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error storing analysis results:', error);
      // Don't throw error here to avoid breaking the analysis flow
    }
  }

  // Get past analysis sessions
  static async getAnalysisSessions(limit: number = 10): Promise<any[]> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('creative_analysis_sessions')
      .select(`
        id,
        keyword,
        search_type,
        total_apps,
        analysis_status,
        created_at,
        screenshot_analyses(count),
        pattern_analyses(count)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch analysis sessions:', error);
      return [];
    }

    return data || [];
  }

  // Load a specific analysis session with results
  static async loadAnalysisSession(sessionId: string): Promise<CreativeAnalysisWithAI | null> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      // Get screenshot analyses
      const { data: screenshots, error: screenshotError } = await supabase
        .from('screenshot_analyses')
        .select('*')
        .eq('session_id', sessionId);

      if (screenshotError) {
        console.error('Failed to load screenshot analyses:', screenshotError);
        return null;
      }

      // Get pattern analysis
      const { data: patterns, error: patternError } = await supabase
        .from('pattern_analyses')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (patternError && patternError.code !== 'PGRST116') {
        console.error('Failed to load pattern analysis:', patternError);
      }

      // Convert database format back to service format
      const individual: ScreenshotAnalysis[] = screenshots?.map(screenshot => {
        const analysisData = screenshot.analysis_data as any;
        return {
          appId: screenshot.app_id,
          appName: screenshot.app_name,
          screenshotUrl: screenshot.screenshot_url,
          colorPalette: analysisData.colorPalette as ColorPalette,
          messageAnalysis: analysisData.messageAnalysis as MessageAnalysis,
          visualHierarchy: analysisData.visualHierarchy as VisualHierarchy,
          textContent: analysisData.textContent as string[],
          designPatterns: analysisData.designPatterns as string[],
          flowRole: analysisData.flowRole || 'feature',
          recommendations: analysisData.recommendations || [],
          confidence: screenshot.confidence_score || 0
        };
      }) || [];

      return {
        success: true,
        individual,
        patterns: patterns?.patterns_data as any
      };
    } catch (error) {
      console.error('Error loading analysis session:', error);
      return null;
    }
  }
}

export type { AppInfo, CreativeAnalysisResult };