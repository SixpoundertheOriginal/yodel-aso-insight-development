import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

interface CompetitorApp {
  app_id: string;
  app_name: string;
  developer_name?: string;
  ranking_position: number;
  rating_score?: number;
  rating_count?: number;
  category?: string;
  title_keywords: string[];
  subtitle_keywords: string[];
  description_keywords: string[];
}

interface CompetitiveAnalysisRequest {
  searchTerm: string;
  analysisType: 'brand' | 'keyword' | 'category';
  organizationId: string;
  maxCompetitors?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchTerm, analysisType, organizationId, maxCompetitors = 10 }: CompetitiveAnalysisRequest = await req.json();

    console.log(`[Competitive Intelligence] Starting analysis for: ${searchTerm} (${analysisType})`);

    // 1. Create analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('competitor_analysis')
      .insert({
        organization_id: organizationId,
        search_term: searchTerm,
        search_type: analysisType,
        analysis_status: 'processing'
      })
      .select()
      .single();

    if (analysisError) {
      throw new Error(`Failed to create analysis: ${analysisError.message}`);
    }

    // 2. Fetch competitor data using app store scraper
    const scraperResponse = await fetch(`${supabaseUrl}/functions/v1/app-store-scraper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchTerm,
        searchType: 'keyword',
        organizationId,
        includeCompetitorAnalysis: true,
        limit: maxCompetitors * 2 // Get more to filter better results
      })
    });

    if (!scraperResponse.ok) {
      throw new Error('Failed to fetch competitor data');
    }

    const scraperData = await scraperResponse.json();
    const competitorApps: CompetitorApp[] = scraperData.results?.slice(0, maxCompetitors).map((app: any, index: number) => ({
      app_id: app.appId || app.id,
      app_name: app.title || app.name,
      developer_name: app.developer,
      ranking_position: index + 1,
      rating_score: app.rating,
      rating_count: app.reviews,
      category: app.applicationCategory,
      title_keywords: extractKeywords(app.title || ''),
      subtitle_keywords: extractKeywords(app.subtitle || ''),
      description_keywords: extractKeywords(app.description || '').slice(0, 20) // Limit description keywords
    })) || [];

    console.log(`[Competitive Intelligence] Found ${competitorApps.length} competitors`);

    // 3. Store competitor apps in database
    const competitorRecords = competitorApps.map(app => ({
      ...app,
      analysis_id: analysis.id,
      organization_id: organizationId
    }));

    const { error: appsError } = await supabase
      .from('competitor_apps')
      .insert(competitorRecords);

    if (appsError) {
      console.error('Failed to store competitor apps:', appsError);
    }

    // 4. Generate AI insights
    const aiInsights = await generateAIInsights(competitorApps, searchTerm, analysisType);

    // 5. Update analysis with insights
    const { error: updateError } = await supabase
      .from('competitor_analysis')
      .update({
        total_apps_analyzed: competitorApps.length,
        analysis_status: 'completed',
        ai_summary: aiInsights.summary,
        insights: aiInsights
      })
      .eq('id', analysis.id);

    if (updateError) {
      console.error('Failed to update analysis:', updateError);
    }

    console.log(`[Competitive Intelligence] Analysis completed for: ${searchTerm}`);

    return new Response(JSON.stringify({
      analysisId: analysis.id,
      competitorApps: competitorApps.slice(0, 10), // Return top 10
      insights: aiInsights,
      summary: aiInsights.summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in competitive-intelligence function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to analyze competitors'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !['the', 'and', 'for', 'app', 'with', 'your', 'that', 'this'].includes(word))
    .slice(0, 10); // Limit keywords per field
}

async function generateAIInsights(competitors: CompetitorApp[], searchTerm: string, analysisType: string) {
  const competitorSummary = competitors.map(app => 
    `${app.ranking_position}. ${app.app_name} by ${app.developer_name} (Rating: ${app.rating_score}/5, Reviews: ${app.rating_count})`
  ).join('\n');

  const allKeywords = competitors.flatMap(app => [
    ...app.title_keywords,
    ...app.subtitle_keywords,
    ...app.description_keywords.slice(0, 5)
  ]);

  const keywordFrequency = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topKeywords = Object.entries(keywordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
    .map(([keyword, count]) => `${keyword} (${count} apps)`);

  const prompt = `Analyze the competitive landscape for "${searchTerm}" based on these top ${competitors.length} apps:

${competitorSummary}

Top Keywords Used: ${topKeywords.join(', ')}

Provide analysis in this JSON format:
{
  "summary": "Brief executive summary of the competitive landscape",
  "marketPositioning": {
    "commonStrategies": ["strategy1", "strategy2"],
    "uniquePositions": ["position1", "position2"],
    "marketGaps": ["gap1", "gap2"]
  },
  "keywordInsights": {
    "topKeywords": ["keyword1", "keyword2"],
    "underutilizedKeywords": ["keyword1", "keyword2"],
    "emergingTrends": ["trend1", "trend2"]
  },
  "competitiveOpportunities": {
    "rankingOpportunities": ["opportunity1", "opportunity2"],
    "differentiationAreas": ["area1", "area2"],
    "marketEntry": ["strategy1", "strategy2"]
  },
  "ratingAndReviewInsights": {
    "averageRating": 0.0,
    "ratingDistribution": "description",
    "reviewPatterns": ["pattern1", "pattern2"]
  }
}`;

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
            content: 'You are an expert ASO analyst. Provide detailed competitive intelligence analysis in the exact JSON format requested. Be specific and actionable.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Try to parse JSON response
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return {
        summary: aiResponse,
        marketPositioning: {},
        keywordInsights: { topKeywords },
        competitiveOpportunities: {},
        ratingAndReviewInsights: {}
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      summary: `Competitive analysis for "${searchTerm}" found ${competitors.length} competitors with varying market positions.`,
      marketPositioning: {},
      keywordInsights: { topKeywords },
      competitiveOpportunities: {},
      ratingAndReviewInsights: {}
    };
  }
}