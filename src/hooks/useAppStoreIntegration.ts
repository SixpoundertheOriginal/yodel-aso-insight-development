
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppStoreData {
  name: string;
  title: string;
  subtitle?: string;
  description?: string;
  applicationCategory?: string;
  developer?: string;
  rating?: number;
  reviews?: number;
  icon?: string;
  url: string;
}

interface EnhancedAppData {
  app_name: string;
  platform: 'ios' | 'android';
  app_store_id?: string;
  bundle_id?: string;
  category?: string;
  developer_name?: string;
  app_icon_url?: string;
  // Rich intelligence data
  app_description?: string;
  app_store_category?: string;
  app_rating?: number;
  app_reviews?: number;
  app_subtitle?: string;
  intelligence_metadata?: any;
}

export const useAppStoreIntegration = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const saveAppWithIntelligence = async (appStoreData: AppStoreData, organizationId: string, userId: string) => {
    setIsProcessing(true);
    
    try {
      // Transform app store data to enhanced app data
      const enhancedAppData: EnhancedAppData = {
        app_name: appStoreData.name || appStoreData.title,
        platform: 'ios', // Assume iOS for now, can be enhanced later
        app_store_id: extractAppStoreId(appStoreData.url),
        category: appStoreData.applicationCategory,
        developer_name: appStoreData.developer,
        app_icon_url: appStoreData.icon,
        // Rich data for intelligence
        app_description: appStoreData.description,
        app_store_category: appStoreData.applicationCategory,
        app_rating: appStoreData.rating,
        app_reviews: appStoreData.reviews,
        app_subtitle: appStoreData.subtitle,
        intelligence_metadata: {
          scraped_at: new Date().toISOString(),
          has_rich_data: true,
          description_length: appStoreData.description?.length || 0
        }
      };

      // Save to database
      const { data, error } = await supabase
        .from('apps')
        .insert({
          ...enhancedAppData,
          organization_id: organizationId,
          created_by: userId,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Added ${appStoreData.name} with rich intelligence data`);
      return data;
    } catch (error) {
      console.error('Error saving app with intelligence:', error);
      toast.error('Failed to save app intelligence data');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const extractAppStoreId = (url: string): string | undefined => {
    // Extract app store ID from URL
    const match = url.match(/id(\d+)/);
    return match ? match[1] : undefined;
  };

  return {
    saveAppWithIntelligence,
    isProcessing
  };
};
