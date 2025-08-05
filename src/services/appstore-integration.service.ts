
import { supabase } from '@/integrations/supabase/client';

interface AppStoreSearchResult {
  name: string;
  appId: string;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  icon?: string;
  rating?: number;
  reviews?: number;
  developer?: string;
  applicationCategory?: string;
  locale: string;
}

interface SearchResponse {
  success: boolean;
  data?: AppStoreSearchResult[];
  error?: string;
  isAmbiguous?: boolean;
  totalResults?: number;
}

export class AppStoreIntegrationService {
  static async searchApp(searchTerm: string, organizationId: string): Promise<SearchResponse> {
    try {
      console.log('🔍 [APPSTORE-INTEGRATION] Searching for:', searchTerm);
      
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: {
          searchTerm: searchTerm.trim(),
          searchType: 'keyword',
          organizationId,
          includeCompetitorAnalysis: false,
          searchParameters: {
            country: 'us',
            limit: 10
          }
        }
      });

      if (error) {
        console.error('❌ [APPSTORE-INTEGRATION] Error calling scraper:', error);
        return { success: false, error: error.message || 'Failed to search App Store' };
      }

      // Handle edge function response - check for results array instead of success field
      if (!data || !data.results || !Array.isArray(data.results)) {
        console.error('❌ [APPSTORE-INTEGRATION] No results in response:', data);
        return { success: false, error: data?.error || 'No results found' };
      }

      // Log response status for debugging
      if (data.isAmbiguous) {
        console.log(`✅ [APPSTORE-INTEGRATION] Found ${data.results.length} apps - disambiguation needed`);
      } else {
        console.log('✅ [APPSTORE-INTEGRATION] Single app result found');
      }

      // Extract results directly from the edge function response
      const resultsToTransform = data.results;

      console.log('📊 [APPSTORE-INTEGRATION] Transforming results:', {
        resultsCount: resultsToTransform.length,
        isAmbiguous: data.isAmbiguous,
        sampleResult: resultsToTransform[0]
      });

      // Transform the response to match our interface
      const transformedResults: AppStoreSearchResult[] = resultsToTransform.map((appData: any, index: number) => {
        const result = {
          name: appData.name || appData.trackName || appData.title || searchTerm,
          appId: appData.appId || appData.trackId?.toString() || appData.bundleId || `unknown-${index}`,
          title: appData.title || appData.trackName || appData.name || searchTerm,
          subtitle: appData.subtitle || appData.sellerName || '',
          description: appData.description || '',
          url: appData.url || appData.trackViewUrl || '',
          icon: appData.icon || appData.artworkUrl512 || appData.artworkUrl100 || appData.artworkUrl60 || '',
          rating: appData.rating || appData.averageUserRating || 0,
          reviews: appData.reviews || appData.userRatingCount || 0,
          developer: appData.developer || appData.artistName || appData.sellerName || '',
          applicationCategory: appData.applicationCategory || appData.primaryGenreName || appData.genres?.[0] || '',
          locale: appData.locale || 'en-US'
        };

        console.log(`🔄 [APPSTORE-INTEGRATION] Transformed result ${index + 1}:`, {
          name: result.name,
          developer: result.developer,
          appId: result.appId,
          hasIcon: !!result.icon,
          rating: result.rating
        });

        return result;
      });

      // Filter results but be less aggressive for ambiguous searches
      const validResults = transformedResults.filter(result => 
        result.name && result.name.trim().length > 0
      );

      console.log('✅ [APPSTORE-INTEGRATION] Final results:', {
        originalCount: transformedResults.length,
        validCount: validResults.length,
        isAmbiguous: data.isAmbiguous,
        results: validResults.map(r => ({ name: r.name, developer: r.developer }))
      });

      if (validResults.length === 0) {
        return { success: false, error: `No valid apps found for "${searchTerm.trim()}"` };
      }

      // Return success with ambiguity information preserved
      return { 
        success: true, 
        data: validResults,
        isAmbiguous: data.isAmbiguous || false,
        totalResults: validResults.length
      };
    } catch (error: any) {
      console.error('💥 [APPSTORE-INTEGRATION] Exception:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to App Store service' 
      };
    }
  }

  static async validateAppStoreId(appStoreId: string, platform: 'ios' | 'android', organizationId: string): Promise<SearchResponse> {
    try {
      console.log('🔍 [APPSTORE-INTEGRATION] Validating App Store ID:', appStoreId);
      
      // For iOS, search by app store URL
      const searchUrl = platform === 'ios' 
        ? `https://apps.apple.com/app/id${appStoreId}`
        : `https://play.google.com/store/apps/details?id=${appStoreId}`;

      return await this.searchApp(searchUrl, organizationId);
    } catch (error: any) {
      console.error('💥 [APPSTORE-INTEGRATION] Exception validating ID:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to validate App Store ID' 
      };
    }
  }
}
