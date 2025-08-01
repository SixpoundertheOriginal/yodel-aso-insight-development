import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entityName, organizationId } = await req.json();
    
    console.log('🔍 Starting entity intelligence scraping for:', entityName);

    // Step 1: Scrape basic entity information
    const entityData = await scrapeEntityBasics(entityName);
    
    // Step 2: Enhance with AI analysis
    const intelligence = await enhanceWithAI(entityName, entityData);
    
    // Step 3: Log the scraping activity
    await logActivity(organizationId, entityName);

    return new Response(JSON.stringify({
      success: true,
      intelligence
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Entity Intelligence Scraper Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scrapeEntityBasics(entityName: string) {
  console.log('🌐 Scraping basic information for:', entityName);
  
  // In a real implementation, you would:
  // 1. Search Google for the entity
  // 2. Visit their website
  // 3. Extract structured data
  // 4. Search for news and recent mentions
  
  // For now, we'll simulate this with search queries and return structured data
  const searchQueries = [
    `${entityName} company website`,
    `${entityName} services products`,
    `${entityName} clients customers`,
    `${entityName} competitors alternatives`,
    `${entityName} news 2024`,
    `about ${entityName} company`
  ];

  const scrapedData = {
    entityName,
    searchResults: searchQueries.map(query => ({
      query,
      // Simulated results - in real implementation, this would be actual web scraping
      results: [`Result for ${query}`, `Another result for ${query}`]
    })),
    timestamp: new Date().toISOString()
  };

  return scrapedData;
}

async function enhanceWithAI(entityName: string, scrapedData: any) {
  console.log('🤖 Enhancing entity data with AI analysis');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analyze the following entity and provide structured intelligence:

Entity Name: ${entityName}

Based on your knowledge, provide detailed information about this entity in the following JSON format:

{
  "entityName": "${entityName}",
  "website": "official website URL if known",
  "description": "comprehensive description of the entity and what they do",
  "services": ["service1", "service2", "service3"],
  "targetClients": ["client type 1", "client type 2"],
  "competitors": ["competitor1", "competitor2", "competitor3"],
  "recentNews": ["recent development 1", "recent development 2"],
  "marketPosition": "startup|established|leader|emerging",
  "industryFocus": ["industry1", "industry2"],
  "founded": "year if known",
  "size": "startup|small|medium|large|enterprise",
  "confidenceScore": 0.85
}

Provide accurate, factual information. If you're unsure about specific details, indicate lower confidence scores. Focus on:
1. What services/products they offer
2. Who their typical clients are
3. Main competitors in their space
4. Their position in the market
5. Recent developments or news

Return only valid JSON.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business intelligence analyst. Provide accurate, structured information about companies and entities in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API Error:', data.error);
      throw new Error(`OpenAI API Error: ${data.error.message}`);
    }

    const aiResponse = data.choices[0].message.content;
    console.log('🤖 AI Response received:', aiResponse.substring(0, 200) + '...');
    
    try {
      const intelligence = JSON.parse(aiResponse);
      intelligence.scrapedAt = new Date().toISOString();
      
      return intelligence;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Fallback intelligence if JSON parsing fails
      return {
        entityName,
        description: `Information about ${entityName}`,
        services: [],
        targetClients: [],
        competitors: [],
        recentNews: [],
        marketPosition: "unknown",
        industryFocus: [],
        confidenceScore: 0.2,
        scrapedAt: new Date().toISOString()
      };
    }
    
  } catch (error) {
    console.error('Error in AI enhancement:', error);
    throw error;
  }
}

async function logActivity(organizationId: string, entityName: string) {
  try {
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      action: 'entity_intelligence_scraping',
      resource_type: 'entity_analysis',
      details: {
        entity_name: entityName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}