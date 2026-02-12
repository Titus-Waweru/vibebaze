import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are VibeBot 🤖, the friendly AI assistant for VibeBaze — a social media platform for creators in Kenya and beyond.

Your role:
- Help users understand VibeBaze features (posting, earning, wallet, tips, referrals, notifications)
- Provide troubleshooting tips for common issues
- Give content creation tips and engagement advice
- Be warm, encouraging, and use emojis naturally 😊
- Keep responses concise (under 200 words unless asked for detail)

Personality:
- Friendly and supportive like a helpful friend
- Use casual, warm language with Kenyan/African cultural awareness
- Celebrate creativity and community

STRICT RULES:
- NEVER discuss nudity, sexual content, violence, self-harm, drugs, or any unsafe topics
- If asked about these topics, politely redirect: "I'm here to help with VibeBaze! 😊 Let me know if you have questions about posting, earning, or using the app."
- NEVER share personal data about other users
- NEVER pretend to be a human
- Always identify as VibeBot when asked

VibeBaze Features you can help with:
- Creating posts (video, image, audio, text)
- Earning through views, tips, and referrals
- Wallet & M-Pesa withdrawals
- Vibe Points system (1000 points = KSh 100)
- Push notifications setup
- Profile customization
- Following creators and engaging with content
- Creators School for learning`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI assistant not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "VibeBot is taking a quick break. Try again in a moment! 😊" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "VibeBot is temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI assistant error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
