import { supabase } from '@/integrations/supabase/client';

export interface AppSearchResult {
  trackId: number;
  trackName: string;
  artistName: string;
  averageUserRating: number;
  userRatingCount: number;
  artworkUrl100: string;
}

export interface AppReview {
  id: string;
  title: string;
  content: string;
  rating: number;
  version: string;
  author: string;
  updated: string;
}

export interface ReviewsResponse {
  reviews: AppReview[];
  hasMore: boolean;
  total: number;
}

/**
 * Search for apps using the iTunes proxy function
 */
export async function searchApps(
  term: string, 
  country: string = 'us', 
  limit: number = 5
): Promise<AppSearchResult[]> {
  if (!term.trim()) {
    return [];
  }

  const { data, error } = await supabase.functions.invoke('itunes', {
    body: {
      op: 'search',
      term: term.trim(),
      country,
      limit
    }
  });

  if (error) {
    console.error('Search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }

  if (!data || !data.results) {
    return [];
  }

  return data.results.map((app: any) => ({
    trackId: app.trackId,
    trackName: app.trackName || 'Unknown App',
    artistName: app.artistName || 'Unknown Developer',
    averageUserRating: app.averageUserRating || 0,
    userRatingCount: app.userRatingCount || 0,
    artworkUrl100: app.artworkUrl100 || ''
  }));
}

/**
 * Fetch reviews for a specific app using the iTunes proxy function
 */
export async function fetchReviews(
  appId: string,
  country: string = 'us',
  page: number = 1
): Promise<ReviewsResponse> {
  if (!appId) {
    throw new Error('App ID is required');
  }

  const { data, error } = await supabase.functions.invoke('itunes', {
    body: {
      op: 'reviews',
      appId,
      cc: country,
      page
    }
  });

  if (error) {
    console.error('Reviews fetch error:', error);
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }

  if (!data) {
    return { reviews: [], hasMore: false, total: 0 };
  }

  const reviews = (data.reviews || []).map((review: any, index: number) => ({
    id: review.id || `review-${Date.now()}-${index}`,
    title: review.title || 'No Title',
    content: review.content || review.text || '',
    rating: review.rating || 0,
    version: review.version || 'Unknown',
    author: review.author || 'Anonymous',
    updated: review.updated || review.updated_at || new Date().toISOString()
  }));

  return {
    reviews,
    hasMore: data.hasMore || false,
    total: data.total || reviews.length
  };
}

/**
 * Export reviews to CSV format
 */
export function exportReviewsToCSV(
  reviews: AppReview[],
  appId: string,
  country: string = 'us'
): void {
  if (reviews.length === 0) {
    throw new Error('No reviews to export');
  }

  // CSV headers as specified in requirements
  const headers = [
    'review_id',
    'title', 
    'text',
    'rating',
    'version',
    'author',
    'updated_at',
    'country',
    'app_id'
  ];

  const csvContent = [
    headers.join(','),
    ...reviews.map(review => [
      `"${review.id}"`,
      `"${review.title.replace(/"/g, '""')}"`,
      `"${review.content.replace(/"/g, '""')}"`,
      review.rating,
      `"${review.version}"`,
      `"${review.author.replace(/"/g, '""')}"`,
      `"${review.updated}"`,
      `"${country}"`,
      `"${appId}"`
    ].join(','))
  ].join('\n');

  // Create and download blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reviews-${appId}-${country}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}