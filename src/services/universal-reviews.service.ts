/**
 * Universal Reviews Service
 * Unified interface for fetching reviews from both iOS and Android platforms
 */

import { fetchAppReviews } from '@/utils/itunesReviews';
import { fetchGooglePlayReviews, type GooglePlayReview } from '@/utils/googlePlayReviews';

export type Platform = 'ios' | 'android';

export interface UniversalReview {
  review_id: string;
  app_id: string;
  platform: Platform;
  country: string;
  title: string;
  text: string;
  rating: number;
  version: string;
  author: string;
  review_date: string;

  // Google Play specific (optional)
  developer_reply?: string;
  developer_reply_date?: string;
  thumbs_up_count?: number;
  reviewer_language?: string;
}

export interface UniversalReviewsResponse {
  success: boolean;
  data?: UniversalReview[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
  totalReviews?: number;
  platform: Platform;
}

/**
 * Universal reviews service - handles both iOS and Android
 */
export class UniversalReviewsService {
  /**
   * Fetch reviews for any platform
   */
  static async fetchReviews(params: {
    platform: Platform;
    appId: string;
    country: string;
    page?: number;
    pageSize?: number;
    maxReviews?: number;
  }): Promise<UniversalReviewsResponse> {
    const { platform, appId, country, page = 1, pageSize = 100, maxReviews } = params;

    console.log('[UNIVERSAL-REVIEWS] Fetching:', { platform, appId, country, page, pageSize, maxReviews });

    if (platform === 'ios') {
      return this.fetchAppleReviews(appId, country, page, pageSize);
    } else {
      return this.fetchAndroidReviews(appId, country, pageSize, maxReviews);
    }
  }

  /**
   * Fetch Apple App Store reviews
   */
  private static async fetchAppleReviews(
    appId: string,
    country: string,
    page: number,
    pageSize: number
  ): Promise<UniversalReviewsResponse> {
    try {
      const result = await fetchAppReviews({
        appId,
        cc: country,
        page,
        pageSize
      });

      // Transform to universal format
      const reviews: UniversalReview[] = (result.data || []).map(review => ({
        review_id: review.review_id,
        app_id: review.app_id,
        platform: 'ios' as const,
        country: review.country,
        title: review.title,
        text: review.text,
        rating: review.rating,
        version: review.version || '',
        author: review.author || 'Anonymous',
        review_date: review.updated_at || new Date().toISOString()
      }));

      return {
        success: result.success,
        data: reviews,
        error: result.error,
        currentPage: result.currentPage || page,
        hasMore: result.hasMore || false,
        totalReviews: result.totalReviews,
        platform: 'ios'
      };

    } catch (error: any) {
      console.error('[UNIVERSAL-REVIEWS] iOS fetch error:', error);
      return {
        success: false,
        error: error.message,
        currentPage: page,
        hasMore: false,
        platform: 'ios'
      };
    }
  }

  /**
   * Fetch Google Play Store reviews
   */
  private static async fetchAndroidReviews(
    packageId: string,
    country: string,
    pageSize: number,
    maxReviews?: number
  ): Promise<UniversalReviewsResponse> {
    try {
      const result = await fetchGooglePlayReviews({
        packageId,
        country,
        pageSize,
        maxReviews
      });

      // Already in universal format, just need to ensure typing
      const reviews: UniversalReview[] = (result.data || []).map(review => ({
        ...review,
        platform: 'android' as const
      }));

      return {
        success: result.success,
        data: reviews,
        error: result.error,
        currentPage: result.currentPage,
        hasMore: result.hasMore,
        totalReviews: result.totalReviews,
        platform: 'android'
      };

    } catch (error: any) {
      console.error('[UNIVERSAL-REVIEWS] Android fetch error:', error);
      return {
        success: false,
        error: error.message,
        currentPage: 1,
        hasMore: false,
        platform: 'android'
      };
    }
  }

  /**
   * Get recommended page size based on platform
   */
  static getRecommendedPageSize(platform: Platform): number {
    return platform === 'ios' ? 20 : 100; // iOS: 20, Android: 100
  }

  /**
   * Get max reviews limit based on platform
   */
  static getMaxReviewsLimit(platform: Platform): number {
    return platform === 'ios' ? 200 : 1000; // iOS: 10 pages × 20, Android: 1000
  }
}
