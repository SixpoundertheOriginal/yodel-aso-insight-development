/**
 * Creative Fetch API
 *
 * API wrapper for calling creative-related Edge Functions.
 * Will integrate with screenshot scraping and analysis Edge Functions.
 *
 * Phase 0: Stub implementation (21.11.2025)
 */

import type { Screenshot, CreativeAnalysis } from '../types';

/**
 * Call Edge Function to fetch app screenshots
 *
 * @param appId - App Store ID
 * @param country - Country code
 * @returns Promise<Screenshot[]>
 *
 * Phase 0: Returns empty array (stub)
 * Phase 1: Will call existing or new screenshot Edge Function
 */
export async function fetchScreenshotsApi(
  appId: string,
  country: string = 'us'
): Promise<Screenshot[]> {
  console.log('[Creative API] fetchScreenshotsApi called (stub):', { appId, country });

  // Phase 0: Stub implementation
  // Phase 1: Will call Edge Function:
  // const response = await fetch(`${SUPABASE_URL}/functions/v1/screenshot-fetch`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', ...auth },
  //   body: JSON.stringify({ appId, country }),
  // });

  return [];
}

/**
 * Call Edge Function to analyze screenshots
 *
 * @param screenshots - Screenshots to analyze
 * @returns Promise<CreativeAnalysis[]>
 *
 * Phase 0: Returns empty array (stub)
 * Phase 2: Will call OCR Edge Function
 * Phase 3: Will call CV model Edge Function
 */
export async function analyzeScreenshotsApi(
  screenshots: Screenshot[]
): Promise<CreativeAnalysis[]> {
  console.log('[Creative API] analyzeScreenshotsApi called (stub):', screenshots);

  // Phase 0: Stub implementation
  // Phase 2: Will call Edge Function:
  // const response = await fetch(`${SUPABASE_URL}/functions/v1/creative-analyze`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', ...auth },
  //   body: JSON.stringify({ screenshots }),
  // });

  return [];
}

/**
 * Call Edge Function to generate creative insights
 *
 * @param appId - App Store ID
 * @param analyses - Creative analyses
 * @returns Promise<any>
 *
 * Phase 0: Returns null (stub)
 * Phase 4: Will call AI insights Edge Function
 */
export async function generateInsightsApi(
  appId: string,
  analyses: CreativeAnalysis[]
): Promise<any> {
  console.log('[Creative API] generateInsightsApi called (stub):', { appId, analyses });

  // Phase 0: Stub implementation
  // Phase 4: Will call Edge Function:
  // const response = await fetch(`${SUPABASE_URL}/functions/v1/creative-insights`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', ...auth },
  //   body: JSON.stringify({ appId, analyses }),
  // });

  return null;
}
