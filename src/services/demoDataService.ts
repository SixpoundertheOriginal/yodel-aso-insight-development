// Secure demo data service to prevent real client data exposure
export interface DemoASOMetrics {
  date: string;
  app_id: string;
  impressions: number;
  downloads: number;
  conversion_rate: number;
  product_page_views: number;
  traffic_source: string;
  organization_id: string;
  data_source: 'demo';
  country: string;
  revenue: number;
}

export interface DemoDataResponse {
  success: true;
  data: DemoASOMetrics[];
  meta: {
    rowCount: number;
    totalRows: number;
    executionTimeMs: number;
    isDemo: true;                    // CRITICAL: Demo mode flag
    demoMessage: string;             // Demo explanation message
    organization_id: string;
    generated_at: string;
    total_records: number;
    date_range: {
      from: string;
      to: string;
    };
    demo_apps: string[];
    availableTrafficSources: string[];
    projectId: string;
    timestamp: string;
  };
}

export class DemoDataService {
  private static readonly DEMO_APPS = [
    'DemoApp_ProductivitySuite',
    'DemoApp_FitnessTracker', 
    'DemoApp_SocialNetwork',
    'DemoApp_GamePlatform',
    'DemoApp_EcommercePro'
  ];

  private static readonly TRAFFIC_SOURCES = [
    'App_Store_Search',
    'App_Store_Browse', 
    'Apple_Search_Ads',
    'App_Referrer',
    'Web_Referrer',
    'Event_Notification'
  ];

  static async generateSecureDemoData(
    organizationId: string,
    dateRange: { from: string; to: string },
    trafficSources?: string[]
  ): Promise<DemoDataResponse> {
    
    // Ensure we never return real client data
    if (this.containsRealClientNames(organizationId)) {
      throw new Error('Security violation: Real client data access attempted');
    }

    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    const demoData: DemoASOMetrics[] = [];
    
    // Generate 30 days of realistic demo data
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      for (const appId of this.DEMO_APPS) {
        for (const trafficSource of this.TRAFFIC_SOURCES) {
          // Skip if traffic source filtering is applied
          if (trafficSources && trafficSources.length > 0) {
            const displaySource = this.mapBigQueryToDisplay(trafficSource);
            if (!trafficSources.includes(displaySource)) {
              continue;
            }
          }

          const baseImpressions = this.generateRealisticImpressions(appId, trafficSource);
          const conversionRate = this.generateRealisticConversionRate(trafficSource);
          const downloads = Math.floor(baseImpressions * conversionRate);
          const productPageViews = Math.floor(baseImpressions * 0.15);

          demoData.push({
            date: dateStr,
            app_id: appId,
            impressions: baseImpressions,
            downloads,
            conversion_rate: conversionRate * 100,
            product_page_views: productPageViews,
            traffic_source: this.mapBigQueryToDisplay(trafficSource),
            organization_id: organizationId,
            data_source: 'demo',
            country: 'US',
            revenue: Math.floor(downloads * (Math.random() * 2.5 + 0.99)) // $0.99-$3.49 per download
          });
        }
      }
    }

    return {
      success: true,
      data: demoData,
      meta: {
        rowCount: demoData.length,
        totalRows: demoData.length,
        executionTimeMs: 120,
        isDemo: true,
        demoMessage: 'Synthetic demo data for platform evaluation - no client data exposed',
        organization_id: organizationId,
        generated_at: new Date().toISOString(),
        total_records: demoData.length,
        date_range: dateRange,
        demo_apps: this.DEMO_APPS,
        availableTrafficSources: this.TRAFFIC_SOURCES.map(this.mapBigQueryToDisplay),
        projectId: 'demo-environment',
        timestamp: new Date().toISOString()
      }
    };
  }

  private static containsRealClientNames(organizationId: string): boolean {
    const realClientPatterns = [
      'AppSeven', 'AppTwo', 'AppFour', 'AppOne', 'AppSix', 'AppThree', 'AppFive',
      'Mixbook' // Add other real client names as discovered
    ];
    
    return realClientPatterns.some(pattern => 
      organizationId.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private static generateRealisticImpressions(appId: string, trafficSource: string): number {
    // Create consistent seed based on app and traffic source
    const seed = this.simpleHash(appId + trafficSource) % 1000;
    
    const baseRanges = {
      'App_Store_Search': [100000, 500000],
      'Apple_Search_Ads': [50000, 200000],
      'App_Store_Browse': [30000, 150000],
      'App_Referrer': [10000, 50000],
      'Web_Referrer': [5000, 25000],
      'Event_Notification': [1000, 10000]
    };

    const [min, max] = baseRanges[trafficSource as keyof typeof baseRanges] || [10000, 50000];
    return Math.floor(min + (seed / 1000) * (max - min));
  }

  private static generateRealisticConversionRate(trafficSource: string): number {
    const rates = {
      'App_Store_Search': 0.035, // 3.5%
      'Apple_Search_Ads': 0.045, // 4.5% 
      'App_Store_Browse': 0.025, // 2.5%
      'App_Referrer': 0.055, // 5.5%
      'Web_Referrer': 0.020, // 2.0%
      'Event_Notification': 0.080 // 8.0%
    };

    return rates[trafficSource as keyof typeof rates] || 0.03;
  }

  private static mapBigQueryToDisplay(bigQueryName: string): string {
    const mapping: Record<string, string> = {
      'App_Referrer': 'App Referrer',
      'App_Store_Browse': 'App Store Browse',
      'App_Store_Search': 'App Store Search',
      'Apple_Search_Ads': 'Apple Search Ads',
      'Event_Notification': 'Event Notification',
      'Unavailable': 'Other',
      'Web_Referrer': 'Web Referrer'
    };
    
    return mapping[bigQueryName] || bigQueryName;
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Generate aggregated summary data
  static generateSummaryMetrics(demoData: DemoASOMetrics[]): Record<string, any> {
    const totals = demoData.reduce((acc, record) => ({
      impressions: acc.impressions + record.impressions,
      downloads: acc.downloads + record.downloads,
      product_page_views: acc.product_page_views + record.product_page_views,
      revenue: acc.revenue + record.revenue
    }), { impressions: 0, downloads: 0, product_page_views: 0, revenue: 0 });

    return {
      impressions: { value: totals.impressions, delta: Math.random() * 20 - 10 }, // ±10%
      downloads: { value: totals.downloads, delta: Math.random() * 30 - 15 }, // ±15%  
      product_page_views: { value: totals.product_page_views, delta: Math.random() * 25 - 12.5 }, // ±12.5%
      conversion_rate: { 
        value: totals.downloads / totals.product_page_views * 100, 
        delta: Math.random() * 2 - 1 // ±1%
      },
      revenue: { value: totals.revenue, delta: Math.random() * 25 - 12.5 }
    };
  }
}