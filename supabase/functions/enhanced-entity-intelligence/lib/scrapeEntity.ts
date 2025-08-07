// Pure utility module for entity scraping - no Supabase imports
// Consolidated from entity-intelligence-scraper logic

interface ScrapedEntityData {
  entityName: string;
  websiteData?: any;
  searchSnippets?: Record<string, any[]>;
  timestamp: string;
}

export async function scrapeEntity(entityName: string): Promise<ScrapedEntityData> {
  console.log('🌐 Starting entity scraping for:', entityName);
  
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
    
    // Fallback with empty data but valid structure
    return {
      entityName,
      websiteData: null,
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
        signal: AbortSignal.timeout(20000) // 20 seconds timeout
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
  
  if (!apiKey || !searchEngineId) {
    console.log('Google Search API not configured, skipping search snippets');
    return {
      services: [],
      clients: [],
      positioning: [],
      competitors: [],
    };
  }

  const resultsByIntent: Record<string, any[]> = {
    services: [],
    clients: [],
    positioning: [],
    competitors: [],
  };

  for (const { label, query } of smartQueries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query(entityName))}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) {
        resultsByIntent[label].push(...data.items.slice(0, 2));
      }
    } catch (error) {
      console.log(`Failed to fetch search data for ${label}:`, error.message);
    }
  }

  return resultsByIntent;
}