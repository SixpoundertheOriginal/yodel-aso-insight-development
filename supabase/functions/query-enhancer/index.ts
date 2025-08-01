import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicData, entityIntelligence, queryCount = 15 } = await req.json();

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Generate ${queryCount} realistic search queries that potential clients would use to find ${entityIntelligence?.entityName || topicData.entityToTrack}.

Context:
- Entity: ${entityIntelligence?.entityName || topicData.entityToTrack}
- Industry: ${topicData.industry}
- Target Audience: ${topicData.target_audience}
- Geographic Focus: ${topicData.geographic_focus || 'Global'}
- Context: ${topicData.context_description || 'General business inquiry'}
- Known Competitors: ${topicData.known_players?.join(', ') || 'Various industry players'}

Entity Services: ${entityIntelligence?.services?.join(', ') || 'Not specified'}
Target Clients: ${entityIntelligence?.targetClients?.join(', ') || 'Not specified'}
Market Position: ${entityIntelligence?.marketPosition || 'Not specified'}
Industry Focus: ${entityIntelligence?.industryFocus?.join(', ') || 'Not specified'}

Generate natural, varied search queries in these categories:
1. Service-specific queries (how clients search for specific services)
2. Problem-solving queries (pain points clients have)
3. Comparison queries (comparing options in the market)
4. Industry-specific queries (using industry terminology)
5. Geographic queries (location-based searches if relevant)

Make queries realistic - how real people actually search, not marketing speak. Include:
- Natural language variations
- Different search intents (research, comparison, hiring)
- Various query lengths (short and long-tail)
- Industry-specific terminology
- Geographic modifiers when relevant

Return ONLY a JSON array of query objects with this format:
[
  {
    "query_text": "actual search query",
    "query_type": "service_specific|problem_solving|comparison|industry_specific|geographic",
    "priority": 1-10,
    "reasoning": "brief explanation of why this query is relevant"
  }
]`;

    console.log('Generating enhanced queries with OpenAI...');

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
            content: 'You are a search query expert. Generate realistic search queries that potential clients would actually use. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    // Parse the JSON response
    let enhancedQueries;
    try {
      enhancedQueries = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', generatedContent);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate and format the response
    const formattedQueries = enhancedQueries.map((query: any, index: number) => ({
      id: `ai_enhanced_${Date.now()}_${index}`,
      query_text: query.query_text || query.query || '',
      query_type: query.query_type || 'conversational',
      priority: query.priority || 5,
      target_entity: entityIntelligence?.entityName || topicData.entityToTrack,
      reasoning: query.reasoning || 'AI generated query',
      source: 'openai_enhanced'
    }));

    console.log(`Generated ${formattedQueries.length} enhanced queries`);

    return new Response(
      JSON.stringify({ queries: formattedQueries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in query-enhancer function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});