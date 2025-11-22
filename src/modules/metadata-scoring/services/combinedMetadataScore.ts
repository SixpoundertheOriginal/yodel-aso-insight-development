/**
 * Combined Metadata Score Service
 *
 * Combines title and subtitle scores into a weighted metadata score.
 */

import type { CombinedMetadataScoreResult } from '../types';
import { getMetadataScoringConfig } from './configLoader';
import { scoreTitle } from './titleScoringService';
import { scoreSubtitle } from './subtitleScoringService';

/**
 * Calculates combined metadata score from title and subtitle
 *
 * @param title - App title text
 * @param subtitle - App subtitle text
 * @returns CombinedMetadataScoreResult with weighted score and details
 */
export function scoreMetadata(title: string, subtitle: string): CombinedMetadataScoreResult {
  // Load configuration
  const config = getMetadataScoringConfig();

  // Score title and subtitle
  const titleResult = scoreTitle(title);
  const subtitleResult = scoreSubtitle(title, subtitle);

  // Calculate weighted combined score
  const metadataScore = Math.round(
    (titleResult.score * config.title.weight_in_metadata_score) +
    (subtitleResult.score * config.subtitle.weight_in_metadata_score)
  );

  return {
    metadataScore,
    title: titleResult,
    subtitle: subtitleResult
  };
}
