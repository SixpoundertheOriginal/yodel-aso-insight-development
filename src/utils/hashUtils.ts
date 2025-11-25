/**
 * Hash Utilities - Browser-Compatible
 *
 * Uses Web Crypto API instead of Node.js crypto module
 * for browser compatibility.
 */

/**
 * Create a SHA-256 hash of a string
 *
 * Browser-compatible version using Web Crypto API
 *
 * @param text - Text to hash
 * @returns Hexadecimal hash string
 */
export async function createSHA256Hash(text: string): Promise<string> {
  // Encode the text as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Create SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
}

/**
 * Synchronous fallback using a simple hash function
 *
 * WARNING: NOT cryptographically secure!
 * Only use for cache keys, NOT for security purposes.
 *
 * @param text - Text to hash
 * @returns Hash string
 */
export function simpleHash(text: string): string {
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex and pad
  return Math.abs(hash).toString(16).padStart(8, '0');
}
