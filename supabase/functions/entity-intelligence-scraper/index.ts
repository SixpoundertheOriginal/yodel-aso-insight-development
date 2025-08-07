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
    
    // Get categorized search snippets for the entity
    const searchSnippets = await fetchSearchSnippetsByIntent(entityName);

    return {
      entityName,
      websiteData,
      searchSnippets,
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
      searchSnippets: {
        services: [],
        clients: [],
        positioning: [],
        competitors: []
      },
      timestamp: new Date().toISOString()
    };
  }
}

async function scrapeEntityWebsite(entityName: string) {
  console.log('🌐 Attempting to scrape website for:', entityName);
  
  // Enhanced URL patterns with more variations
  const entitySlug = entityName.toLowerCase().replace(/\s+/g, '');
  const entityHyphen = entityName.toLowerCase().replace(/\s+/g, '-');
  const potentialUrls = [
    `https://www.${entitySlug}.com`,
    `https://${entitySlug}.com`,
    `https://www.${entityHyphen}.com`,
    `https://${entityHyphen}.com`,
    `https://www.${entitySlug}.io`,
    `https://${entitySlug}.io`,
    `https://www.${entitySlug}.co`,
    `https://${entitySlug}.co`,
  ];
  
  for (const url of potentialUrls) {
    try {
      console.log(`Trying to scrape: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(20000) // Increased to 20 seconds
      });
      
      if (response.ok) {
        const html = await response.text();
        const metadata = await extractMetadataFromHtml(html, url);
        console.log(`✅ Successfully scraped website: ${url}`);
        return metadata;
      }
    } catch (error) {
      console.log(`Failed to scrape ${url}:`, error.message);
      continue;
    }
  }
  
  console.log('❌ No website found for entity');
  return null;
}

async function extractMetadataFromHtml(html: string, url: string) {
  console.log('📄 Extracting metadata from HTML');

  const metadata: any = {
    url,
    title: '',
    description: '',
    h1: '',
    services: []
  };

  try {
    // Remove scripts, JSON-LD and styles
    let cleanedHtml = html
      .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Extract title
    const titleMatch = cleanedHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim().slice(0, 200);
    }

    // Extract meta description
    const descMatch = cleanedHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) {
      metadata.description = descMatch[1].trim().slice(0, 200);
    }

    // Extract first h1
    const h1Match = cleanedHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      metadata.h1 = h1Match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    }

    // Extract bullet list items
    const liMatches = cleanedHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (liMatches) {
      const keywordFiltered = liMatches.filter(li => /(services?|solutions?|offerings?)/i.test(li));
      const items = keywordFiltered.length ? keywordFiltered : liMatches;
      for (const li of items) {
        const text = li.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) {
          metadata.services.push(text.slice(0, 200));
        }
        if (metadata.services.length >= 3) break;
      }
    }

    // Ensure final combined length under 4000 characters
    let combined = [metadata.title, metadata.description, metadata.h1, ...metadata.services].join(' ');
    if (combined.length > 4000) {
      const allowedServices = [] as string[];
      for (const svc of metadata.services) {
        const testCombined = [metadata.title, metadata.description, metadata.h1, ...allowedServices, svc].join(' ');
        if (testCombined.length <= 4000) {
          allowedServices.push(svc);
        } else {
          break;
        }
      }
      metadata.services = allowedServices;
    }

  } catch (error) {
    console.error('Error extracting metadata:', error);
  }

  return metadata;
}

const smartQueries = [
  { label: 'services', query: (name: string) => `${name} services OR solutions` },
  { label: 'clients', query: (name: string) => `${name} clients OR industries` },
  { label: 'positioning', query: (name: string) => `${name} market position` },
  { label: 'competitors', query: (name: string) => `${name} competitors OR alternatives` },
];

async function fetchSearchSnippetsByIntent(entityName: string) {
  console.log('🔍 Getting search data for:', entityName);

  const apiKey = Deno.env.get('GOOGLE_CSE_API_KEY');
  const searchEngineId = Deno.env.get('GOOGLE_CSE_ID');
  const resultsByIntent: Record<string, any[]> = {
    services: [],
    clients: [],
    positioning: [],
    competitors: [],
  };

  for (const { label, query } of smartQueries) {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query(entityName))}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.items) {
      resultsByIntent[label].push(...data.items.slice(0, 2));
    }
  }

  return resultsByIntent;
}

function buildSearchSummary(searchSnippets: Record<string, any[]>): string {
  return `
## Services & Solutions:
${(searchSnippets.services || []).map(s => `- ${s.title}: ${s.snippet}`).join('\n')}

## Target Clients:
${(searchSnippets.clients || []).map(s => `- ${s.title}: ${s.snippet}`).join('\n')}

## Market Positioning:
${(searchSnippets.positioning || []).map(s => `- ${s.title}: ${s.snippet}`).join('\n')}

## Competitors:
${(searchSnippets.competitors || []).map(s => `- ${s.title}: ${s.snippet}`).join('\n')}
  `.trim();
}

async function enhanceWithAI(entityName: string, scrapedData: any) {
  console.log('🤖 Enhancing entity data with AI analysis');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const searchSummary = buildSearchSummary(scrapedData.searchSnippets || {
    services: [],
    clients: [],
    positioning: [],
    competitors: []
  });

  const prompt = `
You're analyzing the company "${entityName}" using the following search results:

${searchSummary}

Based only on the above information, return structured intelligence in this JSON format:
{
  "entityName": "${entityName}",
  "description": "...",
  "services": [...],
  "targetClients": [...],
  "marketPosition": "...",
  "competitors": [...],
  "confidenceScore": 0.85
}
`;

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
      // Handle markdown-wrapped JSON responses
      console.log('🧾 Raw AI response:\n', aiResponse);
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      const intelligence = JSON.parse(cleanResponse);
      intelligence.scrapedAt = new Date().toISOString();
      
      // Calculate enhanced confidence score
      intelligence.confidenceScore = calculateConfidenceScore(intelligence, scrapedData);
      
      return intelligence;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', aiResponse);
      
      // Enhanced fallback with better confidence calculation
      const fallbackIntelligence = {
        entityName,
        description: `Professional entity analysis for ${entityName}`,
        services: extractFallbackServices(entityName),
        targetClients: [`Clients seeking ${entityName} services`],
        competitors: [],
        recentNews: [],
        marketPosition: "established",
        industryFocus: [inferIndustryFromName(entityName)],
        confidenceScore: calculateFallbackConfidence(scrapedData),
        scrapedAt: new Date().toISOString(),
        fallback: true
      };
      
      return fallbackIntelligence;
    }
    
  } catch (error) {
    console.error('Error in AI enhancement:', error);
    throw error;
  }
}

function calculateConfidenceScore(intelligence: any, scrapedData: any): number {
  let score = 0.4; // Base score
  
  // Website scraping success (+0.3)
  if (scrapedData?.websiteData?.url) {
    score += 0.3;
    console.log('✅ Website found, confidence +0.3');
  }
  
  // Data completeness (+0.2)
  const fieldsWithData = [
    intelligence.description?.length > 20,
    intelligence.services?.length > 0,
    intelligence.targetClients?.length > 0,
    intelligence.competitors?.length > 0,
    intelligence.industryFocus?.length > 0
  ].filter(Boolean).length;
  
  score += (fieldsWithData / 5) * 0.2;
  console.log(`✅ Data completeness: ${fieldsWithData}/5 fields, confidence +${((fieldsWithData / 5) * 0.2).toFixed(2)}`);
  
  // AI response quality (+0.1)
  if (intelligence.description?.length > 50) {
    score += 0.1;
    console.log('✅ Detailed AI response, confidence +0.1');
  }
  
  return Math.min(0.95, Math.max(0.2, score));
}

function calculateFallbackConfidence(scrapedData: any): number {
  let score = 0.3; // Base fallback score
  
  if (scrapedData?.websiteData?.url) {
    score += 0.2; // Website found but AI parsing failed
  }
  
  if (scrapedData?.websiteData?.title || scrapedData?.websiteData?.description) {
    score += 0.1; // Some metadata extracted
  }
  
  return Math.max(0.2, score);
}

function extractFallbackServices(entityName: string): string[] {
  // Extract potential services from entity name
  const serviceKeywords = ['consulting', 'solutions', 'services', 'software', 'agency', 'group', 'lab', 'studio'];
  const foundServices = serviceKeywords.filter(keyword => 
    entityName.toLowerCase().includes(keyword)
  );
  
  return foundServices.length > 0 ? 
    foundServices.map(s => `${entityName} ${s}`) : 
    ['Professional services', 'Business solutions'];
}

function inferIndustryFromName(entityName: string): string {
  const industryKeywords = {
    'tech': 'Technology',
    'digital': 'Digital Services',
    'marketing': 'Marketing',
    'consulting': 'Consulting',
    'software': 'Software',
    'data': 'Data Analytics',
    'mobile': 'Mobile Technology',
    'web': 'Web Development',
    'creative': 'Creative Services',
    'design': 'Design Services'
  };
  
  for (const [keyword, industry] of Object.entries(industryKeywords)) {
    if (entityName.toLowerCase().includes(keyword)) {
      return industry;
    }
  }
  
  return 'Professional Services';
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