// Brand recognition utilities for ChatGPT visibility analysis

// Generic terms to filter out from competitor detection
const GENERIC_TERMS = new Set([
  'app', 'application', 'apps', 'software', 'program', 'tool', 'platform',
  'service', 'system', 'website', 'site', 'solution', 'product',
  'this', 'that', 'these', 'those', 'it', 'they', 'them',
  'popular', 'best', 'top', 'good', 'great', 'other', 'another',
  'many', 'several', 'various', 'different', 'similar', 'alternative',
  'free', 'paid', 'premium', 'basic', 'advanced', 'simple', 'easy'
]);

// Known language learning apps (can be expanded)
const KNOWN_LANGUAGE_APPS = [
  'duolingo', 'babbel', 'rosetta stone', 'rosetta', 'pimsleur', 'busuu',
  'lingoda', 'hellotalk', 'memrise', 'mondly', 'anki', 'italki',
  'speaky', 'tandem', 'cambly', 'preply', 'verbling', 'fluentu',
  'clozemaster', 'drops', 'beelinguapp', 'nemo', 'mango languages',
  'rocket languages', 'transparent language', 'lingq', 'glossika'
];

// Enhanced app mention detection
export function checkAppMention(responseText: string, targetApp: string): boolean {
  const lowerResponse = responseText.toLowerCase();
  const lowerTargetApp = targetApp.toLowerCase();
  
  // Multiple detection patterns
  const patterns = [
    // Exact word boundaries
    new RegExp(`\\b${escapeRegex(lowerTargetApp)}\\b`, 'i'),
    // Formatted text (bold, italic)
    new RegExp(`\\*\\*${escapeRegex(targetApp)}\\*\\*`, 'gi'),
    new RegExp(`\\*${escapeRegex(targetApp)}\\*`, 'gi'),
    // Numbered lists
    new RegExp(`\\d+\\.\\s*${escapeRegex(targetApp)}`, 'gi'),
    // Quoted mentions
    new RegExp(`"${escapeRegex(targetApp)}"`, 'gi'),
    new RegExp(`'${escapeRegex(targetApp)}'`, 'gi'),
  ];
  
  return patterns.some(pattern => pattern.test(responseText));
}

// Extract competitor app names with smart filtering
export function extractCompetitors(responseText: string, targetApp: string): string[] {
  const competitors = new Set<string>();
  const lowerTargetApp = targetApp.toLowerCase();
  
  // First, check for known language learning apps
  for (const app of KNOWN_LANGUAGE_APPS) {
    if (app !== lowerTargetApp && checkAppMention(responseText, app)) {
      competitors.add(capitalizeAppName(app));
    }
  }
  
  // Extract potential app names from patterns
  const appPatterns = [
    // Capitalized words that might be app names
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
    // Words followed by "app" or similar
    /\b([A-Z][a-z]+)\s+(?:app|application|platform)\b/gi,
    // Quoted app names
    /"([^"]+)"/g,
    /'([^']+)'/g,
  ];
  
  for (const pattern of appPatterns) {
    const matches = responseText.matchAll(pattern);
    for (const match of matches) {
      const candidate = (match[1] || match[0]).trim();
      const lowerCandidate = candidate.toLowerCase();
      
      // Filter out generic terms and target app
      if (!GENERIC_TERMS.has(lowerCandidate) && 
          lowerCandidate !== lowerTargetApp &&
          candidate.length > 2 &&
          /^[a-zA-Z\s]+$/.test(candidate)) {
        competitors.add(candidate);
      }
    }
  }
  
  return Array.from(competitors).slice(0, 10); // Limit to top 10
}

// Enhanced ranking position detection
export function extractRankingPosition(responseText: string, targetApp: string): number | null {
  const lines = responseText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (checkAppMention(line, targetApp)) {
      // Look for numbered list patterns
      const numberPatterns = [
        /^(\d+)\./,           // "1. AppName"
        /^(\d+)\)/,           // "1) AppName"
        /^(\d+)\.?\s*-/,      // "1. - AppName" or "1 - AppName"
        /^\*\s*(\d+)/,        // "* 1. AppName"
        /#(\d+)/,             // "#1 AppName"
      ];
      
      for (const pattern of numberPatterns) {
        const match = line.match(pattern);
        if (match) {
          return parseInt(match[1]);
        }
      }
      
      // If no explicit number, try to infer position from context
      const precedingLines = lines.slice(0, i);
      let position = 1;
      
      for (const prevLine of precedingLines) {
        if (/^\d+\./.test(prevLine.trim()) || 
            /\b(?:first|second|third|fourth|fifth)\b/i.test(prevLine)) {
          position++;
        }
      }
      
      return position;
    }
  }
  
  return null;
}

// Utility functions
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalizeAppName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}