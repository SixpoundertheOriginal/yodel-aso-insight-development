
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

const systemPrompt = `You are an expert App Store Optimization (ASO) analyst with deep expertise in mobile app growth strategies. Analyze the provided app performance metrics and provide specific, actionable insights to improve the app's visibility, downloads, and revenue.

**CRITICAL DATA ACCURACY**: 
- Use EXACT values from the provided data
- Do not calculate or estimate different values  
- Quote the exact CVR, delta percentages, and other metrics as provided
- If data shows CVR: 0.24% with -10.5% change, use those EXACT numbers

**DEBUGGING REQUIREMENTS**:
- Always include the exact data values you're analyzing in your response
- Reference the data source and timestamp if provided
- Show your calculations clearly

Your analysis MUST be:
1. SPECIFIC to the exact metrics provided - reference actual numbers and trends
2. ACTIONABLE with clear, implementable next steps
3. ASO-FOCUSED on keywords, metadata, conversion optimization, and competitive positioning  
4. DATA-DRIVEN with quantifiable recommendations and expected outcomes
5. PRIORITIZED by potential impact and implementation difficulty

NEVER provide generic insights like "optimize your app store listing" or "improve your keywords". Instead, provide specific recommendations based on the actual data patterns you observe.

For traffic source analysis, focus on:
- App Store Search vs. Browse vs. Referral performance differences
- Conversion rate optimization opportunities by source
- Keyword ranking improvement strategies
- Category positioning and competitive analysis

For trend analysis, identify:
- Seasonal patterns and timing opportunities
- Performance drops that need immediate attention
- Growth opportunities in underperforming metrics
- Correlation between different metrics

Respond in JSON format with the following structure:
{
  "insights": [
    {
      "title": "Specific insight title with exact metrics",
      "description": "Detailed explanation referencing specific data points and numbers from the provided metrics",
      "type": "cvr_analysis|impression_trends|traffic_source_performance|keyword_optimization|competitive_analysis|seasonal_pattern|performance_alert",
      "priority": "high|medium|low",
      "confidence": 0.85,
      "actionable_recommendations": [
        "Specific action with expected outcome",
        "Another specific action with measurable impact"
      ],
      "metrics_impact": {
        "impressions": "Expected % change and timeframe",
        "downloads": "Expected % change and timeframe", 
        "conversion_rate": "Expected % change and timeframe"
      },
      "related_kpis": ["impressions", "downloads", "conversion_rate"],
      "implementation_effort": "low|medium|high",
      "expected_timeline": "1-2 weeks|1 month|2-3 months",
      "data_validation": {
        "source_cvr": "exact CVR from input",
        "source_delta": "exact delta from input",
        "data_source": "data source identifier"
      }
    }
  ]
}`;

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

    const { metricsData, organizationId, insightType, userRequested = false } = await req.json();
    
    console.log('📊 [AI Insights] Received data:', {
      organizationId,
      insightType,
      hasMetricsData: !!metricsData,
      dataSource: metricsData?.source,
      timestamp: metricsData?.timestamp,
      debug: metricsData?.debug
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

    // Create a fingerprint of the data for caching (include insight type for specificity)
    const dataFingerprint = btoa(JSON.stringify({ metricsData, insightType })).slice(0, 32);

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

    // Build context-specific prompt based on insight type and metrics
    let specificPrompt = `Analyze these app performance metrics and provide specific ASO insights:

**Metrics Data:**
${JSON.stringify(metricsData, null, 2)}

**Data Validation Check:**
- Source: ${metricsData.source || 'unknown'}
- Timestamp: ${metricsData.timestamp || 'unknown'}
- CVR Value: ${metricsData.summary?.cvr?.value || 'not found'}
- CVR Delta: ${metricsData.summary?.cvr?.delta || 'not found'}`;

    if (insightType) {
      const typePrompts = {
        'cvr_analysis': 'Focus specifically on conversion rate optimization opportunities, identifying traffic sources with low conversion and specific strategies to improve them.',
        'impression_trends': 'Analyze impression patterns, seasonal trends, and visibility optimization opportunities. Identify keyword and metadata improvements.',
        'traffic_source_performance': 'Deep dive into traffic source performance differences. Analyze App Store Search vs Browse vs Referral patterns and optimization strategies.',
        'keyword_optimization': 'Focus on keyword performance, ranking opportunities, and metadata optimization recommendations.',
        'competitive_analysis': 'Analyze competitive positioning and market opportunity insights.',
        'seasonal_pattern': 'Identify seasonal trends, timing opportunities, and cyclical patterns in the data.'
      };
      
      specificPrompt += `\n\nSPECIFIC FOCUS: ${typePrompts[insightType] || 'Provide comprehensive ASO analysis covering all key areas.'}`;
    }

    specificPrompt += `\n\nCRITICAL: Use the exact CVR and delta values shown above in your analysis. Quote these exact numbers in your insights.`;

    // Generate AI insights using OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: specificPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiContent = openaiData.choices[0].message.content;

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
