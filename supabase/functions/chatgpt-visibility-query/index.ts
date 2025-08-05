import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { checkAppMention, extractCompetitors, extractRankingPosition } from './brand-recognition.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface QueryRequest {
  queryId: string;
  queryText: string;
  auditRunId: string;
  organizationId: string;
  appId: string;
}

interface VisibilityAnalysis {
  appMentioned: boolean;
  mentionPosition?: number;
  mentionContext: string;
  competitorsMentioned: string[];
  sentimentScore: number;
  visibilityScore: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { queryId, queryText, auditRunId, organizationId, appId }: QueryRequest = await req.json();

    console.log(`[ChatGPT Query] Processing query: ${queryText}`);
    console.log(`[ChatGPT Query] Target app ID: ${appId}`);

    // Get actual app name from database
    const { data: appData } = await supabase
      .from('apps')
      .select('app_name')
      .eq('id', appId)
      .eq('organization_id', organizationId)
      .single();

    const actualAppName = appData?.app_name || appId;
    console.log(`[ChatGPT Query] Resolved app name: ${actualAppName}`);

    // Call OpenAI ChatGPT API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are ChatGPT, an AI assistant created by OpenAI. I want to be helpful, harmless, and honest. I should provide thoughtful, natural responses that are conversational yet informative. When discussing apps or software, I can recommend specific options and explain their strengths and differences. I should aim to be comprehensive in my responses while maintaining a friendly, approachable tone. If users ask about recommendations, I should provide detailed explanations with multiple options when possible.' 
          },
          { role: 'user', content: queryText }
        ],
        temperature: 0.9,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens || 0;
    const costCents = Math.round((tokensUsed / 1000) * 0.2); // Rough cost calculation

    console.log(`[ChatGPT Query] Response received: ${responseText.substring(0, 200)}...`);

    // Store basic results first (will be enhanced by analysis)
    // Get query data for entity aliases
    const { data: queryData } = await supabase
      .from('chatgpt_queries')
      .select('entity_aliases')
      .eq('id', queryId)
      .single();
    
    const entityAliases = queryData?.entity_aliases || [];
    console.log('Entity aliases for analysis:', entityAliases);

    const basicAnalysis = analyzeVisibility(responseText, actualAppName, entityAliases);

    console.log(`[ChatGPT Query] Enhanced visibility analysis: App mentioned: ${basicAnalysis.appMentioned}, Position: ${basicAnalysis.mentionPosition}, Score: ${basicAnalysis.visibilityScore}`);

    // Store results in database
    const { error: insertError } = await supabase
      .from('chatgpt_query_results')
      .insert({
        organization_id: organizationId,
        query_id: queryId,
        audit_run_id: auditRunId,
        response_text: responseText,
        app_mentioned: basicAnalysis.appMentioned,
        mention_position: basicAnalysis.mentionPosition,
        mention_context: basicAnalysis.mentionContext,
        competitors_mentioned: basicAnalysis.competitorsMentioned,
        sentiment_score: basicAnalysis.sentimentScore,
        visibility_score: basicAnalysis.visibilityScore,
        raw_response: data,
        tokens_used: tokensUsed,
        cost_cents: costCents,
      });

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    // Update query status
    const { error: updateError } = await supabase
      .from('chatgpt_queries')
      .update({ status: 'completed' })
      .eq('id', queryId);

    if (updateError) {
      console.error('Error updating query status:', updateError);
    }

    // Update audit run progress
    const { data: auditRun } = await supabase
      .from('chatgpt_audit_runs')
      .select('completed_queries, total_queries')
      .eq('id', auditRunId)
      .single();

    if (auditRun) {
      const newCompletedQueries = auditRun.completed_queries + 1;
      const isComplete = newCompletedQueries >= auditRun.total_queries;

      await supabase
        .from('chatgpt_audit_runs')
        .update({
          completed_queries: newCompletedQueries,
          status: isComplete ? 'completed' : 'running',
          completed_at: isComplete ? new Date().toISOString() : null
        })
        .eq('id', auditRunId);
    }

    // Trigger enhanced analysis after storing basic results
    try {
      const enhancedAnalysisResponse = await fetch(`${supabaseUrl}/functions/v1/enhanced-response-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseText,
          appName: actualAppName, // Use actual resolved app name
          queryResultId: insertError ? null : queryId, // Use queryId as fallback
          organizationId
        }),
      });
      
      if (!enhancedAnalysisResponse.ok) {
        console.warn('[ChatGPT Query] Enhanced analysis failed, using basic analysis');
      } else {
        console.log('[ChatGPT Query] Enhanced analysis completed successfully');
      }
    } catch (enhancedError) {
      console.warn('[ChatGPT Query] Enhanced analysis error:', enhancedError);
    }

    console.log(`[ChatGPT Query] Query ${queryId} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      analysis: basicAnalysis,
      tokensUsed,
      costCents
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ChatGPT Query] Error:', error);

    // Update query status to error
    const { queryId } = await req.json().catch(() => ({}));
    if (queryId) {
      await supabase
        .from('chatgpt_queries')
        .update({ status: 'error' })
        .eq('id', queryId);
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeVisibility(responseText: string, targetApp: string, aliases?: string[]): VisibilityAnalysis {
  // Import enhanced analysis functions
  const { checkAppMention, extractRankingPosition, extractCompetitors, analyzeEntityMention } = require('./brand-recognition.ts');
  
  // Use enhanced entity analysis with alias support
  const entityAnalysis = analyzeEntityMention(responseText, targetApp, aliases);
  const competitorsMentioned = extractCompetitors(responseText, targetApp, aliases);
  
  let mentionContext = 'not_mentioned';
  let visibilityScore = 0;
  
  if (entityAnalysis.mentioned) {
    // Enhanced context detection
    const contextAnalysis = analyzeContext(responseText, entityAnalysis.mentionContexts);
    mentionContext = contextAnalysis.context;
    
    // Base score with confidence weighting
    visibilityScore = Math.round(50 * entityAnalysis.confidence);
    
    // Context-based scoring
    switch (contextAnalysis.context) {
      case 'recommended':
        visibilityScore += 35;
        break;
      case 'compared':
        visibilityScore += 25;
        break;
      case 'mentioned':
        visibilityScore += 15;
        break;
    }
    
    // Position-based scoring
    if (entityAnalysis.position) {
      if (entityAnalysis.position === 1) visibilityScore += 15;
      else if (entityAnalysis.position === 2) visibilityScore += 10;
      else if (entityAnalysis.position <= 5) visibilityScore += 5;
    }
    
    // Multiple mentions bonus
    if (entityAnalysis.mentionCount > 1) {
      visibilityScore += Math.min(10, entityAnalysis.mentionCount * 2);
    }
    
    visibilityScore = Math.min(100, visibilityScore);
  }
  
  // Enhanced sentiment analysis focused on entity contexts
  let sentimentScore = 0;
  const positiveWords = ['best', 'great', 'excellent', 'recommend', 'top', 'reliable', 'popular', 'outstanding', 'leading'];
  const negativeWords = ['bad', 'poor', 'avoid', 'terrible', 'issues', 'problems', 'disappointing', 'unreliable'];
  
  // Analyze sentiment in entity-specific contexts
  entityAnalysis.mentionContexts.forEach(context => {
    const lowerContext = context.toLowerCase();
    positiveWords.forEach(word => {
      if (lowerContext.includes(word)) sentimentScore += 0.15;
    });
    negativeWords.forEach(word => {
      if (lowerContext.includes(word)) sentimentScore -= 0.25;
    });
  });
  
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
  
  return {
    appMentioned: entityAnalysis.mentioned,
    mentionPosition: entityAnalysis.position,
    mentionContext,
    competitorsMentioned: [...new Set(competitorsMentioned)].slice(0, 15),
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    visibilityScore: Math.round(visibilityScore),
    confidence: entityAnalysis.confidence,
    mentionCount: entityAnalysis.mentionCount,
    matchedAlias: entityAnalysis.matchedAlias
  };
}

// Enhanced context analysis
function analyzeContext(responseText: string, mentionContexts: string[]): { context: string; strength: number } {
  const lowerResponse = responseText.toLowerCase();
  const contextText = mentionContexts.join(' ').toLowerCase();
  
  // Priority-based context detection
  if (contextText.includes('recommend') || contextText.includes('suggest') || 
      lowerResponse.includes('i recommend') || lowerResponse.includes('i suggest')) {
    return { context: 'recommended', strength: 0.9 };
  }
  
  if (contextText.includes('compare') || contextText.includes('versus') || 
      contextText.includes('vs') || contextText.includes('alternative')) {
    return { context: 'compared', strength: 0.7 };
  }
  
  if (contextText.includes('consider') || contextText.includes('try') || 
      contextText.includes('option') || contextText.includes('choice')) {
    return { context: 'considered', strength: 0.6 };
  }
  
  return { context: 'mentioned', strength: 0.4 };
}