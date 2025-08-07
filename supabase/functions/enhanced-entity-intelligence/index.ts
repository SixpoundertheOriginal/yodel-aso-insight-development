import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { scrapeEntity } from './lib/scrapeEntity.ts';
import { parseOpenAIResponse } from '../_shared/parseOpenAIResponse.ts';

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
  websiteData?: Record<string, unknown>;
  searchData?: Record<string, unknown>;
  context?: string;
  // Enhanced context for competitive research
  auditContext?: {
    industry: string;
    topic: string;
    target_audience: string;
    known_competitors: string[];
    geographic_focus?: string;
    queryStrategy?: 'competitive_discovery' | 'market_research' | 'mixed';
  };
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

  let entityData: EntityData | undefined;
  try {
    const body = await req.json();
    entityData = body.entityData;

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

    // Scrape entity if websiteData not provided
    let enrichedEntityData = entityData;
    if (!entityData.websiteData) {
      console.log('🔍 No websiteData provided, scraping entity...');
      try {
        const scrapedData = await scrapeEntity(entityData.entityName);
        enrichedEntityData = {
          ...entityData,
          websiteData: scrapedData.websiteData || {},
          searchData: scrapedData.searchSnippets || {}
        };
        console.log('✅ Entity scraping completed');
      } catch (scrapeError) {
        console.log('❌ Entity scraping failed, proceeding with empty websiteData:', scrapeError.message);
        enrichedEntityData = {
          ...entityData,
          websiteData: {},
          searchData: {}
        };
      }
    } else {
      console.log('✅ Using provided websiteData, skipping scrape');
    }

    // Perform AI analysis
    const enhancedIntelligence = await analyzeEntityWithAI(enrichedEntityData);
    
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
    const fallbackData = buildPlaceholder(entityData?.entityName || 'Unknown');
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      data: fallbackData,
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
  if (!entityData?.entityName || typeof entityData.entityName !== 'string' ||
      !entityData.websiteData || typeof entityData.websiteData !== 'object') {
    throw new Error('Invalid entity data');
  }

  const sanitizedWebsiteData = sanitizeData(entityData.websiteData);

  // Build context-driven prompt based on audit data
  const buildContextualPrompt = () => {
    const auditContext = entityData.auditContext;

    // Base research prompt
    let prompt = `
You are a business intelligence researcher analyzing "${entityData.entityName}" for competitive analysis. Use real-world business context to make this analysis highly accurate.

Entity to Research: ${entityData.entityName}
Basic Data: ${JSON.stringify(sanitizedWebsiteData, null, 2)}
`;

    // Add competitive context if available
    if (auditContext) {
      prompt += `
COMPETITIVE RESEARCH CONTEXT:
- Industry: ${auditContext.industry}
- Topic Focus: ${auditContext.topic}
- Target Audience: ${auditContext.target_audience}
- Known Market Players: ${auditContext.known_competitors.join(', ')}
- Geographic Focus: ${auditContext.geographic_focus || 'Global'}
- Analysis Strategy: ${auditContext.queryStrategy || 'mixed'}

RESEARCH APPROACH: Act as a real-time researcher. Based on the industry context "${auditContext.industry}" and the fact that competitors include "${auditContext.known_competitors.join(', ')}", what specific services would "${entityData.entityName}" most likely offer in the "${auditContext.topic}" space?

Consider these market dynamics:
- How does "${entityData.entityName}" compete with ${auditContext.known_competitors.slice(0, 3).join(', ')}?
- What would clients in "${auditContext.target_audience}" specifically search for when looking for "${auditContext.topic}" solutions?
- What market gaps exist between known players: ${auditContext.known_competitors.join(', ')}?
`;
    } else {
      prompt += `
GENERAL RESEARCH APPROACH: Research "${entityData.entityName}" as a business intelligence expert. Make educated inferences about their services, target clients, and competitive positioning based on their name, industry context, and typical business patterns.
`;
    }

    prompt += `

ANALYSIS REQUIREMENTS - Be Specific and Research-Driven:

1. PRECISE_BUSINESS_CATEGORY: 
   - Research what "${entityData.entityName}" actually does in their specific market
   - NOT generic like "Consulting" → Specific like "Mobile App Store Optimization for Enterprise"
   - Consider industry context: ${auditContext?.industry || 'business services'}

2. REAL_SERVICES_OFFERED:
   - What specific services would "${entityData.entityName}" provide based on their market position?
   - How do they differentiate from competitors: ${auditContext?.known_competitors.slice(0, 3).join(', ') || 'market leaders'}?
   - Focus on services that clients in "${auditContext?.target_audience || 'business professionals'}" would actually pay for

3. AUTHENTIC_TARGET_PERSONAS:
   - Who ACTUALLY hires companies like "${entityData.entityName}"?
   - What are their real job titles, company sizes, pain points?
   - How do they search for solutions like "${auditContext?.topic || 'business services'}"?
   - Include their typical search queries and purchase intent

4. COMPETITIVE_POSITIONING:
   - How does "${entityData.entityName}" compare to: ${auditContext?.known_competitors.join(', ') || 'industry leaders'}?
   - What's their unique value proposition vs competitors?
   - Where do they fit in the market hierarchy?

5. CLIENT_LANGUAGE_PATTERNS:
   - How do real clients describe companies like "${entityData.entityName}"?
   - What phrases would trigger recommendations for this type of service?
   - Industry-specific terminology clients use when searching

6. REALISTIC_USE_CASES:
   - Specific client scenarios where "${entityData.entityName}" gets hired
   - Real business problems they solve vs generic consulting
   - Context: "${auditContext?.target_audience || 'businesses'}" looking for "${auditContext?.topic || 'business solutions'}"

Return ONLY valid JSON:
{
  "entityName": "${entityData.entityName}",
  "website": "string (if research indicates website)",
  "description": "research-based comprehensive description",
  "specific_category": "precise category based on research",
  "target_personas": [
    {
      "name": "specific job title/role", 
      "demographics": "company size, industry, location specifics", 
      "goals": ["specific business goals they're trying to achieve"],
      "typical_queries": ["actual search phrases they would use"]
    }
  ],
  "services": ["specific service offerings based on competitive research"],
  "targetClients": ["specific client segments with company characteristics"],
  "authentic_use_cases": ["real scenarios where clients hire this type of company"],
  "pain_points_solved": ["specific problems they solve vs generic business challenges"],
  "competitors": [
    {
      "name": "competitor name", 
      "positioning": "how they position vs ${entityData.entityName}",
      "weakness": "where ${entityData.entityName} might be stronger"
    }
  ],
  "marketPosition": "startup|established|leader|emerging",
  "industryFocus": ["specific industries they serve"],
  "recentNews": ["recent developments if research suggests any"],
  "user_language": ["natural phrases clients use to describe this type of service"],
  "confidence_score": 0.85,
  "scrapedAt": "${new Date().toISOString()}"
}
`;
    
    return prompt;
  };

  let prompt = buildContextualPrompt();
  const MAX_PROMPT_LENGTH = 15000;
  if (prompt.length > MAX_PROMPT_LENGTH) {
    console.warn(`Prompt length ${prompt.length} exceeds max ${MAX_PROMPT_LENGTH}, truncating.`);
    prompt = prompt.slice(0, MAX_PROMPT_LENGTH);
  }

  const requestPayload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a business intelligence expert who analyzes entities for ChatGPT visibility optimization. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 2500,
  };
  console.log('OpenAI request payload:', JSON.stringify(requestPayload));

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error('OpenAI API error', { status: response.status, body: raw });
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = JSON.parse(raw);
    const content = data.choices[0].message.content;

    const parsed = parseOpenAIResponse(content);
    if (parsed) {
      return validateAndEnhanceEntityResponse(parsed);
    }

    throw new Error('Invalid AI response format');
  } catch (error) {
    console.error('OpenAI request failed:', error);
    throw error;
  }
}

function validateAndEnhanceEntityResponse(response: Record<string, unknown>): EnhancedEntityIntelligence {
  const r = response as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Validate required fields
  if (!r.entityName || !r.description) {
    throw new Error('Invalid AI response structure');
  }

  // Calculate confidence score based on data completeness
  r.confidence_score = calculateEnhancedConfidenceScore(r);

  // Ensure all personas have typical_queries
  if (Array.isArray(r.target_personas)) {
    r.target_personas = r.target_personas.map((persona: Record<string, unknown>) => ({
      ...(persona as any), // eslint-disable-line @typescript-eslint/no-explicit-any
      typical_queries: (persona as any).typical_queries || [] // eslint-disable-line @typescript-eslint/no-explicit-any
    }));
  } else {
    r.target_personas = [];
  }

  // Ensure arrays exist
  r.services = r.services || [];
  r.targetClients = r.targetClients || [];
  r.authentic_use_cases = r.authentic_use_cases || [];
  r.pain_points_solved = r.pain_points_solved || [];
  r.competitors = r.competitors || [];
  r.industryFocus = r.industryFocus || [];
  r.recentNews = r.recentNews || [];
  r.user_language = r.user_language || [];

  return r as EnhancedEntityIntelligence;
}

function generateCacheKey(entityData: EntityData): string {
  // Include audit context in cache key for more specific caching
  const contextHash = entityData.auditContext ? 
    `${entityData.auditContext.industry}-${entityData.auditContext.topic}` : 
    'general';
  const hash = btoa(`${entityData.entityName}-${contextHash}-${JSON.stringify(entityData.websiteData || {})}`);
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

function calculateEnhancedConfidenceScore(response: Record<string, unknown>): number {
  const r = response as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let score = 0.5; // Base score for enhanced analysis

  // Data completeness factors
  const completenessFactors = [
    r.description?.length > 50,
    r.services?.length > 0,
    r.targetClients?.length > 0,
    r.competitors?.length > 0,
    r.target_personas?.length > 0,
    r.authentic_use_cases?.length > 0,
    r.pain_points_solved?.length > 0,
    r.industryFocus?.length > 0
  ];

  const completenessScore = completenessFactors.filter(Boolean).length / completenessFactors.length;
  score += completenessScore * 0.3;

  // Quality indicators
  if (r.description?.length > 100) score += 0.1;
  if (r.specific_category && r.specific_category !== 'Unknown') score += 0.05;
  if (r.website && r.website.startsWith('http')) score += 0.05;

  // Persona quality
  if (r.target_personas?.some((p: Record<string, unknown>) => (p as any).typical_queries?.length > 0)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    score += 0.1;
  }

  return Math.min(0.95, Math.max(0.4, score));
}

function isStale(cached: { expires_at: string }): boolean {
  return new Date(cached.expires_at) < new Date();
}

function sanitizeData(data: unknown) {
  return JSON.parse(JSON.stringify(data ?? {}, (key, value) =>
    value === null || value === undefined ? undefined : value
  ));
}

function buildPlaceholder(entityName: string): EnhancedEntityIntelligence {
  return {
    entityName: entityName || 'Unknown',
    website: '',
    description: 'Data unavailable',
    specific_category: 'Unknown',
    target_personas: [],
    services: [],
    targetClients: [],
    authentic_use_cases: [],
    pain_points_solved: [],
    competitors: [],
    marketPosition: 'unknown',
    industryFocus: [],
    recentNews: [],
    user_language: [],
    confidence_score: 0,
    scrapedAt: new Date().toISOString(),
  };
}