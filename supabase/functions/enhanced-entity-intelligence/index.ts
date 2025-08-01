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

interface EntityData {
  entityName: string;
  websiteData?: any;
  searchData?: any;
  context?: string;
}

interface EnhancedEntityIntelligence {
  entityName: string;
  website?: string;
  description: string;
  specific_category: string;
  target_personas: Array<{
    name: string;
    demographics: string;
    goals: string[];
    typical_queries: string[];
  }>;
  services: string[];
  targetClients: string[];
  authentic_use_cases: string[];
  pain_points_solved: string[];
  competitors: Array<{
    name: string;
    positioning: string;
    weakness?: string;
  }>;
  marketPosition: string;
  industryFocus: string[];
  recentNews: string[];
  user_language: string[];
  confidence_score: number;
  scrapedAt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entityData } = await req.json();
    
    if (!entityData) {
      throw new Error('Entity data is required');
    }

    console.log('Enhancing entity intelligence for:', entityData.entityName);

    // Check cache first
    const cacheKey = generateCacheKey(entityData);
    const cached = await getCachedAnalysis(cacheKey);
    
    if (cached && !isStale(cached)) {
      console.log('Returning cached entity analysis');
      return new Response(JSON.stringify({ 
        success: true, 
        data: cached.data,
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Perform AI analysis
    const enhancedIntelligence = await analyzeEntityWithAI(entityData);
    
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
    console.error('Enhanced entity intelligence error:', error);
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

async function analyzeEntityWithAI(entityData: EntityData): Promise<EnhancedEntityIntelligence> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
Analyze this entity for ChatGPT visibility optimization. You are a business intelligence expert who understands real user behavior and business contexts.

Entity: ${entityData.entityName}
Website Data: ${JSON.stringify(entityData.websiteData || {}, null, 2)}
Search Context: ${entityData.context || 'General business analysis'}

Extract structured data for natural query generation:

1. SPECIFIC_CATEGORY: Precise business category, not broad
   - NOT "Consulting" → "Digital Marketing Consulting"
   - NOT "Technology" → "AI-Powered Analytics"

2. TARGET_PERSONAS: Real client types with specific goals and search queries
   - NOT "businesses" → "B2B SaaS startups", "enterprise_retailers"
   - Include demographics, goals, and how they actually search for services

3. SERVICES: Core service offerings and capabilities
   - What specific services/products does this entity provide?
   - How do they differentiate from competitors?

4. AUTHENTIC_USE_CASES: How clients actually use their services
   - NOT "general_consulting" → "launching new product in European market"
   - Real client scenarios and contexts

5. PAIN_POINTS_SOLVED: Problems this entity uniquely addresses
   - What client problems does this entity solve vs competitors?
   - Specific business challenges they tackle

6. COMPETITOR_CONTEXT: Main competitors with positioning
   - Direct competitors with strengths/weaknesses
   - How this entity is different/better

7. USER_LANGUAGE: How real clients describe this entity
   - Natural language patterns clients use
   - Key phrases clients would search for

8. TARGET_CLIENTS: Specific client segments they serve
   - Industry verticals, company sizes, geographic regions
   - Client characteristics and requirements

Return ONLY valid JSON:
{
  "entityName": "string",
  "website": "string (if known)",
  "description": "comprehensive description",
  "specific_category": "string",
  "target_personas": [
    {
      "name": "string", 
      "demographics": "string", 
      "goals": ["string"],
      "typical_queries": ["string"]
    }
  ],
  "services": ["string"],
  "targetClients": ["string"],
  "authentic_use_cases": ["string"],
  "pain_points_solved": ["string"],
  "competitors": [
    {
      "name": "string", 
      "positioning": "string",
      "weakness": "string (optional)"
    }
  ],
  "marketPosition": "startup|established|leader|emerging",
  "industryFocus": ["string"],
  "recentNews": ["string"],
  "user_language": ["string"],
  "confidence_score": 0.95,
  "scrapedAt": "${new Date().toISOString()}"
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
        { role: 'system', content: 'You are a business intelligence expert who analyzes entities for ChatGPT visibility optimization. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    // Handle markdown-wrapped JSON
    let cleanContent = content;
    if (content.includes('```json')) {
      cleanContent = content.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (content.includes('```')) {
      cleanContent = content.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleanContent.trim());
    return validateAndEnhanceEntityResponse(parsed);
  } catch (e) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Invalid AI response format');
  }
}

function validateAndEnhanceEntityResponse(response: any): EnhancedEntityIntelligence {
  // Validate required fields
  if (!response.entityName || !response.description) {
    throw new Error('Invalid AI response structure');
  }

  // Ensure confidence score
  if (!response.confidence_score) {
    response.confidence_score = 0.8;
  }

  // Ensure all personas have typical_queries
  if (Array.isArray(response.target_personas)) {
    response.target_personas = response.target_personas.map((persona: any) => ({
      ...persona,
      typical_queries: persona.typical_queries || []
    }));
  } else {
    response.target_personas = [];
  }

  // Ensure arrays exist
  response.services = response.services || [];
  response.targetClients = response.targetClients || [];
  response.authentic_use_cases = response.authentic_use_cases || [];
  response.pain_points_solved = response.pain_points_solved || [];
  response.competitors = response.competitors || [];
  response.industryFocus = response.industryFocus || [];
  response.recentNews = response.recentNews || [];
  response.user_language = response.user_language || [];

  return response as EnhancedEntityIntelligence;
}

function generateCacheKey(entityData: EntityData): string {
  const hash = btoa(`${entityData.entityName}-${JSON.stringify(entityData.websiteData || {})}`);
  return `enhanced_entity_intelligence_${hash}`;
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

async function cacheAnalysis(cacheKey: string, analysis: EnhancedEntityIntelligence) {
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