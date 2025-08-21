import { CA_DEBUG, isMFP } from '@/lib/caDebug';

interface AppInfo {
  appId: string;
  screenshots: string[];
  title: string;
  icon?: string;
  rating?: number;
  developer?: string;
  bundleId?: string;
  trackId?: number;
  trackName?: string;
}

interface CreativeAnalysisResult {
  success: boolean;
  apps: AppInfo[];
  totalResults: number;
  keyword: string;
  country: string;
  error?: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  [key: string]: unknown;
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

  interface iTunesApp {
  trackName: string;
  bundleId: string;
  trackId: number;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  appletvScreenshotUrls?: string[];
    features?: string[];
    [key: string]: unknown;
}

interface iTunesDebugLog {
  requestParams: {
    term: string;
    country: string;
    media: string;
    limit: number;
    entity: string;
  };
  responseMetadata: {
    resultCount: number;
    timestamp: string;
    requestUrl: string;
  };
  appScreenshotAnalysis: Array<{
    trackName: string;
    bundleId: string;
    screenshotUrls: string[];
    ipadScreenshotUrls?: string[];
    appletvScreenshotUrls?: string[];
    otherImageFields: Record<string, unknown>;
    totalScreenshotCount: number;
  }>;
  potentialIssues: string[];
}

export class CreativeAnalysisService {
  private static processScreenshotsWithLogging(app: iTunesApp) {
    console.group(`🖼️ Processing Screenshots: ${app.trackName}`);
    const allScreenshots = {
      phone: app.screenshotUrls || [],
      ipad: app.ipadScreenshotUrls || [],
      appletv: app.appletvScreenshotUrls || []
    };
    console.log('Screenshot sources found:', {
      phone: allScreenshots.phone.length,
      ipad: allScreenshots.ipad.length,
      appletv: allScreenshots.appletv.length
    });
    const validatedScreenshots: Array<{ source: string; index: number; url: string; isHttps: boolean; isValidFormat: boolean; domain: string; displayUrl: string }> = [];
    Object.entries(allScreenshots).forEach(([source, urls]) => {
      urls.forEach((url, index) => {
        const validation = {
          source,
          index,
          url,
          isHttps: url.startsWith('https://'),
          isValidFormat: /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url),
          domain: ''
        };
        try {
          validation.domain = new URL(url).hostname;
        } catch {
          validation.domain = 'invalid-url';
        }
        console.log(`✅ ${source}[${index}]:`, validation);
        if (validation.isHttps && validation.isValidFormat) {
          validatedScreenshots.push({ ...validation, displayUrl: url });
        }
      });
    });
    console.log('📋 Final screenshot count:', validatedScreenshots.length);
    console.groupEnd();
    return validatedScreenshots;
  }

  private static logScreenshotIssues(app: iTunesApp) {
    const issues: string[] = [];
    if (!app.screenshotUrls && !app.ipadScreenshotUrls && !app.appletvScreenshotUrls) {
      issues.push('No screenshot fields found in API response');
    }
    if ((app.screenshotUrls?.length ?? 0) === 0 && (app.ipadScreenshotUrls?.length ?? 0) === 0 && (app.appletvScreenshotUrls?.length ?? 0) === 0) {
      issues.push('Screenshot arrays exist but are empty');
    }
    if (!app.screenshotUrls && (app.ipadScreenshotUrls?.length ?? 0) > 0) {
      issues.push('iPad-only app detected - using iPad screenshots');
    }
    if (app.features?.includes('iosUniversal') === false) {
      issues.push('App may have device restrictions');
    }
    if (issues.length > 0) {
      console.warn(`⚠️ ${app.trackName} issues:`, issues);
    }
    return issues;
  }

  private static async fetchAppScreenshots(keyword: string, country = 'US', debug = false, sessionId?: string): Promise<AppInfo[]> {
    const requestParams = {
      term: keyword,
      country,
      media: 'software',
      limit: 3,
      entity: 'software'
    };
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `https://itunes.apple.com/search?term=${encodedKeyword}&country=${country}&media=${requestParams.media}&limit=${requestParams.limit}&entity=${requestParams.entity}`;

    let debugLog: iTunesDebugLog | null = null;
    if (debug) {
      console.group(`🔍 iTunes API Debug: "${keyword}"`);
      console.log('📤 Request params:', requestParams);
      debugLog = {
        requestParams,
        responseMetadata: {
          resultCount: 0,
          timestamp: new Date().toISOString(),
          requestUrl: searchUrl
        },
        appScreenshotAnalysis: [],
        potentialIssues: []
      };
    }

    try {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`);
      }

      const data = await response.json();
      const apps: iTunesApp[] = data.results || [];

      if (CA_DEBUG && sessionId) {
        for (const app of apps) {
          if (isMFP(app)) {
            console.groupCollapsed('[CA][MFP][A] search payload');
            console.log({
              sessionId,
              trackId: app.trackId,
              bundleId: app.bundleId,
              trackName: app.trackName,
              iphone: app.screenshotUrls?.length ?? 0,
              ipad: app.ipadScreenshotUrls?.length ?? 0,
              sampleIphone: app.screenshotUrls?.slice(0, 2)
            });
            console.groupEnd();

            try {
              const lookupResp = await fetch(`https://itunes.apple.com/lookup?id=${app.trackId}&entity=software&country=${country}`);
              const lookupData = await lookupResp.json();
              const lookupApp: iTunesApp | undefined = lookupData.results?.[0];
              console.log('[CA][MFP][B] lookup payload', {
                sessionId,
                trackId: app.trackId,
                iphone: lookupApp?.screenshotUrls?.length ?? 0,
                ipad: lookupApp?.ipadScreenshotUrls?.length ?? 0,
                sampleIphone: lookupApp?.screenshotUrls?.slice(0, 2)
              });
            } catch (lookupErr) {
              console.warn('[CA][MFP][B] lookup failed', { sessionId, trackId: app.trackId, error: lookupErr });
            }
          }
        }
      }

      const appInfos = apps.map((app) => {
        const rawScreenshots = app.screenshotUrls || [];
        const sanitizedScreenshots = rawScreenshots;
        if (CA_DEBUG && sessionId && isMFP(app)) {
          const droppedExamples = rawScreenshots.filter((u) => !sanitizedScreenshots.includes(u)).slice(0, 2);
          console.log('[CA][MFP][C] validator result', {
            sessionId,
            inCount: rawScreenshots.length,
            outCount: sanitizedScreenshots.length,
            droppedExamples,
            reason: 'validator'
          });
        }
        return {
          appId: app.trackId.toString(),
          screenshots: sanitizedScreenshots,
          title: app.trackName || 'Unknown App',
          icon: app.artworkUrl100 || app.artworkUrl60,
          rating: app.averageUserRating,
          developer: app.artistName,
          bundleId: app.bundleId,
          trackId: app.trackId,
          trackName: app.trackName
        } as AppInfo;
      });

      if (debug && debugLog) {
        debugLog.responseMetadata.resultCount = data.resultCount || appInfos.length;
        console.log('📥 Raw response:', data);
        apps.forEach((app) => {
          const otherImageFields = Object.keys(app).filter((key) =>
            key.toLowerCase().includes('screenshot') ||
            key.toLowerCase().includes('image') ||
            key.toLowerCase().includes('icon')
          );
          const totalScreenshotCount = [
            ...(app.screenshotUrls || []),
            ...(app.ipadScreenshotUrls || []),
            ...(app.appletvScreenshotUrls || [])
          ].length;
          debugLog.appScreenshotAnalysis.push({
            trackName: app.trackName,
            bundleId: app.bundleId,
            screenshotUrls: app.screenshotUrls || [],
            ipadScreenshotUrls: app.ipadScreenshotUrls,
            appletvScreenshotUrls: app.appletvScreenshotUrls,
            otherImageFields: otherImageFields.reduce((acc, key) => {
              acc[key] = app[key];
              return acc;
            }, {} as Record<string, unknown>),
            totalScreenshotCount
          });
          const issues = this.logScreenshotIssues(app);
          if (issues.length > 0) {
            debugLog.potentialIssues.push(`${app.trackName}: ${issues.join(', ')}`);
          }
          this.processScreenshotsWithLogging(app);
        });
        console.log('fetchAppScreenshots debug log:', debugLog);
      }

      return appInfos;
    } catch (error) {
      if (debug) {
        console.error('❌ iTunes API Error:', error);
      } else {
        console.error('Error fetching app screenshots:', error);
      }
      throw new Error('Failed to fetch screenshots for the keyword');
    } finally {
      if (debug) {
        console.groupEnd();
      }
    }
  }

  static async analyzeCreativesByKeyword(
    keyword: string,
    options: { debug?: boolean; country?: string; sessionId?: string } = {}
  ): Promise<CreativeAnalysisResult> {
    const { debug = false, country = 'US', sessionId } = options;
    try {
      if (!keyword.trim()) {
        throw new Error('Keyword is required');
      }

      const apps = await this.fetchAppScreenshots(keyword.trim(), country, debug, sessionId);

      return {
        success: true,
        apps,
        totalResults: apps.length,
        keyword: keyword.trim(),
        country
      };
    } catch (error) {
      console.error('Creative analysis error:', error);
      return {
        success: false,
        apps: [],
        totalResults: 0,
        keyword: keyword.trim(),
        country,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async analyzeCreativesByAppId(
    appId: string,
    options: { debug?: boolean; country?: string; sessionId?: string } = {}
  ): Promise<CreativeAnalysisResult> {
    const { debug = false, country = 'US' } = options;
    try {
      if (!appId.trim()) {
        throw new Error('App ID is required');
      }

      const searchUrl = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${country}`;
      if (debug) {
        console.log('analyzeCreativesByAppId request URL:', searchUrl);
      }

      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`);
      }

      const data = await response.json();
      const app = data.results?.[0];

      if (debug) {
        console.log('analyzeCreativesByAppId response metadata:', {
          resultCount: data.results?.length || 0,
          screenshotCount: app?.screenshotUrls?.length || 0
        });
        if (app) {
          this.logScreenshotIssues(app);
          this.processScreenshotsWithLogging(app);
        }
      }

      if (!app) {
        throw new Error('App not found');
      }

      const screenshots = app.screenshotUrls || [];
      if (debug && screenshots.length === 0) {
        console.warn(`No screenshots for app ${app.trackId}`);
      }

      const appInfo: AppInfo = {
        appId: app.trackId.toString(),
        screenshots,
        title: app.trackName || 'Unknown App',
        icon: app.artworkUrl100 || app.artworkUrl60,
        rating: app.averageUserRating,
        developer: app.artistName
      };

      return {
        success: true,
        apps: [appInfo],
        totalResults: 1,
        keyword: app.trackName || appId,
        country
      };
    } catch (error) {
      console.error('Creative analysis by app ID error:', error);
      return {
        success: false,
        apps: [],
        totalResults: 0,
        keyword: appId,
        country,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async debugMyFitnessPal() {
    await this.fetchAppScreenshots('fitness', 'US', true);
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
  private static async storeAnalysisResults(sessionId: string, analysisResult: CreativeAnalysisWithAI): Promise<void> {
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
          analysis_data: JSON.stringify({
            colorPalette: analysis.colorPalette,
            messageAnalysis: analysis.messageAnalysis,
            visualHierarchy: analysis.visualHierarchy,
            textContent: analysis.textContent,
            designPatterns: analysis.designPatterns
          }),
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
  static async getAnalysisSessions(limit: number = 10): Promise<unknown[]> {
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
          const analysisData = JSON.parse(screenshot.analysis_data as string) as {
            colorPalette: ColorPalette;
            messageAnalysis: MessageAnalysis;
            visualHierarchy: VisualHierarchy;
            textContent: string[];
            designPatterns: string[];
            flowRole?: string;
            recommendations?: string[];
          };
          return {
            appId: screenshot.app_id,
            appName: screenshot.app_name,
            screenshotUrl: screenshot.screenshot_url,
            colorPalette: analysisData.colorPalette as ColorPalette,
            messageAnalysis: analysisData.messageAnalysis as MessageAnalysis,
          visualHierarchy: analysisData.visualHierarchy as VisualHierarchy,
          textContent: analysisData.textContent as string[],
          designPatterns: analysisData.designPatterns as string[],
          flowRole: (analysisData.flowRole as "feature" | "hook" | "proof" | "CTA" | "onboarding") || 'feature',
          recommendations: analysisData.recommendations || [],
          confidence: screenshot.confidence_score || 0
        };
      }) || [];

        return {
          success: true,
          individual,
          patterns: patterns?.patterns_data as CreativeAnalysisWithAI['patterns']
        };
    } catch (error) {
      console.error('Error loading analysis session:', error);
      return null;
    }
  }
}

export type { AppInfo, CreativeAnalysisResult };