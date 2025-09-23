/**
 * Legacy Code Protection & Runtime Warnings
 * Prevents accidental reversion to broken iTunes RSS approaches
 */

/**
 * @deprecated DANGER: iTunesReviewsService was deleted because iTunes RSS API is broken
 * Apple changed response format from JSON to text/javascript in 2024-2025
 * 
 * ✅ USE INSTEAD: fetchReviewsViaEdgeFunction() from @/utils/itunesReviews
 * 
 * See docs/ADR-reviews-system.md for complete architectural documentation
 * 
 * This export exists only to provide clear error messages if someone tries to import the deleted service
 */
export const ITunesReviewsService: never = (() => {
  throw new Error(
    '🚨 iTunesReviewsService was deleted - iTunes RSS API is broken!\n\n' +
    '✅ Use fetchReviewsViaEdgeFunction() instead\n' +
    '📚 See docs/ADR-reviews-system.md for details\n\n' +
    'The iTunes RSS API changed format in 2024-2025 and no longer returns JSON.'
  );
})() as never;

/**
 * Development environment protection against direct iTunes RSS calls
 * Monitors fetch calls and warns about dangerous iTunes RSS usage
 */
export function initializeReviewsSystemProtection() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args: Parameters<typeof fetch>) {
      const url = args[0]?.toString() || '';
      
      // Detect dangerous iTunes RSS calls
      if (url.includes('itunes.apple.com/us/rss/customerreviews')) {
        console.error('🚨 DANGER: Direct iTunes RSS call detected!');
        console.error('📍 URL:', url);
        console.error('✅ Use fetchReviewsViaEdgeFunction() instead');
        console.error('📚 See docs/ADR-reviews-system.md for details');
        console.error('💥 This call will fail - iTunes RSS format changed in 2024-2025');
        
        // Also log stack trace to help identify source
        console.error('📍 Call stack:', new Error().stack);
      }
      
      return originalFetch.apply(this, args);
    };
    
    console.log('🛡️ Reviews system protection initialized - will warn about iTunes RSS calls');
  }
}

/**
 * Runtime validation for reviews system usage
 * Call this to verify you're using the correct approach
 */
export function validateReviewsSystemUsage(functionName: string) {
  const validApproaches = [
    'fetchReviewsViaEdgeFunction',
    'fetchAppReviews' // This calls fetchReviewsViaEdgeFunction internally
  ];
  
  if (!validApproaches.includes(functionName)) {
    console.warn(
      `⚠️ Using ${functionName} for reviews - ensure it uses edge functions not direct iTunes RSS`
    );
  }
}

// Auto-initialize protection in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  initializeReviewsSystemProtection();
}