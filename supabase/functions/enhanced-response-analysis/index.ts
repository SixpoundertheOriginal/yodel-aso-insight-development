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
  const prompt = `Analyze this ChatGPT response for app mentions and rankings:

Target App: ${appName}
ChatGPT Response: ${responseText}

Extract detailed analysis:

1. APP_MENTIONED: Is "${appName}" mentioned anywhere in the response? Look for exact matches, variations, or formatted text like **${appName}**
2. MENTION_COUNT: How many times is "${appName}" mentioned?
3. RANKING_POSITION: If apps are listed numerically (1., 2., 3., etc.), what position is "${appName}" in? If no clear numbering, estimate position based on order mentioned
4. SENTIMENT: How is "${appName}" described overall? positive/neutral/negative
5. COMPETITORS: List ALL other app names mentioned (not generic terms like "app" or "application")
6. RECOMMENDATION_STRENGTH: How strongly is "${appName}" recommended? Scale 0-10 (0=not mentioned, 10=top recommendation)
7. CONTEXTS: What specific use cases or contexts is "${appName}" recommended for?
8. EXCERPTS: Extract the exact sentences where "${appName}" is mentioned

IMPORTANT: 
- Look carefully for "${appName}" in different formats (**${appName}**, *${appName}*, or plain ${appName})
- If apps are in a numbered list, extract the exact position number
- Don't confuse "${appName}" with similar words
- List only specific app names as competitors, not generic terms

Return JSON:
{
  "app_mentioned": boolean,
  "mention_count": number,
  "ranking_position": number | null,
  "sentiment": "positive" | "neutral" | "negative",
  "competitors_mentioned": ["app1", "app2"],
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
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 1000
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
    new RegExp(`\\*\\*${appName}\\*\\*`, 'gi'), // **AppName**
    new RegExp(`\\*${appName}\\*`, 'gi'),       // *AppName*
    new RegExp(`\\b${appName}\\b`, 'gi')        // Plain AppName
  ];
  
  let app_mentioned = false;
  let mention_count = 0;
  let mention_excerpts: string[] = [];
  
  for (const pattern of patterns) {
    const matches = responseText.match(pattern);
    if (matches) {
      app_mentioned = true;
      mention_count += matches.length;
    }
  }
  
  // Extract ranking position from numbered lists
  let ranking_position: number | null = null;
  const lines = responseText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(lowerAppName)) {
      const numberMatch = line.match(/^\s*(\d+)\./);
      if (numberMatch) {
        ranking_position = parseInt(numberMatch[1]);
        break;
      }
    }
  }
  
  // Extract competitors
  const competitors_mentioned: string[] = [];
  const knownApps = ['duolingo', 'babbel', 'rosetta stone', 'busuu', 'lingoda', 'hellotalk', 'memrise', 'mondly', 'anki'];
  
  for (const app of knownApps) {
    if (app !== lowerAppName && lowerResponse.includes(app)) {
      competitors_mentioned.push(app.charAt(0).toUpperCase() + app.slice(1));
    }
  }
  
  return {
    app_mentioned,
    mention_count,
    ranking_position,
    sentiment: app_mentioned ? 'positive' : 'neutral',
    competitors_mentioned,
    recommendation_strength: app_mentioned ? (ranking_position ? 11 - ranking_position : 5) : 0,
    specific_contexts: [],
    mention_excerpts
  };
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