/**
 * Google Play Store Reviews Utility
 * Fetches reviews from Google Play Store via edge function
 */

import { supabase } from '@/integrations/supabase/client';

export interface GooglePlayReview {
  review_id: string;
  app_id: string;
  platform: 'android';
  country: string;
  title: string;
  text: string;
  rating: number;
  version: string;
  author: string;
  review_date: string;

  // Google Play specific
  developer_reply?: string;
  developer_reply_date?: string;
  thumbs_up_count: number;
  reviewer_language?: string;
}

export interface GooglePlayReviewsResponse {
  success: boolean;
  data?: GooglePlayReview[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
  nextPaginationToken?: string;
  totalReviews?: number;
}

export interface GooglePlayApp {
  app_name: string;
  app_id: string;
  platform: 'android';
  bundle_id: string;
  developer_name: string;
  app_icon_url: string;
  app_rating: number;
  category: string;
  installs: string;
  price: string;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

/**
 * Fetch Google Play reviews via edge function
 */
export async function fetchGooglePlayReviews(params: {
  packageId: string;
  country?: string;
  lang?: string;
  pageSize?: number;
  maxReviews?: number;
  paginationToken?: string;
}): Promise<GooglePlayReviewsResponse> {
  const {
    packageId,
    country = 'us',
    lang = 'en',
    pageSize = 100,
    maxReviews,
    paginationToken
  } = params;

  console.log('[GOOGLE-PLAY-REVIEWS] Fetching reviews:', { packageId, country, pageSize, maxReviews });

  try {
    const { data, error } = await supabase.functions.invoke('google-play-scraper', {
      body: {
        op: 'reviews',
        packageId,
        country,
        lang,
        pageSize,
        maxReviews,
        paginationToken
      }
    });

    if (error) {
      console.error('[GOOGLE-PLAY-REVIEWS] Edge function error:', error);
      throw new Error(error.message || 'Failed to fetch Google Play reviews');
    }

    console.log('[GOOGLE-PLAY-REVIEWS] Success:', data);
    return data as GooglePlayReviewsResponse;

  } catch (error: any) {
    console.error('[GOOGLE-PLAY-REVIEWS] Error:', error);

    return {
      success: false,
      error: error.message || 'Failed to fetch reviews',
      currentPage: 1,
      hasMore: false
    };
  }
}

/**
 * Search Google Play Store for apps
 */
export async function searchGooglePlay(
  query: string,
  country: string = 'us',
  limit: number = 10
): Promise<{ success: boolean; results?: GooglePlayApp[]; error?: string }> {
  try {
    console.log('[GOOGLE-PLAY-SEARCH] Searching:', { query, country, limit });

    const { data, error } = await supabase.functions.invoke('google-play-scraper', {
      body: {
        op: 'search',
        query,
        country,
        limit
      }
    });

    if (error) throw error;

    console.log('[GOOGLE-PLAY-SEARCH] Found:', data);
    return data;

  } catch (error: any) {
    console.error('[GOOGLE-PLAY-SEARCH] Error:', error);
    return {
      success: false,
      error: error.message || 'Search failed'
    };
  }
}

/**
 * Get Google Play app details by package ID
 */
export async function getGooglePlayAppDetails(
  packageId: string,
  country: string = 'us'
): Promise<{ success: boolean; app?: GooglePlayApp; error?: string }> {
  try {
    console.log('[GOOGLE-PLAY-APP] Fetching app details:', { packageId, country });

    const { data, error } = await supabase.functions.invoke('google-play-scraper', {
      body: {
        op: 'app',
        packageId,
        country
      }
    });

    if (error) throw error;

    return data;

  } catch (error: any) {
    console.error('[GOOGLE-PLAY-APP] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get app details'
    };
  }
}
