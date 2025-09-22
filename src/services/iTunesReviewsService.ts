/**
 * Direct iTunes RSS Reviews Service
 * Enterprise-grade implementation for fetching app reviews directly from iTunes RSS
 * Replaces edge function dependency with stable direct API integration
 */

// Core interfaces for type safety
export interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  version?: string;
  country: string;
  app_id: string;
}

export interface ReviewsResponse {
  success: boolean;
  reviews: ReviewItem[];
  currentPage: number;
  totalReviews: number;
  hasMore: boolean;
  error?: string;
}

interface ReviewsServiceConfig {
  appId: string;
  countryCode?: string;
  page?: number;
  sortBy?: 'mostRecent' | 'mostHelpful';
}

interface ItunesRSSEntry {
  id?: { label: string };
  author?: { name?: { label: string } };
  'im:rating'?: { label: string };
  title?: { label: string };
  content?: { label: string; attributes?: { type: string } };
  updated?: { label: string };
  'im:version'?: { label: string };
}

interface ItunesRSSResponse {
  feed?: {
    entry?: ItunesRSSEntry[];
  };
}

/**
 * Build iTunes RSS URL using the ONLY working format
 * Phase 1 Fix: Use verified iTunes RSS URL format that returns JSON
 */
const buildItunesUrl = (config: ReviewsServiceConfig): string => {
  const { appId, countryCode = 'us' } = config;
  
  console.log('[iTunes] Building URL for:', { appId, countryCode });
  
  // ✅ WORKING: Single verified URL format that returns JSON (not JavaScript)
  // Key: lowercase 'sortby' and literal 'mostrecent' string
  const url = `https://itunes.apple.com/${countryCode}/rss/customerreviews/id=${appId}/sortby=mostrecent/json`;
  
  console.log('[iTunes] Using verified working URL:', url);
  return url;
};

/**
 * Transform iTunes RSS response to consistent ReviewItem format
 */
const transformItunesResponse = (itunesData: ItunesRSSResponse, appId: string, countryCode: string): ReviewItem[] => {
  console.log('[iTunes] Transforming response:', { 
    hasData: !!itunesData,
    hasFeed: !!itunesData?.feed,
    entryCount: itunesData?.feed?.entry?.length || 0
  });

  const entries = itunesData?.feed?.entry || [];
  
  // Filter out non-review entries and transform to our format
  const reviews = entries
    .filter((entry): entry is ItunesRSSEntry => {
      // Must have rating to be an actual review (vs app info entries)
      return !!entry['im:rating']?.label;
    })
    .map((entry, index): ReviewItem => {
      const id = entry.id?.label || `review-${appId}-${index}`;
      const author = entry.author?.name?.label || 'Anonymous';
      const rating = parseInt(entry['im:rating']?.label || '0', 10);
      const title = entry.title?.label || '';
      const content = entry.content?.label || '';
      const date = entry.updated?.label || new Date().toISOString();
      const version = entry['im:version']?.label;

      return {
        id: id.replace(/^.*\//, ''), // Extract just the ID part
        author,
        rating,
        title,
        content,
        date,
        version,
        country: countryCode,
        app_id: appId,
        // Legacy compatibility fields for existing UI
        review_id: id.replace(/^.*\//, ''),
        text: content,
        updated_at: date
      } as ReviewItem;
    });

  console.log('[iTunes] Transformed reviews:', {
    originalEntries: entries.length,
    filteredReviews: reviews.length,
    sampleReview: reviews[0] ? {
      author: reviews[0].author,
      rating: reviews[0].rating,
      hasTitle: !!reviews[0].title,
      hasContent: !!reviews[0].content
    } : null
  });

  return reviews;
};

/**
 * Fetch reviews using verified working iTunes RSS URL
 * Phase 1 Fix: Single URL approach with proper error handling
 */
const fetchReviewsWithRetry = async (config: ReviewsServiceConfig): Promise<ReviewsResponse> => {
  const { appId, countryCode = 'us', page = 1 } = config;
  const url = buildItunesUrl(config);
  const startTime = Date.now();
  
  console.log('[iTunes] Starting review fetch:', { appId, countryCode, page, url });
  
  let timeoutId: NodeJS.Timeout | undefined;
  
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ASO-Tool/1.0)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`iTunes RSS returned ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('json')) {
      throw new Error(`Expected JSON response, got: ${contentType}`);
    }

    const data: ItunesRSSResponse = await response.json();
    const reviews = transformItunesResponse(data, appId, countryCode);
    
    const duration = Date.now() - startTime;
    console.log('[iTunes] Success:', {
      url,
      reviewCount: reviews.length,
      duration: `${duration}ms`
    });

    return {
      success: true,
      reviews,
      currentPage: page,
      totalReviews: reviews.length,
      hasMore: reviews.length >= 50, // iTunes RSS typically returns ~50 reviews per page
    };

  } catch (error) {
    const err = error as Error;
    console.error('[iTunes] Request failed:', {
      url,
      error: err.message,
      type: err.name,
      duration: `${Date.now() - startTime}ms`
    });
    
    // Clear timeout if it exists
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return {
      success: false,
      reviews: [],
      currentPage: page,
      totalReviews: 0,
      hasMore: false,
      error: `Unable to load reviews: ${err.message}`
    };
  }
};

/**
 * Main service class for iTunes Reviews
 * Enterprise-grade direct API integration
 */
export class ITunesReviewsService {
  /**
   * Fetch app reviews from iTunes RSS
   */
  static async fetchReviews(params: {
    appId: string;
    cc?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ReviewsResponse> {
    const { appId, cc = 'us', page = 1 } = params;
    
    if (!appId || typeof appId !== 'string') {
      return {
        success: false,
        reviews: [],
        currentPage: page,
        totalReviews: 0,
        hasMore: false,
        error: 'Invalid app ID provided'
      };
    }

    console.log('[iTunes] Service request:', { appId, cc, page });

    try {
      const config: ReviewsServiceConfig = {
        appId: appId.toString(),
        countryCode: cc,
        page,
        sortBy: 'mostRecent'
      };

      return await fetchReviewsWithRetry(config);
      
    } catch (error) {
      const err = error as Error;
      console.error('[iTunes] Service error:', {
        appId,
        error: err.message,
        stack: err.stack
      });

      return {
        success: false,
        reviews: [],
        currentPage: page,
        totalReviews: 0,
        hasMore: false,
        error: `Service error: ${err.message}`
      };
    }
  }

  /**
   * Test iTunes RSS connectivity for a given app
   * Useful for debugging and health checks
   */
  static async testConnectivity(appId: string, countryCode: string = 'us'): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await this.fetchReviews({ appId, cc: countryCode, page: 1 });
      const responseTime = Date.now() - startTime;
      
      return {
        success: result.success,
        responseTime,
        error: result.error
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: (error as Error).message
      };
    }
  }
}

export default ITunesReviewsService;