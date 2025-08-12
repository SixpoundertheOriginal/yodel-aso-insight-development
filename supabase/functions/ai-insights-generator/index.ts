
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import OpenAI from "https://esm.sh/openai@5.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openai = new OpenAI({ apiKey: openAIApiKey });

function buildContextualPrompt(metricsData: any, filterContext: any, _insightType: string = 'comprehensive'): string {
  const dateRangeText = filterContext?.dateRange
    ? `${filterContext.dateRange.start} to ${filterContext.dateRange.end}`
    : 'selected period';

  const trafficSourcesText = filterContext?.trafficSources?.length > 0
    ? filterContext.trafficSources.join(', ')
    : 'all traffic sources';

  const appsText = filterContext?.selectedApps?.length > 0
    ? filterContext.selectedApps.join(', ')
    : 'all apps';

  return `
IMPORTANT: You are analyzing ONLY the filtered data shown in the user's current dashboard view.

CURRENT DASHBOARD CONTEXT:
- Date Range: ${dateRangeText}
- Traffic Sources: ${trafficSourcesText}  
- Apps: ${appsText}

CURRENT DASHBOARD METRICS (FILTERED DATA):
- Downloads: ${metricsData?.summary?.downloads?.value || 'N/A'} (Change: ${metricsData?.summary?.downloads?.delta > 0 ? '+' : ''}${metricsData?.summary?.downloads?.delta || 'N/A'})
- Impressions: ${metricsData?.summary?.impressions?.value || 'N/A'} (Change: ${metricsData?.summary?.impressions?.delta > 0 ? '+' : ''}${metricsData?.summary?.impressions?.delta || 'N/A'})
- Conversion Rate: ${metricsData?.summary?.cvr?.value || 'N/A'}% (Change: ${metricsData?.summary?.cvr?.delta > 0 ? '+' : ''}${metricsData?.summary?.cvr?.delta || 'N/A'}%)

CRITICAL: Your analysis must explain these EXACT numbers shown in the dashboard. 
If downloads show ${metricsData?.summary?.downloads?.value} with ${metricsData?.summary?.downloads?.delta} change, your insights must reference these specific values.

Do NOT analyze data outside this filtered view. Focus only on the performance of ${trafficSourcesText} for ${appsText} during ${dateRangeText}.

FULL FILTERED DATASET:
${JSON.stringify(metricsData, null, 2)}

Provide 1-2 actionable insights that specifically explain the performance shown in this filtered dashboard view.
`;
}

function buildConversationalPrompt(
  userQuestion: string,
  metricsData: any,
  filterContext: any
): string {
  const dateRangeText = filterContext?.dateRange
    ? `${filterContext.dateRange.start} to ${filterContext.dateRange.end}`
    : 'selected period';
  const trafficSourcesText = filterContext?.trafficSources?.length > 0
    ? filterContext.trafficSources.join(', ')
    : 'all traffic sources';
  const appsText = filterContext?.selectedApps?.length > 0
    ? filterContext.selectedApps.join(', ')
    : 'all apps';

  return `
You are an expert mobile marketing analyst helping a user understand their ASO performance.

CURRENT DASHBOARD CONTEXT:
- User is viewing: ${trafficSourcesText} for ${appsText}
- Time period: ${dateRangeText}
- Current KPIs:
  * Downloads: ${metricsData?.summary?.downloads?.value || 'N/A'} (${metricsData?.summary?.downloads?.delta > 0 ? '+' : ''}${metricsData?.summary?.downloads?.delta || 'N/A'} change)
  * Impressions: ${metricsData?.summary?.impressions?.value || 'N/A'} (${metricsData?.summary?.impressions?.delta > 0 ? '+' : ''}${metricsData?.summary?.impressions?.delta || 'N/A'} change)  
  * Conversion Rate: ${metricsData?.summary?.cvr?.value || 'N/A'}% (${metricsData?.summary?.cvr?.delta > 0 ? '+' : ''}${metricsData?.summary?.cvr?.delta || 'N/A'}% change)
  * Product Page Views: ${metricsData?.summary?.product_page_views?.value || 'N/A'} (${metricsData?.summary?.product_page_views?.delta > 0 ? '+' : ''}${metricsData?.summary?.product_page_views?.delta || 'N/A'} change)

USER QUESTION: "${userQuestion}"

INSTRUCTIONS:
- Answer the user's specific question based on the data above
- Reference the exact numbers they can see on their dashboard
- Provide actionable insights and recommendations
- Keep response conversational but professional
- Focus on the specific filtered data they're viewing
- If the question requires data not available, suggest what additional analysis would help

RESPONSE GUIDELINES:
- Be concise (2-3 paragraphs max)
- Use specific numbers from their dashboard
- Provide at least one actionable recommendation
- Explain WHY trends are happening when possible
- Sound like an expert mobile marketing consultant

FULL FILTERED DATASET FOR REFERENCE:
${JSON.stringify(metricsData, null, 2)}
`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Authorization header from the request
    const authorization = req.headers.get('Authorization');
    
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authorization.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { organizationId, metricsData, filterContext, insightType, userRequested = false, userQuestion } = await req.json();

    console.log('🐛 AI Generator received:', {
      organizationId,
      hasMetricsData: !!metricsData,
      filterContext: {
        dateRange: filterContext?.dateRange,
        trafficSources: filterContext?.trafficSources?.length || 0,
        selectedApps: filterContext?.selectedApps?.length || 0
      },
      userQuestion: userQuestion ? `"${userQuestion.substring(0, 50)}..."` : 'none',
      dashboardNumbers: {
        downloads: metricsData?.summary?.downloads?.value,
        downloadsChange: metricsData?.summary?.downloads?.delta,
        impressions: metricsData?.summary?.impressions?.value
      }
    });

    if (!metricsData || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: metricsData and organizationId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle conversational chat requests
    if (userQuestion) {
      if (!openAIApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const prompt = buildConversationalPrompt(userQuestion, metricsData, filterContext);
      console.log('🔧 Using prompt type: conversational');
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert mobile marketing analyst. Provide conversational, actionable insights."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const responseContent = aiResponse.choices[0].message?.content || '';

      return new Response(
        JSON.stringify({ success: true, response: responseContent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a fingerprint of the data for caching (include insight type and filters for specificity)
    const dataFingerprint = btoa(JSON.stringify({ metricsData, filterContext, insightType })).slice(0, 32);

    // Check if we have cached insights for this specific request
    const { data: cachedInsights } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('data_fingerprint', dataFingerprint)
      .eq('organization_id', organizationId)
      .eq('is_user_requested', userRequested)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (cachedInsights && cachedInsights.length > 0) {
      return new Response(
        JSON.stringify({ insights: cachedInsights }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ 
          insights: [{
            title: "Analysis Ready - API Configuration Needed",
            description: "Your ASO data is ready for AI analysis. Complete the OpenAI API setup to unlock specific, actionable insights based on your app's performance metrics.",
            type: "configuration",
            priority: "medium",
            confidence: 1.0,
            actionable_recommendations: [
              "Configure OpenAI API key in project settings",
              "Retry analysis to get specific ASO recommendations"
            ],
            metrics_impact: {
              impressions: "Insights will show specific improvement opportunities",
              downloads: "Recommendations will target conversion optimization",
              conversion_rate: "Analysis will identify optimization strategies"
            },
            related_kpis: ["setup"],
            implementation_effort: "low",
            expected_timeline: "immediate"
          }]
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

      const prompt = buildContextualPrompt(metricsData, filterContext, insightType);
      console.log('🐛 AI Prompt (first 300 chars):', prompt.substring(0, 300) + '...');

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are an ASO analytics expert. Analyze ONLY the provided filtered data." },
          { role: "user", content: prompt }
        ]
      });

      const aiContent = aiResponse.choices[0].message?.content || '';

    let parsedInsights;
    try {
      parsedInsights = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', aiContent);
      // Create a fallback insight with the raw content
      parsedInsights = {
        insights: [{
          title: "AI Analysis Generated",
          description: aiContent.slice(0, 500) + (aiContent.length > 500 ? '...' : ''),
          type: insightType || 'general',
          priority: 'medium',
          confidence: 0.7,
          actionable_recommendations: ["Review the detailed analysis provided"],
          metrics_impact: {
            impressions: "See analysis for specific recommendations",
            downloads: "See analysis for specific recommendations",
            conversion_rate: "See analysis for specific recommendations"
          },
          related_kpis: ["general"],
          implementation_effort: "medium",
          expected_timeline: "1-2 weeks"
        }]
      };
    }

    // Store insights in the database
    const insightsToStore = parsedInsights.insights.map((insight: any) => ({
      organization_id: organizationId,
      user_id: user.id,
      insight_type: insight.type || insightType || 'general',
      title: insight.title,
      content: insight.description,
      metrics_data: metricsData,
      confidence_score: insight.confidence || 0.5,
      data_fingerprint: dataFingerprint,
      actionable_recommendations: insight.actionable_recommendations || insight.recommendations || [],
      related_kpis: insight.related_kpis || [],
      priority: insight.priority || 'medium',
      is_user_requested: userRequested
    }));

    const { data: storedInsights, error: insertError } = await supabase
      .from('ai_insights')
      .insert(insightsToStore)
      .select();

    if (insertError) {
      console.error('Error storing insights:', insertError);
      // Don't fail the request if we can't cache, just return the insights
    }

    return new Response(
      JSON.stringify({ insights: storedInsights || parsedInsights.insights }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in ai-insights-generator:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
