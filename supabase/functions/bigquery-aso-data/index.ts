import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BigQueryCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface BigQueryRow {
  f: Array<{ v: string | null }>;
}

const log = (requestId: string, message: string, extra?: unknown) => {
  if (extra !== undefined) {
    console.log(`[bigquery-aso-data][${requestId}] ${message}`, extra);
  } else {
    console.log(`[bigquery-aso-data][${requestId}] ${message}`);
  }
};

async function getGoogleOAuthToken(credentials: BigQueryCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const encoder = new TextEncoder();
  const privateKey = credentials.private_key.replace(/-----.* PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const binaryKey = Uint8Array.from(atob(privateKey), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const encodeSegment = (data: Record<string, unknown>) =>
    btoa(JSON.stringify(data)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerEncoded = encodeSegment(header);
  const payloadEncoded = encodeSegment(payload);
  const content = `${headerEncoded}.${payloadEncoded}`;

  const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(content));
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${content}.${signature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Failed to obtain Google OAuth token: ${text}`);
  }

  const tokenJson = await tokenResponse.json();
  return tokenJson.access_token as string;
}

function mapBigQueryRows(rows: BigQueryRow[] | undefined) {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((row) => {
    const [date, appId, impressions, productPageViews, downloads, conversionRate] = row.f;
    return {
      date: date?.v ?? null,
      app_id: appId?.v ?? null,
      impressions: impressions?.v ? Number(impressions.v) : 0,
      product_page_views: productPageViews?.v ? Number(productPageViews.v) : 0,
      downloads: downloads?.v ? Number(downloads.v) : 0,
      conversion_rate: conversionRate?.v ? Number(conversionRate.v) : 0,
    };
  });
}

function toArrayValues(values: string[]) {
  return values.map((value) => ({ value }));
}

serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    log(requestId, "Invalid JSON payload", error);
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const {
    organization_id: clientOrgId,
    org_id,
    app_ids,
    date_range,
    metrics,
    organizationId: deprecatedOrgId,
    dateRange: deprecatedDateRange,
    selectedApps: deprecatedSelectedApps,
    trafficSources,
  } = body;

  const requestedOrgId = clientOrgId || org_id || deprecatedOrgId || null;
  const requestedAppIds = app_ids || deprecatedSelectedApps || [];
  const requestedDateRange = date_range || deprecatedDateRange || null;

  log(requestId, "Incoming request", {
    requestedOrgId,
    requestedAppCount: Array.isArray(requestedAppIds) ? requestedAppIds.length : 0,
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    log(requestId, "Authentication failed");
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Check for super admin first using RPC
  const { data: isSuperAdmin, error: superAdminError } = await supabaseClient
    .rpc('is_super_admin');
  
  log(requestId, "[AUTH] Super admin check result", { 
    isSuperAdmin, 
    superAdminError: superAdminError?.message,
    userId: user.id,
    userEmail: user.email
  });
  
  let userRole: string;
  let userOrgId: string | null;

  if (isSuperAdmin) {
    log(requestId, "[AUTH] User is super admin - proceeding with admin flow");
    userRole = "SUPER_ADMIN";
    userOrgId = null;
  } else {
    // For non-super admins, get role from user_roles table
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData) {
      log(requestId, "[AUTH] Failed to fetch user role", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    userRole = roleData.role;
    userOrgId = roleData.organization_id;
  }

  let resolvedOrgId: string;
  let scopeSource: string;

  if (userRole?.toUpperCase() === "SUPER_ADMIN" && userOrgId === null) {
    if (!requestedOrgId) {
      log(requestId, "[SCOPE] SUPER_ADMIN missing organization selection");
      return new Response(
        JSON.stringify({
          error: "Platform admin must select an organization",
          hint: "Use the organization picker to select an org",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    resolvedOrgId = requestedOrgId;
    scopeSource = "platform_admin_selection";

    log(requestId, "[PLATFORM_ADMIN] Querying selected org", {
      adminUserId: user.id,
      selectedOrgId: resolvedOrgId,
      timestamp: new Date().toISOString(),
    });
  } else if (userOrgId) {
    resolvedOrgId = userOrgId;
    scopeSource = "user_membership";

    if (requestedOrgId && requestedOrgId !== resolvedOrgId) {
      log(requestId, "[SECURITY] User attempted cross-org access", {
        userId: user.id,
        userOrg: resolvedOrgId,
        attemptedOrg: requestedOrgId,
        timestamp: new Date().toISOString(),
      });
    }

    log(requestId, "[ORG_USER] Querying own org", {
      userId: user.id,
      orgId: resolvedOrgId,
    });
  } else {
    log(requestId, "[AUTH] User has no organization assignment");
    return new Response(
      JSON.stringify({
        error: "User not assigned to organization",
        hint: "Contact admin to assign you to an organization",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: accessData, error: accessError } = await supabaseClient
    .from("org_app_access")
    .select("app_id, attached_at, detached_at")
    .eq("organization_id", resolvedOrgId)
    .is("detached_at", null);

  if (accessError) {
    log(requestId, "[ACCESS] Failed to check app access", accessError);
    return new Response(
      JSON.stringify({ error: "Failed to validate app access", details: accessError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const allowedAppIds = (accessData ?? []).map((item) => item.app_id).filter((id): id is string => Boolean(id));

  log(requestId, "[ACCESS] App access validated", {
    orgId: resolvedOrgId,
    requestedApps: Array.isArray(requestedAppIds) ? requestedAppIds.length : 0,
    allowedApps: allowedAppIds.length,
    apps: allowedAppIds,
  });

  const normalizedRequestedAppIds = Array.isArray(requestedAppIds)
    ? requestedAppIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  const appIdsForQuery = normalizedRequestedAppIds.length > 0
    ? normalizedRequestedAppIds.filter((id) => allowedAppIds.includes(id))
    : allowedAppIds;

  if (appIdsForQuery.length === 0) {
    log(requestId, "[ACCESS] No apps accessible for this org");
    return new Response(
      JSON.stringify({
        data: [],
        scope: {
          organization_id: resolvedOrgId,
          org_id: resolvedOrgId,
          app_ids: [],
          date_range: requestedDateRange,
          scope_source: scopeSource,
        },
        message: "No apps attached to this organization",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!requestedDateRange || (!requestedDateRange.start && !requestedDateRange.from)) {
    log(requestId, "Missing date_range.start");
    return new Response(
      JSON.stringify({ error: "Missing date_range.start" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!requestedDateRange.end && !requestedDateRange.to) {
    log(requestId, "Missing date_range.end");
    return new Response(
      JSON.stringify({ error: "Missing date_range.end" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const startDate = requestedDateRange.start || requestedDateRange.from;
  const endDate = requestedDateRange.end || requestedDateRange.to;

  const credentialString = Deno.env.get("BIGQUERY_CREDENTIALS");
  if (!credentialString) {
    log(requestId, "BIGQUERY_CREDENTIALS env missing");
    return new Response(
      JSON.stringify({ error: "BigQuery credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let credentials: BigQueryCredentials;
  try {
    credentials = JSON.parse(credentialString);
  } catch (error) {
    log(requestId, "Failed to parse BIGQUERY_CREDENTIALS", error);
    return new Response(
      JSON.stringify({ error: "Invalid BigQuery credentials format" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const projectId =
    Deno.env.get("BIGQUERY_PROJECT_ID") ||
    Deno.env.get("GOOGLE_CLOUD_PROJECT") ||
    Deno.env.get("PROJECT_ID") ||
    credentials.project_id;

  if (!projectId) {
    log(requestId, "Unable to resolve BigQuery project ID");
    return new Response(
      JSON.stringify({ error: "BigQuery project ID not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleOAuthToken(credentials);
  } catch (error) {
    log(requestId, "Failed to obtain Google OAuth token", error);
    return new Response(
      JSON.stringify({ error: "Failed to authenticate with BigQuery" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const query = `
    SELECT 
      date,
      COALESCE(app_id, client) AS app_id,
      impressions,
      product_page_views,
      downloads,
      SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
    FROM \`${projectId}.client_reports.aso_all_apple\`
    WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
      AND date BETWEEN @start_date AND @end_date
    ORDER BY date DESC
  `;

  log(requestId, "[BIGQUERY] Executing query", {
    orgId: resolvedOrgId,
    appCount: appIdsForQuery.length,
    dateRange: { start: startDate, end: endDate },
  });

  const queryRequest = {
    query,
    useLegacySql: false,
    parameterMode: "NAMED",
    queryParameters: [
      {
        name: "app_ids",
        parameterType: { type: "ARRAY", arrayType: { type: "STRING" } },
        parameterValue: { arrayValues: toArrayValues(appIdsForQuery) },
      },
      {
        name: "start_date",
        parameterType: { type: "DATE" },
        parameterValue: { value: startDate },
      },
      {
        name: "end_date",
        parameterType: { type: "DATE" },
        parameterValue: { value: endDate },
      },
    ],
  };

  const bqResponse = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(queryRequest),
  });

  if (!bqResponse.ok) {
    const errorText = await bqResponse.text();
    log(requestId, "[BIGQUERY] Query failed", errorText);
    return new Response(
      JSON.stringify({ error: "BigQuery query failed", details: errorText }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const bqJson = await bqResponse.json();
  const rows = mapBigQueryRows(bqJson.rows);

  log(requestId, "[BIGQUERY] Query completed", {
    rowCount: rows.length,
    firstRow: rows[0] || null,
  });

  const responsePayload = {
    data: rows,
    scope: {
      organization_id: resolvedOrgId,
      org_id: resolvedOrgId,
      app_ids: appIdsForQuery,
      date_range: { start: startDate, end: endDate },
      scope_source: scopeSource,
      metrics: metrics || null,
      traffic_sources: trafficSources || null,
    },
    meta: {
      timestamp: new Date().toISOString(),
      row_count: rows.length,
      query_duration_ms: Math.round(performance.now() - startTime),
    },
  };

  return new Response(
    JSON.stringify(responsePayload),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
