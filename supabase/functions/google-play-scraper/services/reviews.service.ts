import gplay from 'npm:google-play-scraper@9.1.1';
import type { GooglePlayReview, ReviewsServiceOptions, ReviewsResponse } from '../types/index.ts';

/**
 * Google Play Reviews Service
 * Uses the battle-tested google-play-scraper npm package
 * Supports pagination and proper review fetching
 */
export class GooglePlayReviewsService {
  /**
   * Fetch reviews from Google Play Store
   */
  async fetchReviews(options: ReviewsServiceOptions): Promise<ReviewsResponse> {
    const { packageId, country, lang, pageSize, sort, paginationToken } = options;

    try {
      console.log(`[GOOGLE-PLAY] Fetching reviews for ${packageId}, country=${country}, pageSize=${pageSize}`);

      // Map sort option to google-play-scraper format
      const sortOption = this.mapSortOption(sort);

      // Fetch reviews with pagination
      const result = await gplay.reviews({
        appId: packageId,
        lang: lang,
        country: country,
        sort: sortOption,
        num: Math.min(pageSize || 100, 200), // Google Play max is 200 per page
        paginate: true,
        nextPaginationToken: paginationToken || undefined
      });

      console.log(`[GOOGLE-PLAY] Fetched ${result.data?.length || 0} reviews`);

      // Transform to our format
      const reviews = this.transformReviews(result.data || [], packageId, country);

      return {
        success: true,
        data: reviews,
        currentPage: 1, // Google Play uses token-based pagination, not page numbers
        hasMore: !!result.nextPaginationToken,
        nextPaginationToken: result.nextPaginationToken,
        totalReviews: reviews.length
      };

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Failed to fetch reviews:`, error);

      return {
        success: false,
        error: error.message || 'Failed to fetch Google Play reviews',
        currentPage: 1,
        hasMore: false
      };
    }
  }

  /**
   * Fetch reviews with limit (max 1000)
   */
  async fetchReviewsWithLimit(
    packageId: string,
    country: string,
    lang: string,
    maxReviews: number = 1000
  ): Promise<ReviewsResponse> {
    const allReviews: GooglePlayReview[] = [];
    let paginationToken: string | undefined;
    let hasMore = true;

    try {
      console.log(`[GOOGLE-PLAY] Fetching up to ${maxReviews} reviews for ${packageId}`);

      while (allReviews.length < maxReviews && hasMore) {
        const remaining = maxReviews - allReviews.length;
        const batchSize = Math.min(remaining, 200); // Max 200 per request

        const result = await this.fetchReviews({
          packageId,
          country,
          lang,
          page: 1,
          pageSize: batchSize,
          sort: 'newest',
          paginationToken
        });

        if (!result.success || !result.data || result.data.length === 0) {
          break;
        }

        allReviews.push(...result.data);
        paginationToken = result.nextPaginationToken;
        hasMore = result.hasMore;

        // Add small delay to avoid rate limiting
        if (hasMore && allReviews.length < maxReviews) {
          await this.delay(500);
        }
      }

      console.log(`[GOOGLE-PLAY] Fetched total of ${allReviews.length} reviews (limit: ${maxReviews})`);

      return {
        success: true,
        data: allReviews,
        currentPage: 1,
        hasMore: hasMore && allReviews.length === maxReviews,
        totalReviews: allReviews.length
      };

    } catch (error: any) {
      console.error(`[GOOGLE-PLAY] Batch fetch failed:`, error);

      return {
        success: false,
        error: error.message || 'Failed to fetch reviews',
        currentPage: 1,
        hasMore: false
      };
    }
  }

  /**
   * Transform google-play-scraper reviews to our format
   */
  private transformReviews(
    rawReviews: any[],
    packageId: string,
    country: string
  ): GooglePlayReview[] {
    return rawReviews.map((review: any) => ({
      review_id: review.id || `${packageId}-${review.date?.getTime()}`,
      app_id: packageId,
      platform: 'android' as const,
      country: country,
      title: review.title || '',
      text: review.text || '',
      rating: review.score || 0,
      version: review.version || '',
      author: review.userName || 'Anonymous',
      review_date: review.date?.toISOString() || new Date().toISOString(),

      // Google Play specific
      developer_reply: review.replyText || undefined,
      developer_reply_date: review.replyDate?.toISOString() || undefined,
      thumbs_up_count: review.thumbsUp || 0,
      reviewer_language: review.reviewCreatedVersion || undefined
    }));
  }

  /**
   * Map our sort option to google-play-scraper format
   */
  private mapSortOption(sort: 'newest' | 'rating' | 'helpfulness'): number {
    // Google Play scraper sort constants
    const SORT = {
      NEWEST: 1,
      RATING: 2,
      HELPFULNESS: 3
    };

    switch (sort) {
      case 'newest':
        return SORT.NEWEST;
      case 'rating':
        return SORT.RATING;
      case 'helpfulness':
        return SORT.HELPFULNESS;
      default:
        return SORT.NEWEST;
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
