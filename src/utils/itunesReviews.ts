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
  const { data, error } = await supabase.functions.invoke('itunes', {
    body: { op: 'search', term, country, limit },
  });
  if (error) throw new Error(error.message || 'Search failed');
  const body: SearchResponse = data as SearchResponse;
  if ((body as any).results && Array.isArray((body as any).results)) {
    return (body as any).results.slice(0, 5) as AppSearchResultDto[];
  }
  return [body as AppSearchResultDto];
}

export interface ReviewsResponseDto<T = any> {
  success: boolean;
  data?: T[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
}

export async function fetchAppReviews(params: {
  appId: string;
  cc?: string;
  page?: number;
}): Promise<ReviewsResponseDto> {
  const { appId, cc = 'us', page = 1 } = params;
  const { data, error } = await supabase.functions.invoke('itunes', {
    body: { op: 'reviews', cc, appId, page },
  });
  if (error) throw new Error(error.message || 'Failed to fetch reviews');
  const body = data as ReviewsResponseDto;
  if (!body?.success) {
    throw new Error(body?.error || 'Failed to fetch reviews');
  }
  return body;
}
