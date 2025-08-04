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

// Enhanced entity mention detection with alias support
export function checkAppMention(responseText: string, targetApp: string, aliases?: string[]): boolean {
  const lowerResponse = responseText.toLowerCase();
  const entitiesToCheck = [targetApp, ...(aliases || [])];
  
  for (const entity of entitiesToCheck) {
    const lowerEntity = entity.toLowerCase();
    
    // Multiple detection patterns for each entity
    const patterns = [
      // Exact word boundaries
      new RegExp(`\\b${escapeRegex(lowerEntity)}\\b`, 'i'),
      // Formatted text (bold, italic)
      new RegExp(`\\*\\*${escapeRegex(entity)}\\*\\*`, 'gi'),
      new RegExp(`\\*${escapeRegex(entity)}\\*`, 'gi'),
      // Numbered lists
      new RegExp(`\\d+\\.\\s*${escapeRegex(entity)}`, 'gi'),
      // Quoted mentions
      new RegExp(`"${escapeRegex(entity)}"`, 'gi'),
      new RegExp(`'${escapeRegex(entity)}'`, 'gi'),
      // Semantic patterns
      new RegExp(`\\b(?:the|this|that)\\s+${escapeRegex(lowerEntity.split(' ')[0])}(?:\\s+(?:company|agency|platform|app|service|solution))?\\b`, 'i'),
    ];
    
    if (patterns.some(pattern => pattern.test(responseText))) {
      return true;
    }
  }
  
  return false;
}

// Extract competitor app names with smart filtering and alias support
export function extractCompetitors(responseText: string, targetApp: string, aliases?: string[]): string[] {
  const competitors = new Set<string>();
  const lowerTargetApp = targetApp.toLowerCase();
  const allTargetEntities = [targetApp, ...(aliases || [])].map(e => e.toLowerCase());
  
  // First, check for known language learning apps
  for (const app of KNOWN_LANGUAGE_APPS) {
    if (!allTargetEntities.includes(app.toLowerCase()) && checkAppMention(responseText, app)) {
      competitors.add(capitalizeAppName(app));
    }
  }
  
  // Extract potential app names from patterns
  const appPatterns = [
    // Capitalized words that might be app names
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    // Words followed by "app" or similar
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:app|application|platform|agency|company|service)\b/gi,
    // Quoted app names
    /"([^"]+)"/g,
    /'([^']+)'/g,
    // Bold/italic mentions
    /\*\*([^*]+)\*\*/g,
    /\*([^*]+)\*/g,
  ];
  
  for (const pattern of appPatterns) {
    const matches = responseText.matchAll(pattern);
    for (const match of matches) {
      const candidate = (match[1] || match[0]).trim();
      const lowerCandidate = candidate.toLowerCase();
      
      // Filter out generic terms, target app, and aliases
      if (!GENERIC_TERMS.has(lowerCandidate) && 
          !allTargetEntities.includes(lowerCandidate) &&
          candidate.length > 2 &&
          candidate.length < 50 && // Reasonable length limit
          /^[a-zA-Z0-9\s&.-]+$/.test(candidate)) { // Allow common business characters
        competitors.add(candidate);
      }
    }
  }
  
  return Array.from(competitors).slice(0, 15); // Increased limit for better analysis
}

// Enhanced ranking position detection with alias support
export function extractRankingPosition(responseText: string, targetApp: string, aliases?: string[]): number | null {
  const lines = responseText.split('\n');
  const entitiesToCheck = [targetApp, ...(aliases || [])];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if any entity (main or alias) appears in this line
    const foundEntity = entitiesToCheck.find(entity => checkAppMention(line, entity));
    if (foundEntity) {
      // Look for numbered list patterns
      const numberPatterns = [
        /^(\d+)\./,                    // "1. AppName"
        /^(\d+)\)/,                    // "1) AppName"
        /^(\d+)\.?\s*-/,               // "1. - AppName" or "1 - AppName"
        /^\*\s*(\d+)/,                 // "* 1. AppName"
        /#(\d+)/,                      // "#1 AppName"
        /\b(\d+)(?:st|nd|rd|th)\b/,    // "1st choice", "2nd option"
      ];
      
      for (const pattern of numberPatterns) {
        const match = line.match(pattern);
        if (match) {
          const position = parseInt(match[1]);
          return position <= 20 ? position : null; // Reasonable position limit
        }
      }
      
      // Enhanced position inference from context
      const precedingLines = lines.slice(Math.max(0, i - 5), i); // Look at previous 5 lines
      let position = 1;
      
      for (const prevLine of precedingLines) {
        const prevTrimmed = prevLine.trim();
        if (/^\d+\./.test(prevTrimmed) || 
            /\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i.test(prevTrimmed) ||
            /\b(?:1st|2nd|3rd|[4-9]th|10th)\b/i.test(prevTrimmed)) {
          position++;
        }
      }
      
      return position <= 20 ? position : null; // Return only reasonable positions
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

// Enhanced entity analysis with confidence scoring
export function analyzeEntityMention(responseText: string, targetApp: string, aliases?: string[]): {
  mentioned: boolean;
  mentionCount: number;
  mentionContexts: string[];
  position?: number;
  confidence: number;
  matchedAlias?: string;
} {
  const entitiesToCheck = [targetApp, ...(aliases || [])];
  let mentioned = false;
  let mentionCount = 0;
  const mentionContexts: string[] = [];
  let position: number | undefined;
  let matchedAlias: string | undefined;
  let confidence = 0;
  
  for (const entity of entitiesToCheck) {
    if (checkAppMention(responseText, entity)) {
      mentioned = true;
      matchedAlias = entity;
      
      // Count mentions
      const entityMentions = (responseText.toLowerCase().match(new RegExp(`\\b${escapeRegex(entity.toLowerCase())}\\b`, 'g')) || []).length;
      mentionCount += entityMentions;
      
      // Extract context sentences
      const sentences = responseText.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (checkAppMention(sentence, entity)) {
          mentionContexts.push(sentence.trim());
        }
      }
      
      // Get position if not already found
      if (!position) {
        position = extractRankingPosition(responseText, entity) || undefined;
      }
    }
  }
  
  // Calculate confidence score based on multiple factors
  if (mentioned) {
    confidence = 0.5; // Base confidence for any mention
    
    // Boost for exact name match vs alias
    if (matchedAlias === targetApp) confidence += 0.2;
    
    // Boost for multiple mentions
    if (mentionCount > 1) confidence += Math.min(0.2, mentionCount * 0.05);
    
    // Boost for explicit position
    if (position) confidence += 0.2;
    
    // Boost for rich context
    if (mentionContexts.length > 1) confidence += 0.1;
    
    confidence = Math.min(1.0, confidence);
  }
  
  return {
    mentioned,
    mentionCount,
    mentionContexts: [...new Set(mentionContexts)], // Remove duplicates
    position,
    confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
    matchedAlias
  };
}