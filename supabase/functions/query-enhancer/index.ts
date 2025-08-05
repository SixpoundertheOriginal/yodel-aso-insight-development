import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Helper function to create user personas based on target audience and context (for B2B services)
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

// Helper function to extract problem contexts from data (for B2B services)
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

// NEW: Helper function to create app user personas (for B2C apps)
function createAppUserPersonas(topicData: any, entityIntelligence: any) {
  const personas = [];
  
  // Primary app user persona
  const mainAudience = topicData.target_audience || 'mobile users';
  personas.push({
    name: `Active ${mainAudience}`,
    description: `${mainAudience} seeking mobile solutions for ${topicData.context_description || 'daily needs'}`,
    searchBehavior: 'Feature-focused, outcome-driven searches'
  });

  // Context-specific persona
  if (topicData.context_description) {
    personas.push({
      name: 'Problem-Solver',
      description: `User needing help with: ${topicData.context_description}`,
      searchBehavior: 'Specific problem searches with clear requirements'
    });
  }

  // Category-specific persona
  personas.push({
    name: `${topicData.topic.replace('apps', '').trim()} Enthusiast`,
    description: `Regular user of ${topicData.topic} looking for better options`,
    searchBehavior: 'Comparison-focused, feature-conscious searches'
  });

  return personas;
}

// NEW: Helper function to extract app-specific use cases
function extractAppUseCases(topicData: any, appFeatures: string[]) {
  const useCases = [];

  // Feature-based use cases
  appFeatures.slice(0, 3).forEach(feature => {
    useCases.push({
      scenario: `Need for ${feature.toLowerCase()}`,
      searchIntent: `Apps with ${feature} functionality`
    });
  });

  // Context-specific use cases
  if (topicData.context_description) {
    useCases.push({
      scenario: topicData.context_description,
      searchIntent: `Mobile solution for ${topicData.context_description.toLowerCase()}`
    });
  }

  // Audience-specific use cases
  useCases.push({
    scenario: `${topicData.target_audience} seeking ${topicData.topic}`,
    searchIntent: `Best ${topicData.topic} for ${topicData.target_audience}`
  });

  return useCases;
}

// NEW: App-specific prompt generation function
function generateAppDiscoveryPrompt(topicData: any, entityIntelligence: any, queryCount: number, appFeatures: string[]) {
  const userPersonas = createAppUserPersonas(topicData, entityIntelligence);
  const appUseCases = extractAppUseCases(topicData, appFeatures);
  
  return `You are an expert in mobile app discovery and user search behavior. Generate realistic search queries that potential users employ when ACTIVELY LOOKING FOR MOBILE APPS to solve their specific needs.

**FOCUS ON APP DISCOVERY SCENARIOS:**
These are people who have identified a need for a mobile solution and are actively searching app stores, asking for recommendations, or researching app options.

**APP BEING ANALYZED:**
- App Name: ${entityIntelligence?.entityName || topicData.entityToTrack}
- App Category: ${topicData.topic}
- Key Features: ${appFeatures.join(', ') || 'mobile app features'}
- Target Users: ${topicData.target_audience}
- App Context: ${topicData.context_description}
- Geographic Focus: ${topicData.geographic_focus || 'Global'}
- Known Competitors: ${topicData.known_players?.join(', ') || 'Various apps'}

**APP USER PERSONAS:**
${userPersonas.map(persona => `- ${persona.name}: ${persona.description} (Search behavior: ${persona.searchBehavior})`).join('\n')}

**APP USE CASES & SCENARIOS:**
${appUseCases.map(useCase => `- ${useCase.scenario}: ${useCase.searchIntent}`).join('\n')}

**APP DISCOVERY QUERY PATTERNS:**
1. **Feature-based searches** (40%): Users searching for specific app capabilities
2. **Use case searches** (30%): Users searching for apps to solve specific problems  
3. **Comparison searches** (20%): Users comparing apps or looking for alternatives
4. **Category + context** (10%): Users searching within app categories with specific needs

Generate ${queryCount} realistic app discovery queries that simulate authentic user search behavior.

**QUERY INTENT DISTRIBUTION:**
- **High Purchase Intent** (50%): Ready to download, comparing final options
- **Medium Purchase Intent** (30%): Researching and evaluating multiple apps
- **Low Purchase Intent** (20%): Early research, learning about app categories

**APP-SPECIFIC QUERY CHARACTERISTICS:**
- Use language that real app users employ
- Include specific features from the app's key capabilities
- Focus on user problems and desired outcomes
- Include contextual modifiers: "for beginners", "offline", "free", "premium"
- Add platform preferences when relevant: "iOS", "Android"
- Include usage scenarios: "for commuting", "for work", "for travel"
- Use comparison language: "vs", "alternative to", "better than"
- Include user constraints: "without ads", "under 50MB", "works offline"

**EXAMPLES OF REALISTIC APP DISCOVERY QUERIES:**
- "best ${topicData.topic} with ${appFeatures[0] || 'offline capability'}"
- "${appFeatures[0] || 'feature'} apps for ${topicData.target_audience}"
- "apps like ${topicData.known_players?.[0] || 'popular competitor'} but ${appFeatures[1] || 'better'}"
- "${topicData.topic} that work ${appFeatures[1] || 'without internet'}"
- "best ${topicData.topic} for ${topicData.target_audience} beginners"
- "free ${topicData.topic} vs premium options"
- "${topicData.topic} with ${appFeatures[0]} and ${appFeatures[1]}"
- "${topicData.context_description} app recommendations"

**CRITICAL REQUIREMENTS:**
- Every query should reflect genuine user search behavior
- Include specific app features from the extracted feature list
- Focus on user needs and problem-solving scenarios
- Simulate various stages of the app selection process
- Include natural language variations users actually employ

Return ONLY a JSON array with this format:
[
  {
    "query_text": "actual search query that a real app user would type",
    "query_type": "feature_based|use_case|comparison|category_search",
    "priority": 1-10,
    "persona": "which user persona would search this",
    "search_intent": "ready_to_download|evaluating_options|early_research",
    "purchase_intent": "high|medium|low",
    "reasoning": "specific user scenario driving this search"
  }
]`;
}

// Existing B2B service prompt function (preserved unchanged)
function generateExistingServicePrompt(topicData: any, entityIntelligence: any, queryCount: number) {
  const userPersonas = createUserPersonas(topicData, entityIntelligence);
  const problemContexts = extractProblemContexts(topicData, entityIntelligence);
  
  // Extract intent strategy from topicData
  const queryStrategy = topicData.queryStrategy || 'mixed';
  const intentLevel = topicData.intentLevel || 'medium';
  const competitorFocus = topicData.competitorFocus || false;
  
  return `You are an expert in customer discovery and purchase intent simulation. Your task is to generate realistic search queries that potential clients use when they are ACTIVELY LOOKING TO HIRE services or solve real business problems.

**FOCUS ON CUSTOMER DISCOVERY SCENARIOS:**
These are people who have a business problem and are actively seeking solutions, not just researching out of curiosity.

**TARGET AUDIENCE PERSONAS (with purchase intent):**
${userPersonas.map(persona => `- ${persona.name}: ${persona.description} (Search behavior: ${persona.searchBehavior})`).join('\n')}

**ENTITY BEING ANALYZED:**
- Name: ${entityIntelligence?.entityName || topicData.entityToTrack}
- Services: ${entityIntelligence?.services?.join(', ') || 'Business services'}
- Target Clients: ${entityIntelligence?.targetClients?.join(', ') || topicData.target_audience}
- Market Position: ${entityIntelligence?.marketPosition || 'Industry provider'}
- Industry Focus: ${entityIntelligence?.industryFocus?.join(', ') || topicData.industry}

**BUSINESS CONTEXT:**
- Industry: ${topicData.industry}
- Geographic Focus: ${topicData.geographic_focus || 'Global'}
- Specific Context: ${topicData.context_description || 'General business needs'}
- Known Players: ${topicData.known_players?.join(', ') || 'Various providers'}
- Query Strategy: ${queryStrategy} (${intentLevel} intent level)
- Competitor Focus: ${competitorFocus ? 'Yes - include competitive queries' : 'No'}

**REAL CLIENT PAIN POINTS TO ADDRESS:**
${problemContexts.map(context => `- ${context.problem}: ${context.searchIntent}`).join('\n')}

Generate ${queryCount} intent-driven queries that simulate how real clients discover and evaluate service providers.

**QUERY INTENT DISTRIBUTION:**
${intentLevel === 'high' ? 
  '1. **High Purchase Intent** (60%): "Need to hire", "Looking for", "Which company should I choose"' :
  intentLevel === 'medium' ?
  '1. **Medium Purchase Intent** (40%): Comparison and evaluation queries\n2. **Research Intent** (30%): Learning about solutions\n3. **High Purchase Intent** (30%): Ready to hire queries' :
  '1. **Research Intent** (50%): Learning about industry and solutions\n2. **Medium Purchase Intent** (30%): Comparing options\n3. **High Purchase Intent** (20%): Ready to hire queries'
}

**QUERY CHARACTERISTICS FOR CUSTOMER DISCOVERY:**
- Use language that real business decision-makers use
- Include urgency indicators: "need", "looking for", "help with"
- Focus on business outcomes and results
- Include service-specific terminology from the entity's offerings
- Add realistic business constraints: budget, timeline, industry-specific needs
- Include geographic qualifiers when relevant
- Use competitive language: "vs", "alternatives", "better than"
- Include client scenario contexts: startup, enterprise, specific industry verticals

**EXAMPLES OF HIGH-INTENT CUSTOMER DISCOVERY QUERIES:**
- "Best ${entityIntelligence?.services?.[0] || 'marketing'} agency for ${topicData.target_audience}"
- "Need help with ${problemContexts[0]?.problem || 'app marketing'} - recommendations?"
- "Which ${topicData.topic} should I hire for ${topicData.target_audience}?"
- "${entityIntelligence?.services?.[0] || 'Marketing'} companies with proven ROI"
- "Looking for ${topicData.topic} that specialize in ${topicData.industry}"
- "${topicData.geographic_focus || 'US'} ${topicData.topic} with ${entityIntelligence?.services?.[0] || 'expertise'}"

**CRITICAL REQUIREMENTS:**
- Every query should sound like a real client with a real need
- Include specific service mentions from the entity's service list
- Focus on business decision-making scenarios
- Simulate various stages of the buying journey
- Include pain points that drive people to search for external help

Return ONLY a JSON array with this format:
[
  {
    "query_text": "actual search query that a real client would use",
    "query_type": "high_intent|medium_intent|low_intent|comparison|service_specific",
    "priority": 1-10,
    "persona": "which target persona would search this",
    "search_intent": "immediate_need|purchase_intent|comparison|research|service_evaluation",
    "purchase_intent": "high|medium|low",
    "reasoning": "specific business scenario driving this search"
  }
]`;
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

    // NEW: Detect if this is app analysis based on app toggle state and features
    const isAppAnalysis = topicData.isAppToggleEnabled || 
                         topicData.appFeatures?.length > 0 || 
                         topicData.isApp === true ||
                         topicData.keyFeatures?.length > 0;

    const appFeatures = topicData.appFeatures || topicData.keyFeatures || [];

    console.log(`Analysis type: ${isAppAnalysis ? 'APP' : 'SERVICE'} | Features: ${appFeatures.length}`);

    // NEW: Route to appropriate prompt based on app toggle
    let prompt;
    try {
      if (isAppAnalysis) {
        console.log('Generating app discovery prompt...');
        prompt = generateAppDiscoveryPrompt(topicData, entityIntelligence, queryCount, appFeatures);
      } else {
        console.log('Generating service discovery prompt...');
        prompt = generateExistingServicePrompt(topicData, entityIntelligence, queryCount);
      }
    } catch (error) {
      console.error('Prompt generation error, falling back to service prompt:', error);
      // Always fallback to existing working prompt
      prompt = generateExistingServicePrompt(topicData, entityIntelligence, queryCount);
    }

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

    // Parse the JSON response (handle markdown code blocks)
    let enhancedQueries;
    try {
      let jsonContent = generatedContent.trim();
      
      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      enhancedQueries = JSON.parse(jsonContent);
      console.log(`Successfully parsed ${enhancedQueries.length} queries from OpenAI`);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', generatedContent);
      console.error('Parse error:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate and format the response with enhanced intent data
    const formattedQueries = enhancedQueries.map((query: any, index: number) => ({
      id: `${isAppAnalysis ? 'app' : 'service'}_enhanced_${Date.now()}_${index}`,
      query_text: query.query_text || query.query || '',
      query_type: query.query_type || (isAppAnalysis ? 'feature_based' : 'medium_intent'),
      priority: query.priority || 5,
      target_entity: entityIntelligence?.entityName || topicData.entityToTrack,
      reasoning: query.reasoning || (isAppAnalysis ? 'AI generated app discovery query' : 'AI generated customer discovery query'),
      persona: query.persona || (isAppAnalysis ? 'App user' : 'Business decision maker'),
      search_intent: query.search_intent || (isAppAnalysis ? 'evaluating_options' : 'purchase_intent'),
      purchase_intent: query.purchase_intent || 'medium',
      client_scenario: query.reasoning || (isAppAnalysis ? 'User seeking mobile solution' : 'Business seeking external expertise'),
      source: isAppAnalysis ? 'openai_app_enhanced' : 'openai_enhanced'
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