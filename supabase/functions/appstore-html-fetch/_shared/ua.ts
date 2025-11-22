/**
 * User-Agent Rotation Utility
 *
 * Provides rotating User-Agent strings to avoid blocking by Apple.
 * Includes 5 diverse agents covering major platforms.
 */

export const USER_AGENTS = [
  // macOS Chrome
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  // Windows Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  // iPhone Safari
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',

  // iPad Safari
  'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',

  // Linux Chrome
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Select a User-Agent string
 * Uses appId as seed for consistent selection per app (aids caching)
 */
export function selectUserAgent(appId: string): string {
  // Use appId as seed for consistent selection
  const seed = parseInt(appId.slice(-4), 10) || 0;
  const index = seed % USER_AGENTS.length;
  return USER_AGENTS[index];
}

/**
 * Get random User-Agent (for retry attempts)
 */
export function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}
