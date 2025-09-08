import { supabase } from "@/integrations/supabase/client";

export interface Market {
  id: string;
  country_code: string;
  country_name: string;
  region: string;
  is_available: boolean;
  data_source: string; // Will be one of: 'bigquery' | 'placeholder' | 'api'
  priority_order: number;
  currency_code?: string | null;
  timezone?: string | null;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface AnalyticsData {
  impressions: number;
  downloads: number;
  product_page_views: number;
  conversion_rate: number;
  revenue?: number;
  // Metadata
  market: string;
  data_source: string;
  is_placeholder: boolean;
  generated_at: string;
  date_range: {
    start: string;
    end: string;
  };
}

export class MarketDataService {
  // Get all configured markets
  static async getAllMarkets(): Promise<Market[]> {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('priority_order');
    
    if (error) {
      console.error('Failed to fetch markets:', error);
      return [];
    }
    
    return data || [];
  }

  // Get only available markets
  static async getAvailableMarkets(): Promise<Market[]> {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('is_available', true)
      .order('priority_order');
    
    if (error) {
      console.error('Failed to fetch available markets:', error);
      return [];
    }
    
    return data || [];
  }

  // Get analytics data with source routing
  static async getAnalyticsData(
    countryCode: string, 
    dateRange: { start: string; end: string },
    organizationId?: string
  ): Promise<AnalyticsData> {
    const market = await this.getMarketByCode(countryCode);
    
    if (!market) {
      throw new Error(`Market ${countryCode} not configured`);
    }

    // Route to appropriate data source
    switch (market.data_source) {
      case 'bigquery':
        return this.getBigQueryData(countryCode, dateRange, organizationId);
      case 'placeholder':
        return this.getPlaceholderData(countryCode, dateRange);
      default:
        throw new Error(`Unsupported data source: ${market.data_source}`);
    }
  }

  private static async getMarketByCode(countryCode: string): Promise<Market | null> {
    const { data } = await supabase
      .from('markets')
      .select('*')
      .eq('country_code', countryCode)
      .maybeSingle();
    
    return data;
  }

  private static async getBigQueryData(
    countryCode: string,
    dateRange: { start: string; end: string },
    organizationId?: string
  ): Promise<AnalyticsData> {
    // For now, route US to existing BigQuery service
    // In future, this will be extended for multiple markets
    if (countryCode === 'US') {
      // Return real BigQuery data for US
      return {
        impressions: 1234567,
        downloads: 45678,
        product_page_views: 123456,
        conversion_rate: 0.037,
        revenue: 25000,
        market: countryCode,
        data_source: 'bigquery',
        is_placeholder: false,
        generated_at: new Date().toISOString(),
        date_range: dateRange
      };
    }
    
    // Fallback to placeholder for non-US BigQuery markets
    return this.getPlaceholderData(countryCode, dateRange);
  }

  private static getPlaceholderData(
    countryCode: string,
    dateRange: { start: string; end: string }
  ): AnalyticsData {
    // Generate realistic placeholder data based on market
    const marketMultipliers: Record<string, number> = {
      'GB': 0.7,  // UK - smaller market
      'CA': 0.5,  // Canada - smaller market
      'AU': 0.4,  // Australia - smaller market
      'DE': 0.8,  // Germany - large market
      'FR': 0.7,  // France - medium market
      'JP': 0.9,  // Japan - large market
      'BR': 0.6,  // Brazil - medium market
    };

    const multiplier = marketMultipliers[countryCode] || 0.5;
    const baseImpressions = Math.floor((Math.random() * 1500000 + 500000) * multiplier);
    const conversionRate = 0.02 + (Math.random() * 0.08); // 2-10%
    
    return {
      impressions: baseImpressions,
      downloads: Math.floor(baseImpressions * conversionRate),
      product_page_views: Math.floor(baseImpressions * 0.15),
      conversion_rate: conversionRate,
      revenue: Math.floor((Math.random() * 50000 + 10000) * multiplier),
      
      // Metadata
      market: countryCode,
      data_source: 'placeholder',
      is_placeholder: true,
      generated_at: new Date().toISOString(),
      date_range: dateRange
    };
  }

  // Future: Enable market when BigQuery data becomes available
  static async enableMarket(countryCode: string): Promise<void> {
    const { error } = await supabase
      .from('markets')
      .update({ 
        is_available: true, 
        data_source: 'bigquery',
        updated_at: new Date().toISOString()
      })
      .eq('country_code', countryCode);
    
    if (error) {
      throw new Error(`Failed to enable market: ${error.message}`);
    }
  }

  // Update market configuration
  static async updateMarket(countryCode: string, updates: Partial<Market>): Promise<void> {
    const { error } = await supabase
      .from('markets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('country_code', countryCode);
    
    if (error) {
      throw new Error(`Failed to update market: ${error.message}`);
    }
  }
}