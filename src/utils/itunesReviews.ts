import { supabase } from '@/integrations/supabase/client';

export interface AppSearchResultDto {
  name: string;
  appId: string;
  developer: string;
  rating: number;
  reviews: number;
  icon: string;
  applicationCategory: string;
}

type SearchResponse =
  | { results: AppSearchResultDto[]; isAmbiguous?: boolean; message?: string }
  | (AppSearchResultDto & { searchContext?: unknown });

export async function searchApps(params: {
  term: string;
  country?: string;
  limit?: number;
}): Promise<AppSearchResultDto[]> {
  const { term, country = 'us', limit = 5 } = params;
  console.log('[searchApps] Searching for:', { term, country, limit });
  
  const { data, error } = await supabase.functions.invoke('app-store-scraper', {
    body: { 
      op: 'search',
      searchTerm: term, 
      country, 
      limit,
      searchType: 'keyword'
    },
  });
  if (error) throw new Error(error.message || 'Search failed');
  
  // Handle both single result and multiple results response formats
  if (data?.results && Array.isArray(data.results)) {
    return data.results.slice(0, limit) as AppSearchResultDto[];
  } else if (data && !data.results) {
    // Single app result
    return [data] as AppSearchResultDto[];
  }
  return [];
}

export interface ReviewsResponseDto<T = any> {
  success: boolean;
  data?: T[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
  totalReviews?: number;
}

export async function fetchAppReviews(params: {
  appId: string;
  cc?: string;
  page?: number;
  pageSize?: number;
}): Promise<ReviewsResponseDto> {
  const { appId, cc = 'us', page = 1, pageSize = 20 } = params;
  console.log('[fetchAppReviews] Fetching reviews for:', { appId, cc, page, pageSize });
  
  const { data, error } = await supabase.functions.invoke('app-store-scraper', {
    body: { op: 'reviews', cc, appId, page, pageSize },
  });
  if (error) throw new Error(error.message || 'Failed to fetch reviews');
  
  // Handle the new response format with nested data
  const reviewsData = data?.data;
  if (!reviewsData) {
    throw new Error('No data received from reviews API');
  }
  
  return {
    success: true,
    data: reviewsData.reviews || [],
    currentPage: reviewsData.page || page,
    hasMore: reviewsData.has_next_page || false,
    totalReviews: reviewsData.reviews?.length || 0
  };
}
