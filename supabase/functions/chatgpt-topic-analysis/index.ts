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

interface TopicQueryRequest {
  queryId: string;
  queryText: string;
  auditRunId: string;
  organizationId: string;
  targetTopic: string;
}

interface TopicVisibilityAnalysis {
  topicMentioned: boolean;
  mentionPosition?: number;
  mentionContext: string;
  relatedEntitiesMentioned: string[];
  sentimentScore: number;
  visibilityScore: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { queryId, queryText, auditRunId, organizationId, targetTopic }: TopicQueryRequest = await req.json();

    console.log(`[Topic Analysis] Processing query: ${queryText}`);
    console.log(`[Topic Analysis] Target topic: ${targetTopic}`);

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
            content: 'You are a helpful assistant that provides recommendations and information. Be specific and mention actual brands, services, or solutions when possible. Provide clear, practical recommendations.' 
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

    console.log(`[Topic Analysis] Response received: ${responseText.substring(0, 200)}...`);

    // Analyze topic visibility in response
    const analysis = analyzeTopicVisibility(responseText, targetTopic);

    console.log(`[Topic Analysis] Visibility analysis: Topic mentioned: ${analysis.topicMentioned}, Position: ${analysis.mentionPosition}, Score: ${analysis.visibilityScore}`);

    // Store results in database
    const { error: insertError } = await supabase
      .from('chatgpt_query_results')
      .insert({
        organization_id: organizationId,
        query_id: queryId,
        audit_run_id: auditRunId,
        response_text: responseText,
        app_mentioned: analysis.topicMentioned, // Reusing app_mentioned field for topic
        mention_position: analysis.mentionPosition,
        mention_context: analysis.mentionContext,
        competitors_mentioned: analysis.relatedEntitiesMentioned,
        sentiment_score: analysis.sentimentScore,
        visibility_score: analysis.visibilityScore,
        raw_response: data,
        tokens_used: tokensUsed,
        cost_cents: costCents,
        analysis_type: 'topic' // Flag to distinguish from app analysis
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

    console.log(`[Topic Analysis] Query ${queryId} completed successfully`);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      tokensUsed,
      costCents
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Topic Analysis] Error:', error);

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

function analyzeTopicVisibility(responseText: string, targetTopic: string): TopicVisibilityAnalysis {
  const lowerResponse = responseText.toLowerCase();
  const lowerTargetTopic = targetTopic.toLowerCase();
  
  // Check if topic or related terms are mentioned
  const topicWords = lowerTargetTopic.split(' ');
  const topicMentioned = topicWords.some(word => 
    lowerResponse.includes(word) && word.length > 2 // Avoid very short words
  ) || lowerResponse.includes(lowerTargetTopic);
  
  let mentionPosition: number | undefined;
  let mentionContext = 'not_mentioned';
  let visibilityScore = 0;
  
  if (topicMentioned) {
    // Find position of mention (simplified - first occurrence)
    const sentences = responseText.split(/[.!?]+/);
    mentionPosition = sentences.findIndex(sentence => 
      sentence.toLowerCase().includes(lowerTargetTopic) ||
      topicWords.some(word => sentence.toLowerCase().includes(word))
    ) + 1;
    
    if (mentionPosition === 0) mentionPosition = 1;
    
    // Determine context
    if (lowerResponse.includes('recommend') || lowerResponse.includes('suggest') || lowerResponse.includes('best')) {
      mentionContext = 'recommended';
      visibilityScore = 85;
    } else if (lowerResponse.includes('compare') || lowerResponse.includes('alternative') || lowerResponse.includes('option')) {
      mentionContext = 'compared';
      visibilityScore = 70;
    } else if (lowerResponse.includes('mention') || lowerResponse.includes('include')) {
      mentionContext = 'mentioned';
      visibilityScore = 50;
    } else {
      mentionContext = 'referenced';
      visibilityScore = 40;
    }
    
    // Adjust score based on position
    if (mentionPosition === 1) {
      visibilityScore += 15;
    } else if (mentionPosition === 2) {
      visibilityScore += 5;
    }
    
    visibilityScore = Math.min(100, visibilityScore);
  }
  
  // Extract related entities/brands mentioned
  const relatedEntities = extractRelatedEntities(responseText, targetTopic);
  
  // Calculate sentiment score
  const positiveWords = ['best', 'great', 'excellent', 'recommend', 'top', 'reliable', 'popular', 'effective', 'useful'];
  const negativeWords = ['bad', 'poor', 'avoid', 'terrible', 'issues', 'problems', 'difficult', 'limited'];
  
  let sentimentScore = 0;
  positiveWords.forEach(word => {
    if (lowerResponse.includes(word)) sentimentScore += 0.15;
  });
  negativeWords.forEach(word => {
    if (lowerResponse.includes(word)) sentimentScore -= 0.25;
  });
  
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
  
  return {
    topicMentioned,
    mentionPosition,
    mentionContext,
    relatedEntitiesMentioned: [...new Set(relatedEntities)].slice(0, 5),
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    visibilityScore: Math.round(visibilityScore)
  };
}

function extractRelatedEntities(responseText: string, targetTopic: string): string[] {
  const entities: string[] = [];
  
  // Common patterns for brand/service names
  const brandPatterns = [
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]*)*\b/g, // Capitalized words/phrases
    /\b\w+\.com\b/g, // Website mentions
    /\b\w+\.ai\b/g, // AI service mentions
  ];
  
  brandPatterns.forEach(pattern => {
    const matches = responseText.match(pattern) || [];
    entities.push(...matches);
  });
  
  // Filter out common words and the target topic itself
  const commonWords = ['The', 'This', 'That', 'Here', 'There', 'When', 'Where', 'Why', 'How', 'What', 'Which', 'Who'];
  const filtered = entities.filter(entity => 
    !commonWords.includes(entity) &&
    !targetTopic.toLowerCase().includes(entity.toLowerCase()) &&
    entity.length > 2
  );
  
  return filtered;
}