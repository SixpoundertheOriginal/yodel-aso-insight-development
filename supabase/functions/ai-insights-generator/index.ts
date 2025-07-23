
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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { metricsData, organizationId } = await req.json();

    // Create data fingerprint for caching
    const dataFingerprint = btoa(JSON.stringify({
      ...metricsData,
      organizationId,
      date: new Date().toISOString().split('T')[0] // Cache per day
    }));

    // Check cache first
    const { data: cachedInsights } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('data_fingerprint', dataFingerprint)
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // 6 hours
      .single();

    if (cachedInsights) {
      return new Response(JSON.stringify({ 
        insights: cachedInsights.content.insights,
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate AI insights using OpenAI
    const systemPrompt = `You are an expert ASO (App Store Optimization) analyst. Analyze the provided app performance data and generate 3-5 actionable insights as bullet points.

Focus on:
- Trend identification and significance
- Performance anomalies that need attention
- Optimization opportunities
- Specific, actionable recommendations

Return JSON format:
{
  "insights": [
    {
      "id": "unique_id",
      "type": "trend|anomaly|recommendation",
      "priority": "high|medium|low", 
      "title": "Brief insight title",
      "description": "Detailed explanation with specific data points",
      "confidence": 85,
      "actionable": true
    }
  ]
}`;

    const userPrompt = `Analyze this ASO performance data:

Metrics Summary:
- Impressions: ${metricsData.impressions?.value || 0} (${metricsData.impressions?.delta > 0 ? '+' : ''}${metricsData.impressions?.delta || 0}%)
- Downloads: ${metricsData.downloads?.value || 0} (${metricsData.downloads?.delta > 0 ? '+' : ''}${metricsData.downloads?.delta || 0}%)
- CVR: ${metricsData.cvr?.value || 0}% (${metricsData.cvr?.delta > 0 ? '+' : ''}${metricsData.cvr?.delta || 0}%)
- Product Page Views: ${metricsData.proceeds?.value || 0} (${metricsData.proceeds?.delta > 0 ? '+' : ''}${metricsData.proceeds?.delta || 0}%)

Generate insights focusing on what the data reveals about app performance and what actions should be taken.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;
    
    let insights;
    try {
      insights = JSON.parse(aiContent);
    } catch (e) {
      // Fallback parsing if JSON is malformed
      insights = {
        insights: [{
          id: 'fallback-1',
          type: 'recommendation',
          priority: 'medium',
          title: 'AI Analysis Complete',
          description: 'Performance data analyzed. Continue monitoring trends.',
          confidence: 70,
          actionable: false
        }]
      };
    }

    // Cache the insights
    await supabase
      .from('ai_insights')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        data_fingerprint: dataFingerprint,
        type: 'performance_analysis',
        content: insights,
        confidence_score: 85
      });

    return new Response(JSON.stringify({ 
      insights: insights.insights,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Insights Generator Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      insights: [] // Return empty insights on error
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
