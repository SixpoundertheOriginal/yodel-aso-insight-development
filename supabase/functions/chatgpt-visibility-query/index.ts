import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    console.log(`[ChatGPT Query] Target app: ${appId}`);

    // Call OpenAI ChatGPT API
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
            content: 'You are a helpful assistant that provides app recommendations. Be specific and mention actual app names when possible. Provide clear, concise recommendations.' 
          },
          { role: 'user', content: queryText }
        ],
        temperature: 0.7,
        max_tokens: 500,
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
    const basicAnalysis = analyzeVisibility(responseText, appId);

    console.log(`[ChatGPT Query] Basic visibility analysis: App mentioned: ${basicAnalysis.appMentioned}, Position: ${basicAnalysis.mentionPosition}, Score: ${basicAnalysis.visibilityScore}`);

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
          appName: appId,
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

function analyzeVisibility(responseText: string, targetApp: string): VisibilityAnalysis {
  const lowerResponse = responseText.toLowerCase();
  const lowerTargetApp = targetApp.toLowerCase();
  
  // Check if app is mentioned
  const appMentioned = lowerResponse.includes(lowerTargetApp);
  
  let mentionPosition: number | undefined;
  let mentionContext = 'not_mentioned';
  let visibilityScore = 0;
  
  if (appMentioned) {
    // Determine mention position (1st, 2nd, 3rd app mentioned)
    const sentences = responseText.split(/[.!?]+/);
    let position = 1;
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(lowerTargetApp)) {
        mentionPosition = position;
        break;
      }
      // Count other potential app mentions to determine position
      if (sentence.toLowerCase().includes('app') || sentence.toLowerCase().includes('application')) {
        position++;
      }
    }
    
    // Determine context
    if (lowerResponse.includes('recommend') || lowerResponse.includes('suggest')) {
      mentionContext = 'recommended';
      visibilityScore = 85;
    } else if (lowerResponse.includes('compare') || lowerResponse.includes('alternative')) {
      mentionContext = 'compared';
      visibilityScore = 70;
    } else {
      mentionContext = 'mentioned';
      visibilityScore = 50;
    }
    
    // Adjust score based on position
    if (mentionPosition === 1) {
      visibilityScore += 15;
    } else if (mentionPosition === 2) {
      visibilityScore += 5;
    }
    
    visibilityScore = Math.min(100, visibilityScore);
  }
  
  // Extract potential competitor mentions
  const competitorsMentioned: string[] = [];
  const commonAppWords = ['fitness', 'finance', 'productivity', 'social', 'game', 'music', 'photo'];
  
  // Simple competitor detection (could be enhanced with ML)
  const words = responseText.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i].toLowerCase();
    const nextWord = words[i + 1]?.toLowerCase();
    
    if ((word.endsWith('app') || nextWord === 'app') && word !== lowerTargetApp) {
      competitorsMentioned.push(words[i]);
    }
  }
  
  // Calculate sentiment score (simplified)
  const positiveWords = ['best', 'great', 'excellent', 'recommend', 'top', 'reliable', 'popular'];
  const negativeWords = ['bad', 'poor', 'avoid', 'terrible', 'issues', 'problems'];
  
  let sentimentScore = 0;
  positiveWords.forEach(word => {
    if (lowerResponse.includes(word)) sentimentScore += 0.2;
  });
  negativeWords.forEach(word => {
    if (lowerResponse.includes(word)) sentimentScore -= 0.3;
  });
  
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
  
  return {
    appMentioned,
    mentionPosition,
    mentionContext,
    competitorsMentioned: [...new Set(competitorsMentioned)].slice(0, 5), // Remove duplicates, limit to 5
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    visibilityScore: Math.round(visibilityScore)
  };
}