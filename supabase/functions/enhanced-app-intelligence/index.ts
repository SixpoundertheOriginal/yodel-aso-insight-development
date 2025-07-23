import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppData {
  app_name: string;
  description: string;
  category: string;
  developer: string;
  bundle_id: string;
}

interface EnhancedAppIntelligence {
  specific_category: string;
  target_personas: Array<{
    name: string;
    demographics: string;
    goals: string[];
    typical_queries: string[];
  }>;
  authentic_use_cases: string[];
  pain_points_solved: string[];
  competitor_context: Array<{
    name: string;
    positioning: string;
    weakness?: string;
  }>;
  user_language: string[];
  confidence_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appData } = await req.json();
    
    if (!appData) {
      throw new Error('App data is required');
    }

    console.log('Enhancing app intelligence for:', appData.app_name);

    // Check cache first
    const cacheKey = generateCacheKey(appData);
    const cached = await getCachedAnalysis(cacheKey);
    
    if (cached && !isStale(cached)) {
      console.log('Returning cached analysis');
      return new Response(JSON.stringify({ 
        success: true, 
        data: cached.data,
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Perform AI analysis
    const enhancedIntelligence = await analyzeAppWithAI(appData);
    
    // Cache the result
    await cacheAnalysis(cacheKey, enhancedIntelligence);

    return new Response(JSON.stringify({ 
      success: true, 
      data: enhancedIntelligence,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced app intelligence error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback: true 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeAppWithAI(appData: AppData): Promise<EnhancedAppIntelligence> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
Analyze this mobile app for ChatGPT visibility optimization. You are an ASO expert who understands real user behavior.

App: ${appData.app_name}
Category: ${appData.category}  
Developer: ${appData.developer}
Description: ${appData.description.substring(0, 1000)}

Extract data for natural query generation:

1. SPECIFIC_CATEGORY: Precise niche, not broad category
   - NOT "Education" → "Language Learning"
   - NOT "Finance" → "Cryptocurrency Trading"

2. TARGET_PERSONAS: Real user types with specific goals and typical search queries
   - NOT "general_users" → "business_travelers", "adult_learners"
   - Include demographics, goals, and how they actually search

3. AUTHENTIC_USE_CASES: How users actually use this app
   - NOT "general_use" → "learning Spanish for business trip"
   - Real scenarios and contexts

4. PAIN_POINTS_SOLVED: Problems this app uniquely addresses
   - What user problems does this solve vs competitors?

5. COMPETITOR_CONTEXT: Main competitors with positioning
   - Direct competitors with strengths/weaknesses
   - How this app is different/better

6. USER_LANGUAGE: How real users describe this app
   - Natural language patterns
   - Key phrases users would search for

Return ONLY valid JSON:
{
  "specific_category": "string",
  "target_personas": [
    {
      "name": "string", 
      "demographics": "string", 
      "goals": ["string"],
      "typical_queries": ["string"]
    }
  ],
  "authentic_use_cases": ["string"],
  "pain_points_solved": ["string"],
  "competitor_context": [
    {
      "name": "string", 
      "positioning": "string",
      "weakness": "string (optional)"
    }
  ],
  "user_language": ["string"],
  "confidence_score": 0.95
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an ASO expert who analyzes apps for ChatGPT visibility optimization. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(content);
    return validateAndEnhanceResponse(parsed);
  } catch (e) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Invalid AI response format');
  }
}

function validateAndEnhanceResponse(response: any): EnhancedAppIntelligence {
  // Validate required fields
  if (!response.specific_category || !Array.isArray(response.target_personas)) {
    throw new Error('Invalid AI response structure');
  }

  // Ensure confidence score
  if (!response.confidence_score) {
    response.confidence_score = 0.8;
  }

  // Ensure all personas have typical_queries
  response.target_personas = response.target_personas.map((persona: any) => ({
    ...persona,
    typical_queries: persona.typical_queries || []
  }));

  return response as EnhancedAppIntelligence;
}

function generateCacheKey(appData: AppData): string {
  const hash = btoa(`${appData.app_name}-${appData.description.substring(0, 100)}`);
  return `app_intelligence_${hash}`;
}

async function getCachedAnalysis(cacheKey: string) {
  try {
    const { data } = await supabase
      .from('data_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .single();
    
    return data;
  } catch {
    return null;
  }
}

async function cacheAnalysis(cacheKey: string, analysis: EnhancedAppIntelligence) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour cache

  await supabase
    .from('data_cache')
    .upsert({
      cache_key: cacheKey,
      data: analysis,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    });
}

function isStale(cached: any): boolean {
  return new Date(cached.expires_at) < new Date();
}