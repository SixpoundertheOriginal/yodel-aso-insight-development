import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const TARGET_ORG = "Yodel Mobile";
  const ADMIN_EMAIL = "eddie@yodelmobile.com";
  const ADMIN_PASSWORD = "StrongPassword123!"; // Replace for prod

  try {
    // 1️⃣ Ensure organization exists
    const { data: orgData, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("name", TARGET_ORG)
      .single();

    let org = orgData;

    if (orgErr && orgErr.code === "PGRST116") {
      // Not found — create
      const { data: newOrg, error: createErr } = await supabase
        .from("organizations")
        .insert({ name: TARGET_ORG })
        .select()
        .single();

      if (createErr) throw createErr;
      org = newOrg;
    } else if (orgErr) {
      throw orgErr;
    }

    // 2️⃣ Create admin user if not exists
    const { data: userResult, error: userErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (userErr && !userErr.message.includes("User already registered")) throw userErr;
    const userId = userResult?.user?.id;

    // 3️⃣ Update profile with org + admin role
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        organization_id: org.id,
        role: "admin",
      })
      .eq("email", ADMIN_EMAIL); // assumes profiles table includes email

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({
        status: "success",
        message: `Admin user '${ADMIN_EMAIL}' assigned to '${TARGET_ORG}'`,
        user_id: userId ?? "existing",
        organization_id: org.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("❌ Failed to create admin user:", e);
    return new Response(
      JSON.stringify({ status: "error", message: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
