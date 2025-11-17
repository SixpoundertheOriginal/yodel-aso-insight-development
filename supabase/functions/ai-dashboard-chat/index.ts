import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EncryptionService } from "../_shared/encryption.service.ts";

// ============================================
// CORS Headers
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Type Definitions
// ============================================

interface DashboardContext {
  dateRange: { start: string; end: string };
  appIds: string[];
  trafficSources: string[];
  kpiSummary: {
    impressions: number;
    downloads: number;
    cvr: number;
    product_page_views: number;
  };
}

interface ChatSession {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  context_type: string;
  context_snapshot: any;
  created_at: string;
  updated_at: string;
  expires_at: string;
  is_pinned: boolean;
}

interface ChatMessage {
  id: string;
  session_id: string;
  organization_id: string;
  role: 'user' | 'assistant' | 'system';
  content_encrypted: string;
  encryption_version: number;
  token_count?: number;
  model?: string;
  created_at: string;
}

interface RateLimitConfig {
  messages_per_user_per_day: number;
  max_active_sessions_per_user: number;
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Extract and validate JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[ai-dashboard-chat] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Get organization_id from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      console.error('[ai-dashboard-chat] Failed to fetch user organization:', roleError);
      throw new Error('User not assigned to an organization');
    }

    const organizationId = roleData.organization_id;
    console.log(`[ai-dashboard-chat] Request from user ${user.id} in org ${organizationId}`);

    // 2. Parse request body
    const body = await req.json();
    const { action } = body;

    console.log(`[ai-dashboard-chat] Action: ${action}`);

    // 3. Route to appropriate handler
    switch (action) {
      case 'validate_encryption':
        return await handleValidateEncryption();

      case 'create_session':
        return await handleCreateSession(supabase, user, organizationId, body.dashboardContext);

      case 'list_sessions':
        return await handleListSessions(supabase, user, organizationId);

      case 'get_session':
        return await handleGetSession(supabase, user, organizationId, body.sessionId);

      case 'send_message':
        return await handleSendMessage(
          supabase,
          user,
          organizationId,
          body.sessionId,
          body.message,
          body.dashboardContext
        );

      case 'pin_session':
        return await handlePinSession(supabase, user, organizationId, body.sessionId, body.isPinned);

      case 'update_session_title':
        return await handleUpdateSessionTitle(supabase, user, organizationId, body.sessionId, body.title);

      case 'delete_session':
        return await handleDeleteSession(supabase, user, organizationId, body.sessionId);

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[ai-dashboard-chat] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================
// Handler: Validate Encryption
// ============================================

async function handleValidateEncryption() {
  try {
    const isValid = await EncryptionService.validateSetup();
    return new Response(
      JSON.stringify({
        success: isValid,
        message: isValid ? 'Encryption validated successfully' : 'Encryption validation failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

// ============================================
// Handler: Create Session
// ============================================

async function handleCreateSession(
  supabase: SupabaseClient,
  user: any,
  organizationId: string,
  context: DashboardContext
) {
  console.log('[ai-dashboard-chat] Creating new session');

  // Check max active sessions limit
  const rateLimits = await getRateLimits(supabase, organizationId);
  const { data: activeSessionCount } = await supabase
    .rpc('get_user_active_session_count', { p_user_id: user.id });

  if (activeSessionCount && activeSessionCount >= rateLimits.max_active_sessions_per_user) {
    throw new Error(
      `Maximum active sessions reached (${rateLimits.max_active_sessions_per_user}). ` +
      `Please delete or wait for old sessions to expire.`
    );
  }

  // Auto-generate title from context
  const title = generateSessionTitle(context);

  const { data: session, error } = await supabase
    .from('chat_sessions')
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      title,
      context_type: 'dashboard_analytics',
      context_snapshot: context,
    })
    .select()
    .single();

  if (error) {
    console.error('[ai-dashboard-chat] Session creation error:', error);
    throw new Error(`Failed to create session: ${error.message}`);
  }

  console.log(`[ai-dashboard-chat] Session created: ${session.id}`);

  return new Response(
    JSON.stringify({ session }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Handler: List Sessions
// ============================================

async function handleListSessions(
  supabase: SupabaseClient,
  user: any,
  organizationId: string
) {
  console.log('[ai-dashboard-chat] Listing sessions');

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at, is_pinned, expires_at')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .or('expires_at.gt.now(),is_pinned.eq.true') // Active or pinned
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[ai-dashboard-chat] List sessions error:', error);
    throw new Error(`Failed to list sessions: ${error.message}`);
  }

  console.log(`[ai-dashboard-chat] Found ${sessions?.length || 0} sessions`);

  return new Response(
    JSON.stringify({ sessions: sessions || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Handler: Get Session (with decrypted messages)
// ============================================

async function handleGetSession(
  supabase: SupabaseClient,
  user: any,
  organizationId: string,
  sessionId: string
) {
  console.log(`[ai-dashboard-chat] Getting session ${sessionId}`);

  // 1. Fetch session
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single();

  if (sessionError) {
    console.error('[ai-dashboard-chat] Session fetch error:', sessionError);
    throw new Error('Session not found or unauthorized');
  }

  // 2. Fetch messages
  const { data: encryptedMessages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('id, role, content_encrypted, created_at, token_count, model')
    .eq('session_id', sessionId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('[ai-dashboard-chat] Messages fetch error:', messagesError);
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }

  // 3. Decrypt messages
  const messages = await Promise.all(
    (encryptedMessages || []).map(async (msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: await EncryptionService.decrypt(msg.content_encrypted),
      timestamp: msg.created_at,
      token_count: msg.token_count,
      model: msg.model,
    }))
  );

  console.log(`[ai-dashboard-chat] Decrypted ${messages.length} messages`);

  return new Response(
    JSON.stringify({ session, messages }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Handler: Send Message
// ============================================

async function handleSendMessage(
  supabase: SupabaseClient,
  user: any,
  organizationId: string,
  sessionId: string,
  userMessage: string,
  dashboardContext: DashboardContext
) {
  console.log(`[ai-dashboard-chat] Sending message to session ${sessionId}`);

  // 1. Check rate limit
  const rateLimits = await getRateLimits(supabase, organizationId);
  const { data: messageCount } = await supabase
    .rpc('get_user_message_count_today', { p_user_id: user.id });

  if (messageCount && messageCount >= rateLimits.messages_per_user_per_day) {
    throw new Error(
      `Daily message limit reached (${rateLimits.messages_per_user_per_day}). ` +
      `Please try again tomorrow.`
    );
  }

  // 2. Validate session ownership
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single();

  if (sessionError) {
    console.error('[ai-dashboard-chat] Session validation error:', sessionError);
    throw new Error('Session not found or unauthorized');
  }

  // 3. Fetch conversation history (last 10 messages for context)
  const { data: encryptedHistory, error: historyError } = await supabase
    .from('chat_messages')
    .select('role, content_encrypted')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(10);

  if (historyError) {
    console.error('[ai-dashboard-chat] History fetch error:', historyError);
    throw new Error(`Failed to fetch conversation history: ${historyError.message}`);
  }

  // Decrypt conversation history
  const conversationHistory = await Promise.all(
    (encryptedHistory || []).map(async (msg: any) => ({
      role: msg.role,
      content: await EncryptionService.decrypt(msg.content_encrypted),
    }))
  );

  console.log(`[ai-dashboard-chat] Loaded ${conversationHistory.length} historical messages`);

  // 4. Build analytics context (sanitized)
  const analyticsContext = buildAnalyticsContext(dashboardContext);

  // 5. Call OpenAI API
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = buildDashboardChatSystemPrompt(analyticsContext);

  console.log('[ai-dashboard-chat] Calling OpenAI API');

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
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ai-dashboard-chat] OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const aiData = await response.json();
  const assistantMessage = aiData.choices?.[0]?.message?.content || 'No response generated';
  const tokenCount = aiData.usage?.total_tokens || 0;

  console.log(`[ai-dashboard-chat] OpenAI response received (${tokenCount} tokens)`);

  // 6. Encrypt messages
  const encryptedUserMsg = await EncryptionService.encrypt(userMessage);
  const encryptedAssistantMsg = await EncryptionService.encrypt(assistantMessage);

  // 7. Store messages in database
  const { error: insertError } = await supabase
    .from('chat_messages')
    .insert([
      {
        session_id: sessionId,
        organization_id: organizationId,
        role: 'user',
        content_encrypted: encryptedUserMsg,
        encryption_version: 1,
      },
      {
        session_id: sessionId,
        organization_id: organizationId,
        role: 'assistant',
        content_encrypted: encryptedAssistantMsg,
        encryption_version: 1,
        token_count: tokenCount,
        model: 'gpt-4o-mini',
      }
    ]);

  if (insertError) {
    console.error('[ai-dashboard-chat] Message insert error:', insertError);
    throw new Error(`Failed to store messages: ${insertError.message}`);
  }

  // 8. Update session timestamp (handled by trigger, but double-check)
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  console.log('[ai-dashboard-chat] Messages stored successfully');

  return new Response(
    JSON.stringify({
      message: assistantMessage,
      tokenCount
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Handler: Pin/Unpin Session
// ============================================

async function handlePinSession(
  supabase: SupabaseClient,
  user: any,
  organizationId: string,
  sessionId: string,
  isPinned: boolean
) {
  console.log(`[ai-dashboard-chat] ${isPinned ? 'Pinning' : 'Unpinning'} session ${sessionId}`);

  const { error } = await supabase
    .from('chat_sessions')
    .update({
      is_pinned: isPinned,
      pinned_at: isPinned ? new Date().toISOString() : null,
      pinned_by: isPinned ? user.id : null,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[ai-dashboard-chat] Pin session error:', error);
    throw new Error(`Failed to update session: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, isPinned }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Handler: Update Session Title
// ============================================

async function handleUpdateSessionTitle(
  supabase: SupabaseClient,
  user: any,
  organizationId: string,
  sessionId: string,
  title: string
) {
  console.log(`[ai-dashboard-chat] Updating session title: ${sessionId}`);

  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[ai-dashboard-chat] Update title error:', error);
    throw new Error(`Failed to update title: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Handler: Delete Session
// ============================================

async function handleDeleteSession(
  supabase: SupabaseClient,
  user: any,
  organizationId: string,
  sessionId: string
) {
  console.log(`[ai-dashboard-chat] Deleting session ${sessionId}`);

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[ai-dashboard-chat] Delete session error:', error);
    throw new Error(`Failed to delete session: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================
// Helper: Get Rate Limits
// ============================================

async function getRateLimits(
  supabase: SupabaseClient,
  organizationId: string
): Promise<RateLimitConfig> {
  // Try to fetch org-specific rate limits
  const { data: orgLimits } = await supabase
    .from('chat_rate_limits')
    .select('messages_per_user_per_day, max_active_sessions_per_user')
    .eq('organization_id', organizationId)
    .single();

  if (orgLimits) {
    return orgLimits;
  }

  // Fall back to global defaults
  const { data: globalLimits } = await supabase
    .from('chat_rate_limits')
    .select('messages_per_user_per_day, max_active_sessions_per_user')
    .is('organization_id', null)
    .single();

  if (globalLimits) {
    return globalLimits;
  }

  // Hard-coded fallback
  return {
    messages_per_user_per_day: 50,
    max_active_sessions_per_user: 10,
  };
}

// ============================================
// Helper: Build Analytics Context
// ============================================

function buildAnalyticsContext(context: DashboardContext): string {
  const { dateRange, appIds, trafficSources, kpiSummary } = context;

  // Sanitize app IDs to generic labels
  const appLabels = appIds?.map((id, idx) => `App ${idx + 1}`) || ['the selected app'];

  return `
**Dashboard Context:**
- Date Range: ${dateRange?.start || 'N/A'} to ${dateRange?.end || 'N/A'}
- Apps: ${appLabels.join(', ')} (${appIds?.length || 0} total)
- Traffic Sources: ${trafficSources?.join(', ') || 'All sources'}

**KPI Summary:**
- Total Impressions: ${kpiSummary?.impressions?.toLocaleString() || 'N/A'}
- Total Downloads: ${kpiSummary?.downloads?.toLocaleString() || 'N/A'}
- Conversion Rate: ${kpiSummary?.cvr?.toFixed(2) || 'N/A'}%
- Product Page Views: ${kpiSummary?.product_page_views?.toLocaleString() || 'N/A'}
`;
}

// ============================================
// Helper: Build System Prompt
// ============================================

function buildDashboardChatSystemPrompt(analyticsContext: string): string {
  return `You are an ASO (App Store Optimization) analytics assistant embedded in the Yodel ASO Insights Dashboard.

**Your Role:**
- Help users understand their dashboard analytics (impressions, downloads, CVR, traffic sources)
- Provide actionable insights and recommendations based on the data
- Explain trends, anomalies, and optimization opportunities
- Suggest next steps for improving ASO performance

**Critical Privacy Rule:**
- NEVER mention specific app names or client names
- Always refer to apps as "the selected app", "App 1", "App 2", or "this client"
- Use generic language: "your app" instead of real names

**Dashboard Context (Current View):**
${analyticsContext}

**Response Style:**
- Concise and actionable (2-4 sentences for simple questions)
- Use bullet points for recommendations
- Reference specific metrics from the dashboard context
- Suggest relevant filters or date ranges to explore

**Example Responses:**
- "Your selected app shows strong Search traffic (60% of impressions) with a CVR of 3.2%, which is above industry average. Consider optimizing your Browse presence to capture additional installs."
- "The 15% drop in downloads between the two periods suggests either keyword ranking changes or seasonal effects. I recommend checking your keyword positions and competitor activity."

**ASO Best Practices to Reference:**
- Search CVR benchmarks: 2-5% typical, 5%+ excellent
- Browse CVR typically lower: 1-3%
- Product page views indicate consideration, but low CVR suggests creative/metadata issues
- Traffic source balance: 60/40 Search/Browse is healthy
- Seasonal patterns: Gaming peaks Q4, productivity peaks Q1

Provide helpful, data-driven guidance while maintaining user privacy.`;
}

// ============================================
// Helper: Generate Session Title
// ============================================

function generateSessionTitle(context: DashboardContext): string {
  const { dateRange, appIds } = context;

  const appCount = appIds?.length || 0;
  const appText = appCount === 1 ? '1 app' : `${appCount} apps`;

  if (dateRange?.start && dateRange?.end) {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${appText} - ${monthNames[start.getMonth()]} ${start.getDate()}-${end.getDate()}`;
  }

  return `Chat - ${appText}`;
}
