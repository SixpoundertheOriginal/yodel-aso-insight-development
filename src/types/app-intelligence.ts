
export interface AppIntelligence {
  refined_category: string;
  learning_method?: string;
  target_audience: string[];
  competitors: string[];
  key_features: string[];
  use_cases: string[];
  market_position: string;
  confidence_score: number;
}

export interface EnhancedAppData {
  // Basic app data
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
  intelligence_metadata?: {
    scraped_at: string;
    has_rich_data: boolean;
    description_length: number;
    last_intelligence_analysis?: string;
    confidence_score?: number;
  };
}

export interface AppData {
  app_name: string;
  description: string;
  category: string;
  developer: string;
  bundle_id: string;
}
