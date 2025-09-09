import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || "https://bkbcqocpjahewqjmlgvf.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to provide this
const email = process.env.BOT_EMAIL!;
const password = process.env.BOT_PASSWORD!;

(async () => {
  // First get a user token
  const anonClient = createClient(url, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  
  if (error || !data.session) {
    console.error("Login failed:", error?.message);
    process.exit(1);
  }

  // Create client with user token for the migration
  const client = createClient(url, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  });

  console.log("Applying migration: Add deleted_at column to organizations...");
  
  try {
    // Apply the migration SQL
    const { error: migrationError } = await client.rpc('exec_sql', {
      sql: `
        -- Add deleted_at column to organizations table for soft delete functionality
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

        -- Add index for better performance when filtering non-deleted records
        CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations (deleted_at);

        -- Add comment for documentation
        COMMENT ON COLUMN organizations.deleted_at IS 'Timestamp when the organization was soft deleted. NULL means active.';
      `
    });

    if (migrationError) {
      console.error("Migration failed:", migrationError);
      process.exit(1);
    }

    console.log("✅ Migration applied successfully!");
    
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
})();