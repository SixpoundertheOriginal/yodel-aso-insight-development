
import { supabase } from '@/integrations/supabase/client';
// Import Phase A adapters for modern metadata ingestion
import { metadataOrchestrator } from './metadata-adapters';

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
  static async searchApp(
    searchTerm: string,
    organizationId: string,
    country: string = 'gb' // Default to GB per Phase 2025-01-24 requirements
  ): Promise<SearchResponse> {
    try {
      console.log(`🔍 [APPSTORE-INTEGRATION-V2] Searching via Phase A adapters: ${searchTerm} in ${country.toUpperCase()} market`);

      // Use Phase A adapter orchestrator for metadata fetching
      const metadata = await metadataOrchestrator.fetchMetadata(searchTerm, {
        country, // Use provided market parameter
        timeout: 30000,
        retries: 2
      });

      console.log('✅ [APPSTORE-INTEGRATION-V2] Metadata fetched successfully:', {
        name: metadata.name,
        appId: metadata.appId,
        hasScreenshots: !!metadata.screenshots?.length,
        source: metadata._source
      });

      // Transform Phase A adapter result to AppStoreSearchResult format
      const result: AppStoreSearchResult = {
        name: metadata.name,
        appId: metadata.appId,
        title: metadata.title,
        subtitle: metadata.subtitle || '',
        description: metadata.description || '',
        url: metadata.url || '',
        icon: metadata.icon || '',
        rating: metadata.rating || 0,
        reviews: metadata.reviews || 0,
        developer: metadata.developer || '',
        applicationCategory: metadata.applicationCategory || '',
        locale: metadata.locale,
        screenshots: metadata.screenshots || []
      };

      console.log('✅ [APPSTORE-INTEGRATION-V2] Transformed result:', {
        name: result.name,
        developer: result.developer,
        appId: result.appId,
        hasIcon: !!result.icon,
        hasScreenshots: !!result.screenshots?.length,
        rating: result.rating
      });

      // Return single result
      return {
        success: true,
        data: [result],
        isAmbiguous: false,
        totalResults: 1
      };
    } catch (error: any) {
      console.error('💥 [APPSTORE-INTEGRATION-V2] Adapter fetch failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch app metadata via Phase A adapters'
      };
    }
  }

  static async validateAppStoreId(appStoreId: string, platform: 'ios' | 'android', organizationId: string): Promise<SearchResponse> {
    try {
      console.log('🔍 [APPSTORE-INTEGRATION-V2] Validating App Store ID:', appStoreId);

      if (platform === 'android') {
        return {
          success: false,
          error: 'Android platform not yet supported by Phase A adapters'
        };
      }

      // For iOS, fetch directly by app ID using Phase A adapters
      const metadata = await metadataOrchestrator.fetchMetadata(appStoreId, {
        country: 'us',
        timeout: 30000,
        retries: 2
      });

      const result: AppStoreSearchResult = {
        name: metadata.name,
        appId: metadata.appId,
        title: metadata.title,
        subtitle: metadata.subtitle || '',
        description: metadata.description || '',
        url: metadata.url || '',
        icon: metadata.icon || '',
        rating: metadata.rating || 0,
        reviews: metadata.reviews || 0,
        developer: metadata.developer || '',
        applicationCategory: metadata.applicationCategory || '',
        locale: metadata.locale,
        screenshots: metadata.screenshots || []
      };

      return {
        success: true,
        data: [result],
        isAmbiguous: false,
        totalResults: 1
      };
    } catch (error: any) {
      console.error('💥 [APPSTORE-INTEGRATION-V2] Validation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate App Store ID'
      };
    }
  }
}
