import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Query information_schema to get table structure
    const { data: columns, error: colError } = await supabaseAdmin
      .from("information_schema.columns")
      .select("*")
      .eq("table_schema", "public")
      .eq("table_name", "profiles");

    // Query pg_constraint for constraints
    const { data: rawConstraints, error: constError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'profiles';
      `
    });

    // Check for triggers
    const { data: triggers } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        SELECT
          t.tgname as trigger_name,
          p.proname as function_name,
          pg_get_triggerdef(t.oid) as trigger_definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        LEFT JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'auth'
          AND c.relname = 'users'
          AND NOT t.tgisinternal;
      `
    });

    return new Response(
      JSON.stringify({
        success: true,
        profiles_columns: columns,
        profiles_constraints: rawConstraints,
        auth_users_triggers: triggers,
      }),
      { status: 200, headers: cors }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        note: "This function requires exec_sql RPC function to exist"
      }),
      { status: 500, headers: cors }
    );
  }
});
