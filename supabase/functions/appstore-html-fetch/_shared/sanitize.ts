/**
 * HTML Sanitization Utility
 *
 * Removes dangerous elements and caps size for security.
 * Prevents XSS, code execution, and DoS attacks.
 */

const MAX_HTML_SIZE = 300 * 1024; // 300 KB

/**
 * Sanitize HTML by removing dangerous elements
 */
export function sanitizeHtml(html: string): string {
  let sanitized = html;

  // Remove <script> tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove <iframe> tags and their content
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove inline event handlers (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol in attributes
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol in attributes (potential XSS vector)
  sanitized = sanitized.replace(/\s+(?:src|href)\s*=\s*["']data:[^"']*["']/gi, '');

  return sanitized;
}

/**
 * Truncate HTML to maximum size
 */
export function truncateHtml(html: string, maxSize: number = MAX_HTML_SIZE): string {
  if (html.length <= maxSize) {
    return html;
  }

  // Truncate and add marker
  const truncated = html.substring(0, maxSize);
  return truncated + '\n<!-- [TRUNCATED] -->';
}

/**
 * Full sanitization pipeline
 */
export function sanitizeAndTruncate(html: string): {
  sanitized: string;
  originalLength: number;
  truncated: boolean;
} {
  const originalLength = html.length;
  const sanitized = sanitizeHtml(html);
  const final = truncateHtml(sanitized);

  return {
    sanitized: final,
    originalLength,
    truncated: final.length < sanitized.length,
  };
}
