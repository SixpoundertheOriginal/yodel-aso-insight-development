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

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

// Enhanced error types for better error handling
class EdgeFunctionError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

class NetworkError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ApiError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Retry with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_RETRY_DELAY
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        10000
      );
      
      console.log(`[searchApps] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Direct iTunes API fallback
async function searchViaDirectItunesAPI(params: {
  term: string;
  country?: string;
  limit?: number;
}): Promise<AppSearchResultDto[]> {
  const { term, country = 'us', limit = 5 } = params;
  
  console.log('[searchApps] Using direct iTunes API fallback');
  
  const searchUrl = new URL('https://itunes.apple.com/search');
  searchUrl.searchParams.set('term', term);
  searchUrl.searchParams.set('country', country);
  searchUrl.searchParams.set('media', 'software');
  searchUrl.searchParams.set('entity', 'software');
  searchUrl.searchParams.set('limit', String(limit));
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
  
  try {
    const response = await fetch(searchUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ASO-Insights-Platform/App-Search'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new ApiError(`iTunes API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }
    
    return data.results.slice(0, limit).map((item: any): AppSearchResultDto => ({
      name: item.trackName || 'Unknown App',
      appId: String(item.trackId || ''),
      developer: item.artistName || 'Unknown Developer',
      rating: item.averageUserRating || 0,
      reviews: item.userRatingCount || 0,
      icon: item.artworkUrl512 || item.artworkUrl100 || '',
      applicationCategory: item.primaryGenreName || 'App',
    }));
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new NetworkError('Direct iTunes API request timed out');
    }
    
    throw new ApiError(`Direct iTunes API failed: ${error.message}`, error);
  }
}

// Enhanced search with edge function and fallback
async function searchViaEdgeFunction(params: {
  term: string;
  country?: string;
  limit?: number;
}): Promise<AppSearchResultDto[]> {
  const { term, country = 'us', limit = 5 } = params;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
  
  try {
    const { data, error } = await supabase.functions.invoke('app-store-scraper', {
      body: { 
        op: 'search',
        searchTerm: term, 
        country, 
        limit,
        searchType: 'keyword'
      },
    });
    
    clearTimeout(timeoutId);
    
    if (error) {
      throw new EdgeFunctionError(error.message || 'Edge function search failed');
    }
    
    // Handle response data
    const normalize = (item: any): AppSearchResultDto => {
      let appId: string | undefined = item.appId;
      if (!appId && typeof item.url === 'string') {
        const m = item.url.match(/id(\d+)/);
        if (m) appId = m[1];
      }
      if (!appId && item.trackId) {
        appId = String(item.trackId);
      }

      return {
        name: item.name || item.trackName || 'Unknown App',
        appId: appId || '',
        developer: item.developer || item.artistName || 'Unknown Developer',
        rating: typeof item.rating === 'number' ? item.rating : (item.averageUserRating || 0),
        reviews: typeof item.reviews === 'number' ? item.reviews : (item.userRatingCount || 0),
        icon: item.icon || item.artworkUrl512 || item.artworkUrl100 || '',
        applicationCategory: item.applicationCategory || item.primaryGenreName || 'App',
      };
    };

    if (data?.results && Array.isArray(data.results)) {
      return data.results.slice(0, limit).map(normalize);
    } else if (data && !data.results) {
      return [normalize(data)];
    }
    
    return [];
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new NetworkError('Edge function request timed out');
    }
    
    throw new EdgeFunctionError(`Edge function failed: ${error.message}`, error);
  }
}

export async function searchApps(params: {
  term: string;
  country?: string;
  limit?: number;
}): Promise<AppSearchResultDto[]> {
  const { term, country = 'us', limit = 5 } = params;
  console.log('[searchApps] Enhanced search with fallback:', { term, country, limit });
  
  try {
    // Primary: Try edge function with retries
    return await retryWithBackoff(() => searchViaEdgeFunction(params));
    
  } catch (edgeFunctionError: any) {
    console.warn('[searchApps] Edge function failed after retries:', edgeFunctionError.message);
    
    try {
      // Fallback: Direct iTunes API with retries
      console.log('[searchApps] Attempting fallback to direct iTunes API');
      return await retryWithBackoff(() => searchViaDirectItunesAPI(params));
      
    } catch (fallbackError: any) {
      console.error('[searchApps] Both edge function and fallback failed:', {
        edgeFunctionError: edgeFunctionError.message,
        fallbackError: fallbackError.message
      });
      
      // Throw a comprehensive error message
      const errorMessage = edgeFunctionError instanceof NetworkError
        ? 'Connection timeout - please check your internet connection and try again'
        : edgeFunctionError instanceof EdgeFunctionError
        ? 'Service temporarily unavailable - please try again in a few moments'
        : `Search failed: ${edgeFunctionError.message}. Fallback also failed: ${fallbackError.message}`;
      
      throw new Error(errorMessage);
    }
  }
}

export interface ReviewsResponseDto<T = any> {
  success: boolean;
  data?: T[];
  error?: string;
  currentPage: number;
  hasMore: boolean;
  totalReviews?: number;
}

// Enhanced reviews fetching with retry and fallback
export async function fetchAppReviews(params: {
  appId: string;
  cc?: string;
  page?: number;
  pageSize?: number;
}): Promise<ReviewsResponseDto> {
  const { appId, cc = 'us', page = 1, pageSize = 20 } = params;
  console.log('[fetchAppReviews] Enhanced fetch with fallback:', { appId, cc, page, pageSize });
  
  try {
    // Primary: Try edge function with retries
    return await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
      
      try {
        const { data, error } = await supabase.functions.invoke('app-store-scraper', {
          body: { op: 'reviews', cc, appId, page, pageSize },
        });
        
        clearTimeout(timeoutId);
        
        if (error) {
          throw new EdgeFunctionError(error.message || 'Failed to fetch reviews');
        }
        
        const reviewsData = data?.data;
        if (!reviewsData) {
          throw new EdgeFunctionError('No data received from reviews API');
        }
        
        return {
          success: true,
          data: reviewsData.reviews || [],
          currentPage: reviewsData.page || page,
          hasMore: reviewsData.has_next_page || false,
          totalReviews: reviewsData.reviews?.length || 0
        };
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new NetworkError('Reviews fetch request timed out');
        }
        
        throw error;
      }
    });
    
  } catch (edgeFunctionError: any) {
    console.warn('[fetchAppReviews] Edge function failed after retries:', edgeFunctionError.message);
    
    // For reviews, we don't have a direct iTunes API fallback like we do for search
    // iTunes RSS requires specific formatting and parsing
    const errorMessage = edgeFunctionError instanceof NetworkError
      ? 'Connection timeout while fetching reviews - please check your internet connection and try again'
      : edgeFunctionError instanceof EdgeFunctionError
      ? 'Reviews service temporarily unavailable - please try again in a few moments'
      : `Failed to fetch reviews: ${edgeFunctionError.message}`;
    
    throw new Error(errorMessage);
  }
}
