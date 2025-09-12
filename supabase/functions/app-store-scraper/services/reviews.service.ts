export interface ReviewItem {
  review_id: string;
  title: string;
  text: string;
  rating: number;
  version?: string;
  author?: string;
  updated_at?: string;
  country: string;
  app_id: string;
}

export interface ReviewsServiceOptions {
  cc: string;
  appId: string;
  page: number;
}

export interface ReviewsResponse {
  success: boolean;
  data?: ReviewItem[];
  error?: string;
  totalReviews?: number;
  currentPage: number;
  hasMore: boolean;
}

export class ReviewsService {
  constructor(private supabase: any) {}

  /**
   * Fetch reviews from iTunes RSS feed
   */
  async fetchReviews(options: ReviewsServiceOptions): Promise<ReviewsResponse> {
    const { cc, appId, page } = options;
    
    // Validate and clamp page to 1-10 as per requirements
    const clampedPage = Math.max(1, Math.min(10, page));
    
    try {
      const rssUrl = this.buildRssUrl(cc, appId, clampedPage);
      
      console.log(`[REVIEWS] Fetching reviews: ${rssUrl}`);
      
      // Fetch with retry on 429/5xx
      const response = await this.fetchWithRetry(rssUrl);
      
      if (!response.ok) {
        throw new Error(`iTunes RSS error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Parse the RSS JSON response
      const reviews = this.parseReviews(data, cc, appId);
      
      console.log(`[REVIEWS] Parsed ${reviews.length} reviews for app ${appId}, page ${clampedPage}`);
      
      return {
        success: true,
        data: reviews,
        currentPage: clampedPage,
        hasMore: clampedPage < 10 && reviews.length > 0, // Assume more if we got results and not at max page
        totalReviews: reviews.length
      };

    } catch (error: any) {
      console.error(`[REVIEWS] Failed to fetch reviews:`, error);
      return {
        success: false,
        error: error.message || 'Failed to fetch reviews',
        currentPage: clampedPage,
        hasMore: false
      };
    }
  }

  /**
   * Build RSS URL for iTunes reviews
   */
  buildRssUrl(cc: string, appId: string, page: number): string {
    const clampedPage = Math.max(1, Math.min(10, page));
    return `https://itunes.apple.com/${cc}/rss/customerreviews/page=${clampedPage}/id=${appId}/sortby=mostrecent/json?urlDesc=/customerreviews/id=${appId}/sortby=mostrecent/json`;
  }

  /**
   * Parse iTunes RSS JSON response to ReviewItem array
   */
  parseReviews(data: any, country: string, appId: string): ReviewItem[] {
    try {
      if (!data?.feed?.entry) {
        return [];
      }

      const entries = Array.isArray(data.feed.entry) ? data.feed.entry : [data.feed.entry];
      
      // Filter out metadata row (only entries with im:rating)
      const reviewEntries = entries.filter((entry: any) => entry['im:rating']);
      
      return reviewEntries.map((entry: any): ReviewItem => {
        // Extract review data from RSS entry
        const reviewId = entry.id?.label || `review-${Date.now()}-${Math.random()}`;
        const title = entry.title?.label || '';
        const text = entry.content?.label || '';
        const rating = parseInt(entry['im:rating']?.label) || 0;
        const version = entry['im:version']?.label;
        const author = entry.author?.name?.label;
        const updatedAt = entry.updated?.label;

        return {
          review_id: this.extractReviewId(reviewId),
          title,
          text,
          rating,
          version,
          author,
          updated_at: updatedAt,
          country,
          app_id: appId
        };
      });

    } catch (error) {
      console.error('[REVIEWS] Failed to parse reviews:', error);
      return [];
    }
  }

  /**
   * Fetch with retry logic for 429/5xx errors
   */
  private async fetchWithRetry(url: string, maxRetries: number = 1): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'ASO-Insights-Platform/Reviews-Fetcher'
          }
        });

        // If successful or client error (not worth retrying), return
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
          return response;
        }

        // If 429 or 5xx, retry once
        if (attempt < maxRetries && (response.status === 429 || response.status >= 500)) {
          console.log(`[REVIEWS] Retry attempt ${attempt + 1} for status ${response.status}`);
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
          continue;
        }

        return response; // Return final response even if not ok
        
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`[REVIEWS] Network retry attempt ${attempt + 1}:`, error.message);
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Extract clean review ID from iTunes review identifier
   */
  private extractReviewId(reviewId: string): string {
    // iTunes review IDs are typically long URLs - extract meaningful part
    const match = reviewId.match(/id=(\d+)/);
    if (match) {
      return match[1];
    }
    
    // Fallback to hash of full ID
    return reviewId.split('/').pop() || reviewId.substring(reviewId.length - 10);
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export reviews to CSV format
   */
  exportToCSV(reviews: ReviewItem[]): string {
    if (reviews.length === 0) {
      return 'review_id,title,text,rating,version,author,updated_at,country,app_id\n';
    }

    const header = 'review_id,title,text,rating,version,author,updated_at,country,app_id';
    
    const rows = reviews.map(review => {
      const escapeCsv = (value: any): string => {
        if (value == null) return '—';
        const str = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        escapeCsv(review.review_id),
        escapeCsv(review.title),
        escapeCsv(review.text),
        escapeCsv(review.rating),
        escapeCsv(review.version),
        escapeCsv(review.author),
        escapeCsv(review.updated_at),
        escapeCsv(review.country),
        escapeCsv(review.app_id)
      ].join(',');
    });

    return header + '\n' + rows.join('\n') + '\n';
  }
}