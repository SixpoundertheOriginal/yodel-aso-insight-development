import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface AnalysisRequest {
  responseText: string;
  appName: string;
  queryResultId: string;
  organizationId: string;
}

interface EnhancedResponseAnalysis {
  app_mentioned: boolean;
  mention_count: number;
  ranking_position: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  competitors_mentioned: string[];
  recommendation_strength: number;
  specific_contexts: string[];
  mention_excerpts: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responseText, appName, queryResultId, organizationId }: AnalysisRequest = await req.json();

    console.log(`[Enhanced Analysis] Analyzing response for app: ${appName}`);

    // Check cache first
    const cacheKey = `analysis:${btoa(responseText).slice(0, 50)}:${appName}`;
    const { data: cached } = await supabase
      .from('data_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();

    let analysis: EnhancedResponseAnalysis;

    if (cached) {
      console.log('[Enhanced Analysis] Using cached analysis');
      analysis = cached.data as EnhancedResponseAnalysis;
    } else {
      // Perform AI analysis
      analysis = await analyzeResponseWithAI(responseText, appName);
      
      // Cache for 24 hours
      await supabase
        .from('data_cache')
        .insert({
          cache_key: cacheKey,
          data: analysis,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
    }

    // Update the query result with enhanced analysis
    const { error: updateError } = await supabase
      .from('chatgpt_query_results')
      .update({
        app_mentioned: analysis.app_mentioned,
        mention_position: analysis.ranking_position,
        mention_context: analysis.app_mentioned ? 
          (analysis.recommendation_strength > 7 ? 'recommended' : 
           analysis.recommendation_strength > 4 ? 'compared' : 'mentioned') : 'not_mentioned',
        competitors_mentioned: analysis.competitors_mentioned,
        sentiment_score: analysis.sentiment === 'positive' ? 0.8 : 
                        analysis.sentiment === 'negative' ? -0.5 : 0,
        visibility_score: calculateVisibilityScore(analysis),
        processing_metadata: {
          enhanced_analysis: true,
          recommendation_strength: analysis.recommendation_strength,
          mention_excerpts: analysis.mention_excerpts,
          specific_contexts: analysis.specific_contexts
        }
      })
      .eq('id', queryResultId);

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    console.log(`[Enhanced Analysis] Successfully updated query result ${queryResultId}`);

    return new Response(JSON.stringify({
      success: true,
      analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Enhanced Analysis] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeResponseWithAI(
  responseText: string, 
  appName: string
): Promise<EnhancedResponseAnalysis> {
const prompt = `You are an expert at analyzing text for brand mentions and competitive positioning. Analyze this ChatGPT response for precise app mentions and rankings.

TARGET APP: "${appName}"
RESPONSE TEXT:
${responseText}

Perform a detailed analysis and extract:

1. APP_MENTIONED: Is "${appName}" mentioned ANYWHERE in the response? 
   - Check for exact matches: "${appName}", **${appName}**, *${appName}*
   - Check for variations in spacing, capitalization, or punctuation
   - Look in numbered lists, bullet points, and formatted text
   
2. MENTION_COUNT: Count ALL occurrences of "${appName}" in any format

3. RANKING_POSITION: What position is "${appName}" in?
   - Look for numbered lists (1., 2., 3.) or (1), (2), (3)
   - Check for ordinal positions (first, second, third)
   - If no explicit numbering, estimate based on order of appearance
   
4. SENTIMENT: How is "${appName}" portrayed?
   - positive: recommended, praised, described favorably
   - negative: criticized, warned against, described unfavorably  
   - neutral: mentioned factually without strong opinion
   
5. COMPETITORS: List ONLY actual app/service names mentioned (not generic words)
   - Include: Duolingo, Babbel, Rosetta Stone, etc.
   - Exclude: "app", "application", "software", "tool", "platform", "this", "that", etc.
   - Focus on proper nouns that are clearly app/service names
   
6. RECOMMENDATION_STRENGTH: Rate 0-10 how strongly "${appName}" is recommended
   - 10: Top recommendation, first choice, highly endorsed
   - 7-9: Strongly recommended, among top choices
   - 4-6: Mentioned positively but not emphasized
   - 1-3: Mentioned but not particularly recommended
   - 0: Not mentioned or mentioned negatively
   
7. SPECIFIC_CONTEXTS: What use cases or scenarios is "${appName}" recommended for?

8. MENTION_EXCERPTS: Extract the EXACT sentences/phrases where "${appName}" appears

CRITICAL INSTRUCTIONS:
- Be extremely precise about detecting "${appName}" - false negatives are worse than false positives
- Only list actual app/brand names as competitors, never generic terms
- If apps are in a numbered list, capture the exact position number
- Look for formatting like **bold** or *italic* that might indicate recommendations

Return only valid JSON:
{
  "app_mentioned": boolean,
  "mention_count": number,
  "ranking_position": number | null,
  "sentiment": "positive" | "neutral" | "negative",
  "competitors_mentioned": ["ActualAppName1", "ActualAppName2"],
  "recommendation_strength": number,
  "specific_contexts": ["context1", "context2"],
  "mention_excerpts": ["exact sentence 1", "exact sentence 2"]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 1200
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content) as EnhancedResponseAnalysis;
  } catch (parseError) {
    console.error('Failed to parse AI response:', content);
    // Fallback to enhanced regex analysis
    return fallbackAnalysis(responseText, appName);
  }
}

function fallbackAnalysis(responseText: string, appName: string): EnhancedResponseAnalysis {
  const lowerResponse = responseText.toLowerCase();
  const lowerAppName = appName.toLowerCase();
  
  // Enhanced regex patterns to catch formatted mentions
  const patterns = [
    new RegExp(`\\*\\*${escapeRegex(appName)}\\*\\*`, 'gi'), // **AppName**
    new RegExp(`\\*${escapeRegex(appName)}\\*`, 'gi'),       // *AppName*
    new RegExp(`\\b${escapeRegex(appName)}\\b`, 'gi'),       // Plain AppName with word boundaries
    new RegExp(`"${escapeRegex(appName)}"`, 'gi'),           // "AppName"
    new RegExp(`'${escapeRegex(appName)}'`, 'gi'),           // 'AppName'
  ];
  
  let app_mentioned = false;
  let mention_count = 0;
  let mention_excerpts: string[] = [];
  
  // Check for mentions and extract excerpts
  const sentences = responseText.split(/[.!?]+/);
  for (const sentence of sentences) {
    for (const pattern of patterns) {
      const matches = sentence.match(pattern);
      if (matches) {
        app_mentioned = true;
        mention_count += matches.length;
        if (sentence.trim() && !mention_excerpts.includes(sentence.trim())) {
          mention_excerpts.push(sentence.trim());
        }
      }
    }
  }
  
  // Enhanced ranking position detection
  let ranking_position: number | null = null;
  const lines = responseText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (new RegExp(`\\b${escapeRegex(appName)}\\b`, 'gi').test(line)) {
      // Look for various numbering patterns
      const numberPatterns = [
        /^\s*(\d+)\./,           // "1. AppName"
        /^\s*(\d+)\)/,           // "1) AppName"
        /^\s*(\d+)\.?\s*-/,      // "1. - AppName" or "1 - AppName"
        /^\s*\*\s*(\d+)/,        // "* 1. AppName"
        /#(\d+)/,                // "#1 AppName"
      ];
      
      for (const numPattern of numberPatterns) {
        const match = line.match(numPattern);
        if (match) {
          ranking_position = parseInt(match[1]);
          break;
        }
      }
      if (ranking_position) break;
    }
  }
  
  // Enhanced competitor detection - only actual app names
  const competitors_mentioned: string[] = [];
  const knownLanguageApps = [
    'duolingo', 'babbel', 'rosetta stone', 'rosetta', 'busuu', 'lingoda', 
    'hellotalk', 'memrise', 'mondly', 'anki', 'italki', 'speaky', 'tandem',
    'cambly', 'preply', 'verbling', 'fluentu', 'clozemaster', 'drops',
    'beelinguapp', 'nemo', 'mango languages', 'rocket languages', 'lingq'
  ];
  
  // Generic terms to exclude
  const genericTerms = new Set([
    'app', 'application', 'apps', 'software', 'program', 'tool', 'platform',
    'service', 'system', 'website', 'solution', 'product', 'this', 'that',
    'popular', 'best', 'top', 'good', 'great', 'other', 'another'
  ]);
  
  for (const app of knownLanguageApps) {
    if (app !== lowerAppName && lowerResponse.includes(app.toLowerCase())) {
      const properName = app.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      competitors_mentioned.push(properName);
    }
  }
  
  // Also look for capitalized words that might be app names
  const capitalizedWords = responseText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [];
  for (const word of capitalizedWords) {
    const lowerWord = word.toLowerCase();
    if (!genericTerms.has(lowerWord) && 
        lowerWord !== lowerAppName &&
        word.length > 2 &&
        !competitors_mentioned.includes(word)) {
      competitors_mentioned.push(word);
    }
  }
  
  return {
    app_mentioned,
    mention_count,
    ranking_position,
    sentiment: app_mentioned ? 'positive' : 'neutral',
    competitors_mentioned: competitors_mentioned.slice(0, 10), // Limit to 10
    recommendation_strength: app_mentioned ? (ranking_position ? Math.max(1, 11 - ranking_position) : 5) : 0,
    specific_contexts: [],
    mention_excerpts
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateVisibilityScore(analysis: EnhancedResponseAnalysis): number {
  if (!analysis.app_mentioned) return 0;
  
  let score = 40; // Base score for being mentioned
  
  // Position bonus (higher for better positions)
  if (analysis.ranking_position) {
    if (analysis.ranking_position === 1) score += 40;
    else if (analysis.ranking_position <= 3) score += 30;
    else if (analysis.ranking_position <= 5) score += 20;
    else if (analysis.ranking_position <= 10) score += 10;
  }
  
  // Recommendation strength bonus
  score += Math.min(20, analysis.recommendation_strength * 2);
  
  // Sentiment bonus
  if (analysis.sentiment === 'positive') score += 10;
  else if (analysis.sentiment === 'negative') score -= 20;
  
  return Math.max(0, Math.min(100, score));
}