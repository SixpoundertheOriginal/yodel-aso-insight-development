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
  
  // Enhanced context data
  topicData?: {
    topic: string;
    industry: string;
    target_audience: string;
    context_description?: string;
    known_players: string[];
    entityToTrack?: string;
    entityAliases?: string[];
  };
  
  // Legacy fields (for backward compatibility)
  entityToTrack?: string;
  entityAliases?: string[];
}

interface TopicVisibilityAnalysis {
  topicMentioned: boolean;
  mentionPosition?: number;
  mentionContext: string;
  relatedEntitiesMentioned: string[];
  sentimentScore: number;
  visibilityScore: number;
  
  // NEW - Entity-specific analysis
  entityAnalysis?: EntityAnalysis;
}

interface EntityAnalysis {
  entityMentioned: boolean;
  mentionCount: number;
  mentionContexts: string[]; // Sentences where entity was mentioned
  entityPosition?: number; // Position in recommendation list (if applicable)
  sentiment: 'positive' | 'neutral' | 'negative';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    console.group(`🚀 ChatGPT Topic Analysis - Request ${requestId}`);
    console.log('Request received at:', timestamp);
    
    // 🔍 Environment Validation
    console.group('🔍 Environment Validation');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
      openaiKeyPresent: !!openaiKey,
      openaiKeyFormat: openaiKey?.startsWith('sk-') ? 'Valid format' : 'Invalid/missing',
      timestamp
    });
    console.groupEnd();

    // 🔍 Request Payload Validation
    const requestBody = await req.json();
    const { queryId, queryText, auditRunId, organizationId, targetTopic, topicData }: TopicQueryRequest = requestBody;
    
    // Extract entity tracking data from topicData
    const entityToTrack = topicData?.entityToTrack || null;
    const entityAliases = topicData?.entityAliases || [];
    
    console.group('🔍 Request Payload Validation');
    console.log('Raw request body:', requestBody);
    console.log('Extracted parameters:', {
      queryId: queryId || 'MISSING',
      queryText: queryText ? `${queryText.substring(0, 50)}...` : 'MISSING',
      auditRunId: auditRunId || 'MISSING',
      organizationId: organizationId || 'MISSING',
      targetTopic: targetTopic || 'MISSING',
      entityToTrack: entityToTrack || 'NOT_PROVIDED',
      entityAliases: entityAliases.length > 0 ? `${entityAliases.length} aliases` : 'NOT_PROVIDED'
    });

    // Validate required parameters
    const missingParams = [];
    if (!queryId) missingParams.push('queryId');
    if (!queryText) missingParams.push('queryText');
    if (!auditRunId) missingParams.push('auditRunId');
    if (!organizationId) missingParams.push('organizationId');
    if (!targetTopic) missingParams.push('targetTopic');

    if (missingParams.length > 0) {
      console.error('❌ Missing required parameters:', missingParams);
      console.groupEnd();
      console.groupEnd();
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters', 
          missing: missingParams,
          requestId 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    console.groupEnd();

    // 🤖 OpenAI API Call with Enhanced Logging
    console.group('🤖 OpenAI API Call');
    
    const openaiRequest = {
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
    };

    console.log('OpenAI request details:', {
      model: openaiRequest.model,
      messageCount: openaiRequest.messages.length,
      systemPromptLength: openaiRequest.messages[0].content.length,
      userPromptLength: queryText.length,
      maxTokens: openaiRequest.max_tokens,
      temperature: openaiRequest.temperature
    });

    const openaiStartTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiRequest)
    });

    const openaiDuration = Date.now() - openaiStartTime;
    console.log('OpenAI API Response:', {
      status: response.status,
      statusText: response.statusText,
      duration: `${openaiDuration}ms`,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error Response:', errorText);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { raw_error: errorText };
      }
      
      console.groupEnd();
      console.groupEnd();
      throw new Error(`OpenAI API Error ${response.status}: ${JSON.stringify(errorDetails)}`);
    }

    const data = await response.json();
    console.log('OpenAI response data:', {
      hasChoices: !!data.choices?.length,
      tokensUsed: data.usage?.total_tokens,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      model: data.model
    });
    console.groupEnd();

    const responseText = data.choices[0].message.content;
    const tokensUsed = data.usage?.total_tokens || 0;
    const costCents = Math.round((tokensUsed / 1000) * 0.2); // Rough cost calculation

    // 🔍 Topic Visibility Analysis
    console.group('🔍 Topic Visibility Analysis');
    console.log('Analyzing response for topic:', targetTopic);
    console.log('Entity tracking enabled:', !!entityToTrack);
    console.log('Response text length:', responseText.length);
    
    const analysis = analyzeTopicVisibility(responseText, targetTopic, entityToTrack, entityAliases);
    console.log('Analysis result:', analysis);
    console.groupEnd();

    // 💾 Database Storage with Enhanced Logging
    console.group('💾 Database Storage');
    const insertData = {
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
      analysis_type: 'topic', // Flag to distinguish from app analysis
      entity_analysis: analysis.entityAnalysis // Store enhanced entity detection results
    };

    console.log('Database insert payload:', {
      organization_id: organizationId,
      query_id: queryId,
      audit_run_id: auditRunId,
      response_text_length: responseText.length,
      analysis_type: 'topic',
      tokens_used: tokensUsed,
      cost_cents: costCents
    });

    const dbStartTime = Date.now();
    const { error: insertError } = await supabase
      .from('chatgpt_query_results')
      .insert(insertData);

    const dbDuration = Date.now() - dbStartTime;
    console.log('Database operation result:', {
      duration: `${dbDuration}ms`,
      hasError: !!insertError,
      errorMessage: insertError?.message
    });

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      console.groupEnd();
      console.groupEnd();
      throw new Error(`Database insert error: ${insertError.message}`);
    }
    console.groupEnd();

    // Update query status
    console.log(`[Topic Analysis] Updating query status to completed...`);
    const { error: updateError } = await supabase
      .from('chatgpt_queries')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', queryId);

    if (updateError) {
      console.error(`[Topic Analysis] Error updating query status:`, updateError);
      // Don't throw here, as the main processing was successful
    } else {
      console.log(`[Topic Analysis] Query status updated successfully`);
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

    const totalDuration = Date.now() - Date.parse(timestamp);
    console.log(`✅ Analysis completed successfully in ${totalDuration}ms`);
    console.groupEnd();

    return new Response(JSON.stringify({
      success: true,
      analysis,
      tokensUsed,
      costCents,
      requestId,
      duration: totalDuration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`💥 ChatGPT Topic Analysis Error [${requestId}]:`, error);
    console.groupEnd();

    // Try to get the queryId from the request if available
    let queryId;
    try {
      const body = await req.clone().json();
      queryId = body.queryId;
    } catch {
      // If we can't parse the request, we can't update the query status
      console.log('[Topic Analysis] Could not parse request to get queryId for error handling');
    }
    
    // Update query status to failed if we have a queryId
    if (queryId) {
      console.log(`[Topic Analysis] Updating query ${queryId} status to failed`);
      await supabase
        .from('chatgpt_queries')
        .update({ 
          status: 'failed',
          processed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', queryId);
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      details: error.stack,
      requestId,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeTopicVisibility(responseText: string, targetTopic: string, entityToTrack?: string, entityAliases?: string[]): TopicVisibilityAnalysis {
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
  
  // Enhanced entity analysis with context validation
  let entityAnalysis: EntityAnalysis | undefined;
  if (entityToTrack) {
    entityAnalysis = analyzeEntityMentions(responseText, entityToTrack, entityAliases || []);
  }
  
  return {
    topicMentioned,
    mentionPosition,
    mentionContext,
    relatedEntitiesMentioned: [...new Set(relatedEntities)].slice(0, 5),
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    visibilityScore: Math.round(visibilityScore),
    entityAnalysis
  };
}

// Enhanced entity analysis with industry context validation
function analyzeEntityMentions(
  responseText: string, 
  entityName: string, 
  entityAliases: string[],
  topicData?: any
): EntityAnalysis {
  console.log(`    🔍 Analyzing entity mentions for: ${entityName}`);
  
  const lowerResponse = responseText.toLowerCase();
  const lowerEntityName = entityName.toLowerCase();
  const allEntityNames = [lowerEntityName, ...entityAliases.map(alias => alias.toLowerCase())];
  
  console.log(`    📋 Checking entity variations:`, allEntityNames);
  
  let mentionCount = 0;
  const mentionContexts: string[] = [];
  let entityPosition: number | undefined;
  
  // Count mentions of entity and aliases with word boundary matching
  allEntityNames.forEach(entityVariant => {
    const regex = new RegExp(`\\b${entityVariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = responseText.match(regex);
    if (matches) {
      mentionCount += matches.length;
    }
  });
  
  // Extract mention contexts (sentences containing the entity)
  const sentences = responseText.split(/[.!?]+/).filter(s => s.trim());
  sentences.forEach((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    const isEntityMentioned = allEntityNames.some(entityVariant => {
      const entityRegex = new RegExp(`\\b${entityVariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return entityRegex.test(lowerSentence);
    });
    
    if (isEntityMentioned) {
      mentionContexts.push(sentence.trim());
      
      // Try to determine position if this appears to be a ranked list
      if (entityPosition === undefined) {
        const positionMatch = sentence.match(/^(\d+)[\.)]/);
        if (positionMatch) {
          entityPosition = parseInt(positionMatch[1]);
        } else if (index === 0) {
          entityPosition = 1; // First mention
        }
      }
    }
  });
  
  // Industry context validation if available
  let industryRelevance = 1.0; // Default to relevant
  if (topicData?.industry && mentionCount > 0) {
    industryRelevance = calculateIndustryRelevance(responseText, topicData.industry);
    console.log(`    🏢 Industry relevance for ${topicData.industry}:`, industryRelevance);
  }
  
  // Determine sentiment specifically for entity mentions
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  const entityMentionText = mentionContexts.join(' ').toLowerCase();
  
  if (entityMentionText) {
    const positiveIndicators = ['recommend', 'best', 'great', 'excellent', 'top', 'good', 'effective', 'reliable'];
    const negativeIndicators = ['avoid', 'bad', 'poor', 'terrible', 'issues', 'problems', 'limited', 'difficult'];
    
    const positiveCount = positiveIndicators.filter(word => entityMentionText.includes(word)).length;
    const negativeCount = negativeIndicators.filter(word => entityMentionText.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    }
  }
  
  console.log(`    📊 Entity analysis result:`, {
    entityMentioned: mentionCount > 0,
    mentionCount,
    mentionContexts: mentionContexts.slice(0, 3), // Limit for logging
    entityPosition,
    sentiment,
    industryRelevance
  });
  
  return {
    entityMentioned: mentionCount > 0,
    mentionCount,
    mentionContexts: mentionContexts.slice(0, 3), // Keep top 3 contexts
    entityPosition,
    sentiment
  };
}

// Industry context validation
function calculateIndustryRelevance(responseText: string, industry: string): number {
  const lowerResponse = responseText.toLowerCase();
  const industryKeywords = getIndustryKeywords(industry);
  
  let relevanceScore = 0;
  for (const keyword of industryKeywords) {
    if (lowerResponse.includes(keyword.toLowerCase())) {
      relevanceScore += 1;
    }
  }
  
  // Normalize score (0-1)
  return Math.min(relevanceScore / Math.max(industryKeywords.length, 1), 1.0);
}

function getIndustryKeywords(industry: string): string[] {
  const industryKeywords: Record<string, string[]> = {
    'ASO/Marketing': ['app store optimization', 'ASO', 'mobile marketing', 'app marketing', 'keyword optimization', 'app store', 'mobile app'],
    'SaaS': ['software as a service', 'SaaS', 'cloud software', 'subscription software', 'software platform'],
    'E-commerce': ['online store', 'e-commerce', 'retail', 'shopping platform', 'marketplace', 'ecommerce'],
    'Enterprise Software': ['enterprise', 'business software', 'corporate', 'organization', 'business'],
    'Mobile Apps': ['mobile app', 'iOS', 'Android', 'smartphone', 'app store', 'mobile'],
    'Marketing': ['marketing', 'advertising', 'digital marketing', 'campaign', 'promotion'],
    'Technology': ['technology', 'tech', 'software', 'platform', 'solution']
  };
  
  return industryKeywords[industry] || industryKeywords['Technology'] || [];
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