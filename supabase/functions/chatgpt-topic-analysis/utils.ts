// Utility function to get ordinal suffix
export function getOrdinalSuffix(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${num}th`;
  }
  
  switch (lastDigit) {
    case 1: return `${num}st`;
    case 2: return `${num}nd`;
    case 3: return `${num}rd`;
    default: return `${num}th`;
  }
}

// Enhanced entity name validation
export function isValidCompanyName(name: string): boolean {
  const trimmed = name.trim();
  
  // Must be at least 2 characters and contain at least one letter
  if (trimmed.length < 2 || !/[a-zA-Z]/.test(trimmed)) {
    return false;
  }
  
  // Filter out generic industry terms
  const genericTerms = [
    'app store optimization', 'aso', 'mobile marketing', 'digital marketing',
    'marketing agency', 'seo', 'sem', 'advertising', 'promotion', 'campaign',
    'software', 'platform', 'solution', 'service', 'tool', 'system',
    'technology', 'tech', 'app', 'mobile', 'website', 'online',
    'business', 'company', 'agency', 'firm', 'group', 'team',
    'consulting', 'services', 'solutions', 'experts', 'professionals'
  ];
  
  const lowerName = trimmed.toLowerCase();
  if (genericTerms.some(term => lowerName === term || lowerName.includes(term))) {
    return false;
  }
  
  // Filter out common adjectives and descriptive words
  const descriptiveWords = [
    'best', 'top', 'leading', 'premier', 'innovative', 'advanced',
    'expert', 'professional', 'reliable', 'trusted', 'effective',
    'powerful', 'comprehensive', 'complete', 'full', 'custom',
    'specialized', 'dedicated', 'experienced', 'proven', 'established'
  ];
  
  if (descriptiveWords.some(word => lowerName === word)) {
    return false;
  }
  
  // Must start with a capital letter or number for proper company names
  if (!/^[A-Z0-9]/.test(trimmed)) {
    return false;
  }
  
  return true;
}

// Enhanced entity extraction with better filtering
export function extractValidEntityName(content: string): string | null {
  // Remove bold/italic formatting: **Company** or *Company*
  let cleaned = content.replace(/\*+([^*]+)\*+/g, '$1');
  
  // Remove common prefixes and suffixes
  cleaned = cleaned.replace(/^(The\s+)|(Inc\.?|LLC|Ltd\.?|Corporation|Corp\.?|\s*-.*|\s*:.*|\s*\(.*\))$/gi, '').trim();
  
  // Extract company name (usually first few words before colon, dash, or description)
  const match = cleaned.match(/^([^:\-–—\(]+)/);
  const entityName = match ? match[1].trim() : cleaned.trim();
  
  // Validate the extracted entity name
  return isValidCompanyName(entityName) ? entityName : null;
}