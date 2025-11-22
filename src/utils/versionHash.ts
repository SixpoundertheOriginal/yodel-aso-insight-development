/**
 * Version Hash Utility
 *
 * Computes SHA256 hash for metadata change detection.
 * Used by app_metadata_cache and audit_snapshots to detect
 * when app metadata has changed and requires re-analysis.
 *
 * Hash Input: title + subtitle + description + developer_name + screenshots (stringified)
 */

import { createHash } from 'crypto';

/**
 * Input metadata for version hash computation
 */
export interface VersionHashInput {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  developerName?: string | null;
  screenshots?: string[] | null;
}

/**
 * Computes a deterministic SHA256 hash from metadata fields.
 *
 * This hash is used to detect metadata changes without comparing
 * full text fields. When the hash changes, we know metadata has
 * been updated and a new audit snapshot should be generated.
 *
 * @param input - Metadata fields to hash
 * @returns SHA256 hash (64 hex characters)
 *
 * @example
 * ```ts
 * const hash = computeVersionHash({
 *   title: "Instagram",
 *   subtitle: "Photo & Video Sharing",
 *   description: "Share photos...",
 *   developerName: "Instagram, Inc.",
 *   screenshots: ["https://...", "https://..."]
 * });
 * // => "a1b2c3d4e5f6..."
 * ```
 */
export function computeVersionHash(input: VersionHashInput): string {
  // Normalize input fields to handle null/undefined
  const title = input.title?.trim() || '';
  const subtitle = input.subtitle?.trim() || '';
  const description = input.description?.trim() || '';
  const developerName = input.developerName?.trim() || '';
  const screenshots = input.screenshots || [];

  // Create deterministic string representation
  // Format: field1|field2|field3|field4|[screenshot1,screenshot2,...]
  const screenshotsStr = screenshots.join(',');
  const combined = `${title}|${subtitle}|${description}|${developerName}|[${screenshotsStr}]`;

  // Compute SHA256 hash
  const hash = createHash('sha256');
  hash.update(combined, 'utf8');
  return hash.digest('hex');
}

/**
 * Checks if two version hashes are different (metadata has changed).
 *
 * @param hash1 - First version hash
 * @param hash2 - Second version hash
 * @returns true if hashes differ (metadata changed)
 */
export function hasMetadataChanged(hash1: string, hash2: string): boolean {
  return hash1 !== hash2;
}

/**
 * Validates that a string is a valid SHA256 hash.
 *
 * @param hash - String to validate
 * @returns true if valid SHA256 hash format (64 hex characters)
 */
export function isValidVersionHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}
