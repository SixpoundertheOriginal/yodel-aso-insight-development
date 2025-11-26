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

  const email = "Stephen@yodelmobile.com";
  const orgId = "7cccba3f-0a8f-446f-9dba-86e9cb68c92b";

  console.log("=== DEBUG USER CREATION ===");
  console.log("Email:", email);
  console.log("Org ID:", orgId);

  const results: any = {
    step1_check_user_exists: null,
    step2_check_profiles_table: null,
    step3_check_organization: null,
    step4_check_auth_users_table: null,
    step5_list_existing_users: null,
  };

  try {
    // STEP 1: Check if user already exists in auth.users
    console.log("\n=== STEP 1: Check if user exists ===");
    const { data: existingAuthUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(
      "00000000-0000-0000-0000-000000000000" // Dummy ID to check API works
    );
    console.log("Auth API works:", !authCheckError || authCheckError.message);

    // Try to find user by email using listUsers
    const { data: allUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    console.log("Total users in auth.users:", allUsers?.users?.length);

    const userExists = allUsers?.users?.find((u: any) => u.email === email);
    results.step1_check_user_exists = {
      exists: !!userExists,
      user_id: userExists?.id || null,
      email: email,
      user_metadata: userExists?.user_metadata || null,
    };
    console.log("User exists:", !!userExists);
    if (userExists) {
      console.log("Existing user ID:", userExists.id);
      console.log("Existing user metadata:", userExists.user_metadata);
    }

    // STEP 2: Check if profiles table exists
    console.log("\n=== STEP 2: Check profiles table ===");
    const { data: profilesCheck, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .limit(1);

    results.step2_check_profiles_table = {
      table_exists: !profilesError || profilesError.code !== "42P01",
      error: profilesError?.message || null,
      error_code: profilesError?.code || null,
    };
    console.log("Profiles table exists:", !profilesError || profilesError.code !== "42P01");
    if (profilesError) {
      console.log("Profiles error:", profilesError.message, profilesError.code);
    }

    // STEP 3: Check organization exists
    console.log("\n=== STEP 3: Check organization ===");
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .single();

    results.step3_check_organization = {
      exists: !!org,
      name: org?.name || null,
      error: orgError?.message || null,
    };
    console.log("Organization exists:", !!org);
    if (org) {
      console.log("Organization name:", org.name);
    }

    // STEP 4: Check auth.users table structure
    console.log("\n=== STEP 4: Check auth.users structure ===");
    const { data: sampleUser } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
    results.step4_check_auth_users_table = {
      sample_user_structure: sampleUser?.users?.[0] || null,
    };

    // STEP 5: List all existing users
    console.log("\n=== STEP 5: List existing users ===");
    results.step5_list_existing_users = {
      total_count: allUsers?.users?.length || 0,
      users: allUsers?.users?.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        email_confirmed: !!u.email_confirmed_at,
      })) || [],
    };

    // STEP 6: Attempt to create user (with error handling)
    console.log("\n=== STEP 6: Attempt user creation ===");
    if (results.step1_check_user_exists.exists) {
      console.log("⚠️ User already exists - skipping creation attempt");
      results.step6_creation_attempt = {
        skipped: true,
        reason: "User already exists",
      };
    } else {
      console.log("Attempting to create user...");
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: "TempPass123!@#",
        email_confirm: true,
        user_metadata: {
          first_name: "Stevo",
          last_name: "",
          created_by: "debug_function",
          organization_id: orgId,
        },
      });

      results.step6_creation_attempt = {
        success: !!newUser,
        error: createError?.message || null,
        error_status: (createError as any)?.status || null,
        user_id: newUser?.user?.id || null,
      };

      if (createError) {
        console.error("❌ User creation failed:", createError.message);
        console.error("Error details:", JSON.stringify(createError, null, 2));
      } else {
        console.log("✅ User created successfully:", newUser.user?.id);

        // Clean up - delete the test user
        if (newUser.user?.id) {
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          console.log("Test user deleted");
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        debug_results: results,
        recommendation: generateRecommendation(results),
      }),
      { status: 200, headers: cors }
    );

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        debug_results: results,
      }),
      { status: 500, headers: cors }
    );
  }
});

function generateRecommendation(results: any): string {
  if (results.step1_check_user_exists?.exists) {
    return `❌ ROOT CAUSE: User '${results.step1_check_user_exists.email}' already exists with ID ${results.step1_check_user_exists.user_id}. Delete this user first or use a different email.`;
  }

  if (!results.step2_check_profiles_table?.table_exists) {
    return "⚠️ WARNING: profiles table does not exist. This may cause issues when the Edge Function tries to query user data.";
  }

  if (!results.step3_check_organization?.exists) {
    return "❌ ERROR: Organization not found. Check the organization UUID is correct.";
  }

  if (results.step6_creation_attempt?.error) {
    return `❌ ERROR: User creation failed with: ${results.step6_creation_attempt.error}`;
  }

  return "✅ All checks passed. User creation should work.";
}
