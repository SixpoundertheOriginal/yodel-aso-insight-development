import { createClient } from "@supabase/supabase-js";

const url = process.env.SB_URL || "http://127.0.0.1:54321";
const anon = process.env.SB_ANON || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5MzQ4OTgsImV4cCI6MjA0MDUxMDg5OH0.6WxFRUECKEt_c-nJ2ZOKDX9JzhtY_tPSGNJ-xOoWCd8";
const email = process.env.BOT_EMAIL!;
const password = process.env.BOT_PASSWORD!;

(async () => {
  const supa = createClient(url, anon);
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.error("Login failed:", error?.message);
    process.exit(1);
  }
  console.log(data.session.access_token);
})();