/**
 * TypeScript Protection Against Legacy iTunes RSS Service
 * 
 * This file prevents imports of the deleted iTunesReviewsService
 * and provides clear error messages for developers
 */

declare module '@/services/iTunesReviewsService' {
  /**
   * @deprecated iTunesReviewsService was deleted - iTunes RSS API is broken!
   * 
   * Apple changed response format from JSON to text/javascript in 2024-2025
   * causing 100% failure rate for direct client calls.
   * 
   * ✅ USE INSTEAD: 
   * ```typescript
   * import { fetchAppReviews } from '@/utils/itunesReviews';
   * // OR
   * import { fetchReviewsViaEdgeFunction } from '@/utils/itunesReviews';
   * ```
   * 
   * 📚 See docs/ADR-reviews-system.md for complete documentation
   * 
   * If you see this error, you're trying to import a deleted service.
   * The edge function approach is the only working solution.
   */
  export const ITunesReviewsService: 'iTunes RSS API is broken - use fetchReviewsViaEdgeFunction() instead';
  export default never;
}