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

// Enhanced entity name validation with comprehensive filtering
export function isValidCompanyName(name: string): boolean {
  const trimmed = name.trim();
  
  // Must be at least 3 characters and contain at least one letter
  if (trimmed.length < 3 || !/[a-zA-Z]/.test(trimmed)) {
    return false;
  }
  
  // Comprehensive blacklist of common words that should never be entities
  const commonWords = [
    // Articles, pronouns, conjunctions
    'the', 'this', 'that', 'these', 'those', 'here', 'there', 'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom',
    'and', 'but', 'for', 'nor', 'yet', 'so', 'or', 'if', 'then', 'else', 'when', 'while', 'since', 'because', 'although',
    'they', 'their', 'them', 'we', 'our', 'us', 'you', 'your', 'it', 'its', 'he', 'his', 'him', 'she', 'her', 'hers',
    
    // Time and sequence words
    'now', 'then', 'next', 'first', 'last', 'before', 'after', 'during', 'while', 'until', 'since', 'today', 'tomorrow',
    'yesterday', 'year', 'month', 'week', 'day', 'time', 'moment', 'period', 'phase', 'stage', 'step', 'process',
    
    // Quantifiers and descriptors
    'all', 'some', 'many', 'few', 'most', 'more', 'less', 'much', 'little', 'several', 'various', 'different', 'same',
    'other', 'another', 'each', 'every', 'any', 'no', 'none', 'both', 'either', 'neither',
    
    // Adjectives and descriptors
    'best', 'top', 'leading', 'premier', 'innovative', 'advanced', 'expert', 'professional', 'reliable', 'trusted',
    'effective', 'powerful', 'comprehensive', 'complete', 'full', 'custom', 'specialized', 'dedicated', 'experienced',
    'proven', 'established', 'new', 'old', 'recent', 'current', 'latest', 'popular', 'common', 'unique', 'special',
    
    // Verbs and actions
    'can', 'could', 'will', 'would', 'should', 'must', 'may', 'might', 'do', 'does', 'did', 'have', 'has', 'had',
    'get', 'got', 'make', 'made', 'take', 'took', 'give', 'gave', 'see', 'saw', 'know', 'knew', 'find', 'found',
    'use', 'used', 'help', 'helps', 'work', 'works', 'include', 'includes', 'provide', 'provides'
  ];
  
  const lowerName = trimmed.toLowerCase();
  if (commonWords.includes(lowerName)) {
    return false;
  }
  
  // Filter out generic industry terms
  const genericTerms = [
    'app store optimization', 'aso', 'mobile marketing', 'digital marketing', 'marketing agency', 'seo', 'sem',
    'advertising', 'promotion', 'campaign', 'software', 'platform', 'solution', 'service', 'tool', 'system',
    'technology', 'tech', 'app', 'mobile', 'website', 'online', 'business', 'company', 'agency', 'firm',
    'group', 'team', 'consulting', 'services', 'solutions', 'experts', 'professionals', 'marketing', 'growth',
    'optimization', 'analytics', 'intelligence', 'insights', 'strategy', 'tactics', 'approach', 'method'
  ];
  
  if (genericTerms.some(term => lowerName === term || lowerName.includes(term))) {
    return false;
  }
  
  // Filter out single common words that often appear in sentences
  const sentenceWords = [
    'with', 'from', 'into', 'over', 'under', 'above', 'below', 'through', 'across', 'around', 'between', 'among',
    'within', 'without', 'against', 'toward', 'towards', 'upon', 'onto', 'off', 'out', 'up', 'down', 'in', 'on', 'at',
    'by', 'to', 'of', 'as', 'like', 'than', 'such', 'only', 'also', 'even', 'just', 'still', 'already', 'yet'
  ];
  
  if (sentenceWords.includes(lowerName)) {
    return false;
  }
  
  // Must contain proper noun characteristics (start with capital or be all caps for acronyms)
  if (!/^[A-Z]/.test(trimmed) && !/^[A-Z]{2,}$/.test(trimmed)) {
    return false;
  }
  
  // Filter out obvious non-company patterns
  if (/^(and|or|but|the|a|an)\s/i.test(trimmed)) {
    return false;
  }
  
  return true;
}

// Enhanced entity extraction with context-aware filtering
export function extractValidEntityName(content: string): string | null {
  // Remove bold/italic formatting but preserve content: **Company** or *Company*
  let cleaned = content.replace(/\*+([^*]+)\*+/g, '$1');
  
  // Remove common prefixes and suffixes
  cleaned = cleaned.replace(/^(The\s+)|(Inc\.?|LLC|Ltd\.?|Corporation|Corp\.?|\s*-.*|\s*:.*|\s*\(.*\))$/gi, '').trim();
  
  // Look for company names in structured patterns
  let entityName = null;
  
  // Pattern 1: Bold text (likely company names)
  const boldMatch = content.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) {
    entityName = boldMatch[1].trim();
  }
  
  // Pattern 2: Company name followed by colon or dash (description)
  if (!entityName) {
    const colonMatch = cleaned.match(/^([^:\-–—\(]+)(?:[::\-–—\(]|$)/);
    if (colonMatch) {
      entityName = colonMatch[1].trim();
    }
  }
  
  // Pattern 3: Domain/website mentions
  if (!entityName) {
    const domainMatch = content.match(/(\w+)\.(?:com|ai|io|co|net|org)\b/);
    if (domainMatch) {
      entityName = domainMatch[1];
    }
  }
  
  // Pattern 4: Capitalized multi-word company names (max 3 words)
  if (!entityName) {
    const companyMatch = cleaned.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]*){0,2})\b/);
    if (companyMatch) {
      entityName = companyMatch[1].trim();
    }
  }
  
  // Pattern 5: Acronyms (2-6 uppercase letters)
  if (!entityName) {
    const acronymMatch = cleaned.match(/^([A-Z]{2,6})\b/);
    if (acronymMatch) {
      entityName = acronymMatch[1];
    }
  }
  
  // Fallback: Take first few words before punctuation
  if (!entityName) {
    const fallbackMatch = cleaned.match(/^([^:\-–—\(,.;!?]+)/);
    entityName = fallbackMatch ? fallbackMatch[1].trim() : cleaned.trim();
  }
  
  // Final validation
  if (!entityName || entityName.length < 3) {
    return null;
  }
  
  // Clean up common word artifacts
  entityName = entityName.replace(/^(and|or|but|the|a|an)\s+/i, '').trim();
  
  // Validate the extracted entity name
  return isValidCompanyName(entityName) ? entityName : null;
}