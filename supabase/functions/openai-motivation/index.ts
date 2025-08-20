import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import OpenAI from "https://esm.sh/openai@5.11.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") ?? "" });

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authorization.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { tonnage, sets, reps, deltaPct, period, periodType, locale } = body ?? {};

    if (
      typeof tonnage !== "number" ||
      typeof sets !== "number" ||
      typeof reps !== "number" ||
      typeof deltaPct !== "number" ||
      typeof period !== "string" ||
      typeof periodType !== "string" ||
      typeof locale !== "string"
    ) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = {
      user_id: user.id,
      period_type: periodType,
      period_id: period,
      locale,
    };

    const { data: cache } = await supabase
      .from("ai_motivation_cache")
      .select("text")
      .match(cacheKey)
      .maybeSingle();

    if (cache?.text) {
      return new Response(JSON.stringify({ text: cache.text, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      `You are a concise fitness coach. Generate a motivational, punchy message for the user’s Home screen. Max 2 lines, ≤ 140 characters total. Include the tonnage number and a relatable real-world comparison. Use at most 2 emojis. Respond in ${locale}.`;
    const userPrompt =
      `Period: ${periodType} ${period}\nTonnage: ${tonnage} kg (Δ ${deltaPct}% vs prior)\nSets: ${sets}, Reps: ${reps}\nOutput: 1 motivational message (no markdown).`;

    const callOpenAI = async () => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 80,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content?.trim() ?? "";
    };

    let text = "";
    let fallback = false;

    try {
      text = await callOpenAI();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status && [429, 500, 502, 503, 504].includes(status)) {
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
        try {
          text = await callOpenAI();
        } catch (_) {
          text = "Great work! Keep pushing this week 💪";
          fallback = true;
        }
      } else {
        text = "Great work! Keep pushing this week 💪";
        fallback = true;
      }
    }

    await supabase
      .from("ai_motivation_cache")
      .upsert(
        { ...cacheKey, text },
        { onConflict: "user_id,period_type,period_id,locale" }
      );

    return new Response(
      JSON.stringify({ text, cached: false, fallback }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ text: "Keep it up! You're doing great 💪", cached: false, fallback: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
