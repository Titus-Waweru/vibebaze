import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get("id");

    if (!postId) {
      return new Response("Missing post ID", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: post, error } = await supabase
      .from("posts")
      .select("id, caption, type, media_url, thumbnail_url, created_at, user_id, profiles:user_id(username, avatar_url, full_name)")
      .eq("id", postId)
      .single();

    if (error || !post) {
      return new Response(getDefaultHtml(), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const profile = post.profiles as any;
    const username = profile?.username || "Creator";
    const title = post.caption
      ? `${username}: ${post.caption.slice(0, 60)}${post.caption.length > 60 ? "..." : ""}`
      : `${username} on VibeBaze`;
    const description = post.caption || `Check out this ${post.type} by ${username} on VibeBaze — Africa's creator platform.`;
    // For videos, never use media_url (it's a .mp4 — not a valid social preview).
    // Fallback to site preview if no thumbnail is available.
    const SITE_PREVIEW = "https://www.vibebaze.com/social-preview.png";
    const image =
      post.thumbnail_url ||
      (post.type === "image" ? post.media_url : null) ||
      SITE_PREVIEW;
    const postUrl = `https://vibebaze.lovable.app/post/${post.id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)} | VibeBaze</title>
  <meta name="description" content="${escapeHtml(description)}"/>
  <meta property="og:type" content="${post.type === "video" ? "video.other" : "article"}"/>
  <meta property="og:title" content="${escapeHtml(title)}"/>
  <meta property="og:description" content="${escapeHtml(description)}"/>
  <meta property="og:image" content="${escapeHtml(image)}"/>
  <meta property="og:url" content="${escapeHtml(postUrl)}"/>
  <meta property="og:site_name" content="VibeBaze"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(title)}"/>
  <meta name="twitter:description" content="${escapeHtml(description)}"/>
  <meta name="twitter:image" content="${escapeHtml(image)}"/>
  <meta http-equiv="refresh" content="0;url=${escapeHtml(postUrl)}"/>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(postUrl)}">VibeBaze</a>...</p>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.error("OG error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDefaultHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>VibeBaze — Africa's Creator Platform</title>
  <meta property="og:title" content="VibeBaze"/>
  <meta property="og:description" content="Watch, create, and earn on Africa's hottest creator platform."/>
  <meta property="og:image" content="https://vibebaze.lovable.app/social-preview.png"/>
  <meta http-equiv="refresh" content="0;url=https://vibebaze.lovable.app"/>
</head>
<body><p>Redirecting...</p></body>
</html>`;
}
