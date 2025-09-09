import { createClient } from "@supabase/supabase-js";

const url = process.env.SB_URL || process.env.VITE_SUPABASE_URL || "https://bkbcqocpjahewqjmlgvf.supabase.co";
const anon = process.env.SB_ANON || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek";
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