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

// Direct HTTP call to edge function as fallback
async function searchViaDirectHTTP(params: {
  term: string;
  country?: string;
  limit?: number;
}): Promise<AppSearchResultDto[]> {
  const { term, country = 'us', limit = 5 } = params;
  
  console.log('[searchApps] Using direct HTTP to edge function');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
  
  try {
    const response = await fetch(`https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek`,
      },
      body: JSON.stringify({
        op: 'search',
        searchTerm: term,
        country,
        limit,
        searchType: 'keyword'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new EdgeFunctionError(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
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
      throw new NetworkError('Direct HTTP request timed out');
    }
    
    throw new EdgeFunctionError(`Direct HTTP failed: ${error.message}`, error);
  }
}

// Enhanced search with edge function and fallback
async function searchViaEdgeFunction(params: {
  term: string;
  country?: string;
  limit?: number;
}): Promise<AppSearchResultDto[]> {
  const { term, country = 'us', limit = 5 } = params;
  
  // Try Supabase client method first
  try {
    console.log('[searchApps] Trying supabase.functions.invoke()');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
    
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
      console.warn('[searchApps] Supabase invoke error, trying direct HTTP:', error.message);
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
    console.warn('[searchApps] Supabase invoke failed, trying direct HTTP:', error.message);
    
    // Fallback to direct HTTP call
    return await searchViaDirectHTTP(params);
  }
}

export async function searchApps(params: {
  term: string;
  country?: string;
  limit?: number;
}): Promise<AppSearchResultDto[]> {
  const { term, country = 'us', limit = 5 } = params;
  console.log('[searchApps] Enhanced search with multi-fallback:', { term, country, limit });
  
  try {
    // Primary: Try edge function (includes both Supabase client and direct HTTP)
    return await retryWithBackoff(() => searchViaEdgeFunction(params));
    
  } catch (edgeFunctionError: any) {
    console.warn('[searchApps] All edge function methods failed after retries:', edgeFunctionError.message);
    
    try {
      // Final Fallback: Direct iTunes API with retries
      console.log('[searchApps] Attempting final fallback to direct iTunes API');
      return await retryWithBackoff(() => searchViaDirectItunesAPI(params));
      
    } catch (fallbackError: any) {
      console.error('[searchApps] All methods failed:', {
        edgeFunctionError: edgeFunctionError.message,
        fallbackError: fallbackError.message
      });
      
      // Throw a comprehensive error message with troubleshooting hints
      const errorMessage = edgeFunctionError instanceof NetworkError
        ? 'Connection timeout - please check your internet connection and try again'
        : edgeFunctionError instanceof EdgeFunctionError
        ? `Service temporarily unavailable: ${edgeFunctionError.message}. Please try again in a few moments.`
        : `All search methods failed. Edge function: ${edgeFunctionError.message}. Direct API: ${fallbackError.message}`;
      
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

/**
 * Parse reviews response to handle different response structures
 */
function parseReviewsResponse(data: any, fallbackPage: number = 1): ReviewsResponseDto {
  console.log('[parseReviewsResponse] Parsing response:', data);
  
  // Handle error responses
  if (data?.success === false || data?.error) {
    return {
      success: false,
      error: data.error || 'Unknown error from reviews API',
      currentPage: fallbackPage,
      hasMore: false,
      totalReviews: 0
    };
  }
  
  // Case 1: Direct ReviewsResponse structure with success field
  if (data?.success === true && data?.data && Array.isArray(data.data)) {
    console.log('[parseReviewsResponse] Found direct success structure');
    return {
      success: true,
      data: data.data,
      currentPage: data.currentPage || fallbackPage,
      hasMore: data.hasMore || false,
      totalReviews: data.totalReviews || data.data.length
    };
  }
  
  // Case 2: Nested structure { data: { reviews: [...], page: 1, has_next_page: false } }
  if (data?.data?.reviews && Array.isArray(data.data.reviews)) {
    console.log('[parseReviewsResponse] Found nested structure with reviews array');
    return {
      success: true,
      data: data.data.reviews,
      currentPage: data.data.page || data.data.currentPage || fallbackPage,
      hasMore: data.data.has_next_page || data.data.hasMore || false,
      totalReviews: data.data.totalReviews || data.data.reviews.length
    };
  }
  
  // Case 3: Direct array of reviews
  if (Array.isArray(data)) {
    console.log('[parseReviewsResponse] Found direct array structure');
    return {
      success: true,
      data: data,
      currentPage: fallbackPage,
      hasMore: false,
      totalReviews: data.length
    };
  }
  
  // Case 4: Top-level data array { data: [...] }
  if (data?.data && Array.isArray(data.data)) {
    console.log('[parseReviewsResponse] Found top-level data array');
    return {
      success: true,
      data: data.data,
      currentPage: data.currentPage || fallbackPage,
      hasMore: data.hasMore || false,
      totalReviews: data.totalReviews || data.data.length
    };
  }
  
  // Case 5: Unknown structure - return error with detailed info
  console.error('[parseReviewsResponse] Unknown response structure:', {
    type: typeof data,
    keys: data ? Object.keys(data) : 'null',
    hasSuccess: 'success' in (data || {}),
    hasData: 'data' in (data || {}),
    dataType: data?.data ? typeof data.data : 'undefined'
  });
  
  return {
    success: false,
    error: `Invalid response structure from reviews API. Expected reviews array but got: ${typeof data}`,
    currentPage: fallbackPage,
    hasMore: false,
    totalReviews: 0
  };
}

// Direct HTTP call to edge function for reviews
async function fetchReviewsViaDirectHTTP(params: {
  appId: string;
  cc?: string;
  page?: number;
  pageSize?: number;
}): Promise<ReviewsResponseDto> {
  const { appId, cc = 'us', page = 1, pageSize = 20 } = params;
  
  console.log('[fetchAppReviews] Using direct HTTP to edge function for reviews');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
  
  try {
    const response = await fetch(`https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek`,
      },
      body: JSON.stringify({
        op: 'reviews',
        cc,
        appId,
        page,
        pageSize
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new EdgeFunctionError(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[fetchAppReviews] Raw direct HTTP response:', data);
    
    return parseReviewsResponse(data, page);
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new NetworkError('Direct HTTP reviews request timed out');
    }
    
    throw new EdgeFunctionError(`Direct HTTP reviews failed: ${error.message}`, error);
  }
}

// Enhanced reviews with edge function and direct HTTP fallback
async function fetchReviewsViaEdgeFunction(params: {
  appId: string;
  cc?: string;
  page?: number;
  pageSize?: number;
}): Promise<ReviewsResponseDto> {
  const { appId, cc = 'us', page = 1, pageSize = 20 } = params;
  
  // Try Supabase client method first
  try {
    console.log('[fetchAppReviews] Trying supabase.functions.invoke() for reviews');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
    
    const { data, error } = await supabase.functions.invoke('app-store-scraper', {
      body: { op: 'reviews', cc, appId, page, pageSize },
    });
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.warn('[fetchAppReviews] Supabase invoke error, trying direct HTTP:', error.message);
      throw new EdgeFunctionError(error.message || 'Edge function reviews failed');
    }
    
    console.log('[fetchAppReviews] Raw edge function response:', data);
    
    return parseReviewsResponse(data, page);
    
  } catch (error: any) {
    console.warn('[fetchAppReviews] Supabase invoke failed, trying direct HTTP:', error.message);
    
    // Fallback to direct HTTP call
    return await fetchReviewsViaDirectHTTP(params);
  }
}

// Main App Reviews Fetch Function - Direct iTunes RSS Implementation
export async function fetchAppReviews(params: {
  appId: string;
  cc?: string;
  page?: number;
  pageSize?: number;
}): Promise<ReviewsResponseDto> {
  const { appId, cc = 'us', page = 1 } = params;
  console.log('[fetchAppReviews] Direct iTunes RSS approach:', { appId, cc, page });
  
  if (!appId) {
    return {
      success: false,
      error: 'App ID is required',
      currentPage: page,
      hasMore: false,
      totalReviews: 0
    };
  }

  // Direct iTunes RSS integration - no edge function dependency
  try {
    // Dynamic import to avoid circular dependencies
    const { ITunesReviewsService } = await import('@/services/iTunesReviewsService');
    
    const result = await fetchReviewsViaEdgeFunction({
      appId,
      cc,
      page
    });

    console.log('[fetchAppReviews] Edge function result:', {
      success: result.success,
      reviewCount: result.data?.length || 0,
      hasMore: result.hasMore,
      error: result.error
    });

    // Transform to expected format for backward compatibility
    return {
      success: result.success,
      data: result.data,
      currentPage: result.currentPage,
      hasMore: result.hasMore,
      totalReviews: result.totalReviews,
      error: result.error
    };
    
  } catch (error: any) {
    console.error('[fetchAppReviews] Direct iTunes RSS failed:', error);
    
    return {
      success: false,
      error: `Failed to fetch reviews: ${error.message}`,
      currentPage: page,
      hasMore: false,
      totalReviews: 0
    };
  }
}
