import { NativeGooglePlayScraper } from './native-scraper.service.ts';
import type { GooglePlayReview, ReviewsServiceOptions, ReviewsResponse } from '../types/index.ts';

export class GooglePlayReviewsService {
  private scraper = new NativeGooglePlayScraper();

  /**
   * Fetch reviews from Google Play Store
   */
  async fetchReviews(options: ReviewsServiceOptions): Promise<ReviewsResponse> {
    const { packageId, country, pageSize } = options;

    try {
      console.log(`[GOOGLE-PLAY] Fetching reviews for ${packageId}, country=${country}`);

      // Fetch reviews using native scraper
      const limit = pageSize && pageSize < 200 ? pageSize : 100;
      const scrapedReviews = await this.scraper.fetchReviews(packageId, country, limit);

      // Transform to our format
      const reviews: GooglePlayReview[] = scrapedReviews.map(review => ({
        review_id: review.review_id,
        app_id: review.app_id,
        platform: 'android' as const,
        country: review.country,
        title: review.title,
        text: review.text,
        rating: review.rating,
        version: review.version,
        author: review.author,
        review_date: review.review_date,
        developer_reply: review.developer_reply,
        developer_reply_date: review.developer_reply_date,
        thumbs_up_count: review.thumbs_up_count,
        reviewer_language: review.reviewer_language
      }));

      console.log(`[GOOGLE-PLAY] Successfully fetched ${reviews.length} reviews`);

      return {
        success: true,
        data: reviews,
        currentPage: 1,
        hasMore: reviews.length >= limit, // If we got the limit, there might be more
        nextPaginationToken: undefined, // Not implemented yet
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
    try {
      console.log(`[GOOGLE-PLAY] Fetching up to ${maxReviews} reviews for ${packageId}`);

      // For now, fetch in one batch (pagination not implemented yet)
      const limit = Math.min(maxReviews, 1000);
      const scrapedReviews = await this.scraper.fetchReviews(packageId, country, limit);

      const reviews: GooglePlayReview[] = scrapedReviews.map(review => ({
        review_id: review.review_id,
        app_id: review.app_id,
        platform: 'android' as const,
        country: review.country,
        title: review.title,
        text: review.text,
        rating: review.rating,
        version: review.version,
        author: review.author,
        review_date: review.review_date,
        developer_reply: review.developer_reply,
        developer_reply_date: review.developer_reply_date,
        thumbs_up_count: review.thumbs_up_count,
        reviewer_language: review.reviewer_language
      }));

      console.log(`[GOOGLE-PLAY] Fetched total of ${reviews.length} reviews (limit: ${maxReviews})`);

      return {
        success: true,
        data: reviews,
        currentPage: 1,
        hasMore: false, // Pagination not implemented yet
        totalReviews: reviews.length
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
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
