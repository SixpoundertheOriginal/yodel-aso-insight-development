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
  
  try {
    // Try to find and scrape the entity's website
    const websiteData = await scrapeEntityWebsite(entityName);
    
    // Get search results for the entity
    const searchData = await getEntitySearchData(entityName);
    
    return {
      entityName,
      websiteData,
      searchData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error scraping entity basics:', error);
    
    // Fallback to basic search queries
    const searchQueries = [
      `${entityName} company website`,
      `${entityName} services products`,
      `${entityName} clients customers`,
      `${entityName} competitors alternatives`,
      `${entityName} news 2024`,
      `about ${entityName} company`
    ];

    return {
      entityName,
      searchResults: searchQueries.map(query => ({
        query,
        results: [`Result for ${query}`, `Another result for ${query}`]
      })),
      timestamp: new Date().toISOString()
    };
  }
}

async function scrapeEntityWebsite(entityName: string) {
  console.log('🌐 Attempting to scrape website for:', entityName);
  
  // Try common website patterns
  const potentialUrls = [
    `https://www.${entityName.toLowerCase().replace(/\s+/g, '')}.com`,
    `https://${entityName.toLowerCase().replace(/\s+/g, '')}.com`,
    `https://www.${entityName.toLowerCase().replace(/\s+/g, '-')}.com`,
  ];
  
  for (const url of potentialUrls) {
    try {
      console.log(`Trying to scrape: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EntityBot/1.0)',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const html = await response.text();
        return await extractMetadataFromHtml(html, url);
      }
    } catch (error) {
      console.log(`Failed to scrape ${url}:`, error.message);
      continue;
    }
  }
  
  return null;
}

async function extractMetadataFromHtml(html: string, url: string) {
  console.log('📄 Extracting metadata from HTML');
  
  const metadata: any = {
    url,
    title: '',
    description: '',
    services: [],
    aboutText: '',
    contactInfo: {},
    structured_data: {}
  };
  
  try {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }
    
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) {
      metadata.description = descMatch[1];
    }
    
    // Extract Open Graph data
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    
    if (ogTitleMatch) metadata.og_title = ogTitleMatch[1];
    if (ogDescMatch) metadata.og_description = ogDescMatch[1];
    
    // Extract JSON-LD structured data
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);
    if (jsonLdMatches) {
      jsonLdMatches.forEach((match, index) => {
        try {
          const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
          const parsed = JSON.parse(jsonContent);
          metadata.structured_data[`jsonld_${index}`] = parsed;
        } catch (e) {
          console.log('Failed to parse JSON-LD:', e);
        }
      });
    }
    
    // Extract potential service keywords
    const serviceKeywords = [
      'services', 'solutions', 'products', 'offerings', 'consulting',
      'development', 'design', 'marketing', 'strategy', 'support'
    ];
    
    serviceKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}[^<]*`, 'gi');
      const matches = html.match(regex);
      if (matches) {
        metadata.services.push(...matches.slice(0, 3));
      }
    });
    
  } catch (error) {
    console.error('Error extracting metadata:', error);
  }
  
  return metadata;
}

async function getEntitySearchData(entityName: string) {
  console.log('🔍 Getting search data for:', entityName);
  
  // Simulate search data - in real implementation, you would use a search API
  return {
    searchQueries: [
      `${entityName} company overview`,
      `${entityName} services and solutions`,
      `${entityName} client testimonials`,
      `${entityName} competitors and alternatives`,
      `${entityName} recent news and updates`,
      `${entityName} company culture and values`
    ],
    searchVolume: Math.floor(Math.random() * 1000) + 100,
    relatedTerms: [
      `${entityName} reviews`,
      `${entityName} pricing`,
      `${entityName} contact`,
      `${entityName} careers`
    ]
  };
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