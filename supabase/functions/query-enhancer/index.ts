import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Helper function to create user personas based on target audience and context
function createUserPersonas(topicData: any, entityIntelligence: any) {
  const personas = [];
  
  // Base persona from target audience
  const mainAudience = topicData.target_audience || 'business professionals';
  personas.push({
    name: `Primary ${mainAudience}`,
    description: `${mainAudience} in ${topicData.industry} looking for solutions`,
    searchBehavior: 'Problem-focused, solution-oriented searches'
  });

  // Context-specific persona
  if (topicData.context_description) {
    personas.push({
      name: 'Context-driven User',
      description: `Someone dealing with: ${topicData.context_description}`,
      searchBehavior: 'Specific problem searches with urgency'
    });
  }

  // Industry persona
  personas.push({
    name: `${topicData.industry} Professional`,
    description: `Industry expert needing specialized ${topicData.industry} solutions`,
    searchBehavior: 'Technical terminology, comparison-focused'
  });

  // Entity target client persona
  if (entityIntelligence?.targetClients?.length > 0) {
    personas.push({
      name: entityIntelligence.targetClients[0],
      description: `${entityIntelligence.targetClients[0]} seeking professional services`,
      searchBehavior: 'Service-specific, quality-focused searches'
    });
  }

  return personas;
}

// Helper function to extract problem contexts from data
function extractProblemContexts(topicData: any, entityIntelligence: any) {
  const contexts = [];

  // Service-based problems
  if (entityIntelligence?.services?.length > 0) {
    entityIntelligence.services.slice(0, 3).forEach((service: string) => {
      contexts.push({
        problem: `Need for ${service.toLowerCase()}`,
        searchIntent: `How to get help with ${service.toLowerCase()}`
      });
    });
  }

  // Industry-specific problems
  const industryProblems = {
    'marketing': ['low conversion rates', 'poor brand visibility', 'ineffective campaigns'],
    'technology': ['system integration issues', 'scalability problems', 'technical debt'],
    'healthcare': ['patient engagement', 'compliance requirements', 'operational efficiency'],
    'finance': ['risk management', 'regulatory compliance', 'cost optimization'],
    'education': ['student engagement', 'learning outcomes', 'administrative efficiency'],
    'retail': ['customer acquisition', 'inventory management', 'online presence'],
    'default': ['operational efficiency', 'cost reduction', 'performance improvement']
  };

  const relevantProblems = industryProblems[topicData.industry.toLowerCase()] || industryProblems.default;
  relevantProblems.slice(0, 2).forEach(problem => {
    contexts.push({
      problem: `${problem} in ${topicData.industry}`,
      searchIntent: `Solutions for ${problem}`
    });
  });

  // Context-specific problems
  if (topicData.context_description) {
    contexts.push({
      problem: topicData.context_description,
      searchIntent: `Help with ${topicData.context_description.toLowerCase()}`
    });
  }

  return contexts;
}

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

    // Create persona-driven prompt based on target audience and context
    const userPersonas = createUserPersonas(topicData, entityIntelligence);
    const problemContexts = extractProblemContexts(topicData, entityIntelligence);
    
    const prompt = `You are simulating search behavior of real people looking for solutions in the ${topicData.industry} industry. 

**TARGET AUDIENCE PERSONAS:**
${userPersonas.map(persona => `- ${persona.name}: ${persona.description} (Search behavior: ${persona.searchBehavior})`).join('\n')}

**ENTITY BEING ANALYZED:**
- Name: ${entityIntelligence?.entityName || topicData.entityToTrack}
- Services: ${entityIntelligence?.services?.join(', ') || 'Business services'}
- Target Clients: ${entityIntelligence?.targetClients?.join(', ') || topicData.target_audience}
- Market Position: ${entityIntelligence?.marketPosition || 'Industry provider'}

**USER CONTEXT:**
- Industry: ${topicData.industry}
- Geographic Focus: ${topicData.geographic_focus || 'Global'}
- Specific Context: ${topicData.context_description || 'General business needs'}
- Known Players: ${topicData.known_players?.join(', ') || 'Various providers'}

**PROBLEM CONTEXTS TO ADDRESS:**
${problemContexts.map(context => `- ${context.problem}: ${context.searchIntent}`).join('\n')}

Generate ${queryCount} realistic search queries from the perspective of your target personas experiencing real problems that the entity can solve.

**QUERY CATEGORIES TO COVER:**
1. **Problem-solving** (40%): People experiencing specific issues
2. **Research** (25%): People learning about solutions  
3. **Comparison** (20%): People evaluating options
4. **Service-specific** (10%): People looking for specific services
5. **Industry-specific** (5%): Using industry terminology

**QUERY CHARACTERISTICS:**
- Natural language (how real people search, not marketing copy)
- Various intents: immediate need, research, comparison, education
- Different specificity levels: broad problems to specific solutions
- Include long-tail variations and conversational queries
- Add geographic modifiers when relevant
- Use industry-specific pain points and terminology

**EXAMPLES OF GOOD QUERIES:**
- "Why is my [relevant item] not working as expected"
- "How to solve [specific problem] for [target audience type]" 
- "[Entity service] vs doing it myself"
- "Best practices for [relevant industry process]"
- "[Geographic area] [service type] recommendations"

Return ONLY a JSON array with this format:
[
  {
    "query_text": "actual search query",
    "query_type": "problem_solving|research|comparison|service_specific|industry_specific",
    "priority": 1-10,
    "persona": "which target persona would search this",
    "search_intent": "immediate_need|research|comparison|education",
    "reasoning": "why this persona would search this"
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
      persona: query.persona || 'General user',
      search_intent: query.search_intent || 'research',
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