import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BroadcastPayload {
  title: string;
  body: string;
  messageType: "update" | "important" | "alert" | "announcement" | "maintenance";
  channel: "both" | "email" | "push";
  url?: string;
}

// ─── FCM V1 helpers ───

async function createJWT(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = await createJWT(clientEmail, privateKey);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!response.ok) throw new Error(`FCM auth failed: ${await response.text()}`);
  return (await response.json()).access_token;
}

async function sendFCM(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  url: string
): Promise<{ success: boolean; invalid?: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            webpush: {
              notification: { title, body, icon: "/pwa-192x192.png", badge: "/pwa-192x192.png" },
              fcm_options: { link: url },
            },
            data: { url, tag: "admin-broadcast" },
          },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`FCM send error for token ${token.substring(0, 15)}...:`, errText);
      if (errText.includes("UNREGISTERED") || errText.includes("INVALID_ARGUMENT")) {
        return { success: false, invalid: true, error: errText };
      }
      return { success: false, error: errText };
    }
    return { success: true };
  } catch (err) {
    console.error(`FCM send exception:`, err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Email helpers ───

const typeEmoji: Record<string, string> = {
  update: "🚀",
  important: "📢",
  alert: "🚨",
  announcement: "🎉",
  maintenance: "🔧",
};

const typeLabel: Record<string, string> = {
  update: "Platform Update",
  important: "Important Notice",
  alert: "Security Alert",
  announcement: "Announcement",
  maintenance: "Maintenance Notice",
};

const typeColor: Record<string, string> = {
  update: "#3b82f6",
  important: "#f59e0b",
  alert: "#ef4444",
  announcement: "#e94560",
  maintenance: "#8b5cf6",
};

function buildEmailHtml(title: string, body: string, messageType: string): string {
  const emoji = typeEmoji[messageType] || "📢";
  const label = typeLabel[messageType] || "Update";
  const color = typeColor[messageType] || "#e94560";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#0a0a0a;">
  <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:16px;overflow:hidden;">
    <div style="text-align:center;padding:40px 20px 20px;">
      <img src="https://vibebaze.com/vibebaze-logo.png" alt="VibeBaze" style="width:60px;height:60px;object-fit:contain;" />
      <div style="display:inline-block;background:${color}22;border:1px solid ${color}55;border-radius:20px;padding:6px 16px;margin-top:16px;">
        <span style="color:${color};font-size:14px;font-weight:600;">${emoji} ${label}</span>
      </div>
    </div>
    <div style="padding:20px 40px;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 16px;line-height:1.3;">${title}</h1>
      <div style="color:#cccccc;font-size:16px;line-height:1.8;white-space:pre-wrap;">${body}</div>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://www.vibebaze.com/feed" style="display:inline-block;background:linear-gradient(135deg,#e94560 0%,#ff6b9d 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:30px;font-size:15px;font-weight:bold;">
          Open VibeBaze →
        </a>
      </div>
    </div>
    <div style="padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);">
      <p style="color:#666;font-size:12px;margin:0;">© 2025 VibeBaze. Built for African Creators. 🌍</p>
      <p style="color:#666;font-size:11px;margin:8px 0 0;">You're receiving this because you're a registered VibeBaze user.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Always return 200 with structured results — never throw to the caller
  const respond = (data: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");
    const fcmProjectId = Deno.env.get("VITE_FIREBASE_PROJECT_ID");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return respond({ error: "Admin access required" }, 403);
    }

    const payload: BroadcastPayload = await req.json();
    const { title, body, messageType, url, channel = "both" } = payload;

    if (!title?.trim() || !body?.trim()) {
      return respond({ error: "Title and body are required" }, 400);
    }

    const broadcastUrl = url || "/notifications";

    // ─── Run email + push in parallel ───

    const emailResults = { sent: 0, failed: 0, total: 0, error: "" };
    const pushResults = { sent: 0, failed: 0, total: 0, tokensRemoved: 0, error: "" };

    // 1. Email broadcast
    const emailPromise = (async () => {
      if (channel === "push") return;
      if (!resendApiKey) {
        emailResults.error = "RESEND_API_KEY not configured";
        console.warn("RESEND_API_KEY not set, skipping email broadcast");
        return;
      }

      try {
        const resend = new Resend(resendApiKey);

        let allUsers: { email: string }[] = [];
        let page = 1;
        const perPage = 1000;

        while (true) {
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ page, perPage });
          if (listError || !listData?.users?.length) break;
          allUsers = allUsers.concat(
            listData.users
              .filter((u: any) => u.email && u.email_confirmed_at)
              .map((u: any) => ({ email: u.email! }))
          );
          if (listData.users.length < perPage) break;
          page++;
        }

        emailResults.total = allUsers.length;
        console.log(`Sending email broadcast to ${allUsers.length} users`);

        const subjectPrefix = typeEmoji[messageType] || "📢";
        const emailHtml = buildEmailHtml(title, body, messageType);

        const batchSize = 50;
        for (let i = 0; i < allUsers.length; i += batchSize) {
          const batch = allUsers.slice(i, i + batchSize);
          const batchResults = await Promise.allSettled(
            batch.map((u) =>
              resend.emails.send({
                from: "VibeBaze <updates@vibebaze.com>",
                to: [u.email],
                subject: `${subjectPrefix} ${title}`,
                html: emailHtml,
              })
            )
          );
          for (const r of batchResults) {
            if (r.status === "fulfilled") emailResults.sent++;
            else emailResults.failed++;
          }
        }
      } catch (err) {
        console.error("Email broadcast error:", err);
        emailResults.error = err instanceof Error ? err.message : "Email broadcast failed";
      }
    })();

    // 2. Push broadcast
    const pushPromise = (async () => {
      if (channel === "email") return;
      if (!fcmClientEmail || !fcmPrivateKey || !fcmProjectId) {
        pushResults.error = "FCM credentials not configured";
        console.warn("FCM credentials not set, skipping push broadcast");
        return;
      }

      try {
        const { data: subscriptions, error: fetchError } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, user_id");

        if (fetchError) {
          pushResults.error = "Failed to fetch push subscriptions";
          console.error("Error fetching subscriptions:", fetchError);
          return;
        }

        if (!subscriptions?.length) {
          console.log("No push subscriptions found");
          return;
        }

        pushResults.total = subscriptions.length;
        console.log(`Sending push broadcast to ${subscriptions.length} subscribers`);

        let accessToken: string;
        try {
          accessToken = await getAccessToken(fcmClientEmail, fcmPrivateKey);
        } catch (authErr) {
          pushResults.error = "FCM authentication failed";
          console.error("FCM auth error:", authErr);
          return;
        }

        const invalidIds: string[] = [];

        // Send to each token individually, catching per-token errors
        for (const sub of subscriptions) {
          const result = await sendFCM(accessToken, fcmProjectId, sub.endpoint, title, body, broadcastUrl);
          if (result.success) {
            pushResults.sent++;
          } else {
            pushResults.failed++;
            if (result.invalid) invalidIds.push(sub.id);
          }
        }

        // Clean up invalid tokens
        if (invalidIds.length > 0) {
          console.log(`Removing ${invalidIds.length} invalid tokens`);
          await supabase.from("push_subscriptions").delete().in("id", invalidIds);
          pushResults.tokensRemoved = invalidIds.length;
        }
      } catch (err) {
        console.error("Push broadcast error:", err);
        pushResults.error = err instanceof Error ? err.message : "Push broadcast failed";
      }
    })();

    // Wait for both — allSettled so one can't break the other
    await Promise.allSettled([emailPromise, pushPromise]);

    // Log admin action (best-effort, don't let logging break the response)
    try {
      await supabase.from("admin_logs").insert({
        admin_id: user.id,
        action_type: "broadcast",
        target_type: "platform",
        reason: `[${messageType}] ${title}`,
        new_value: { title, body, messageType, channel, email: emailResults, push: pushResults },
      });
    } catch (logErr) {
      console.error("Failed to write admin log:", logErr);
    }

    console.log("Broadcast complete:", { email: emailResults, push: pushResults });

    // ALWAYS return 200 with full result details
    return respond({
      success: true,
      email: emailResults,
      push: pushResults,
    });
  } catch (error: unknown) {
    // Even on unexpected errors, return 200 with error info so the frontend doesn't crash
    console.error("Broadcast unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return respond({
      success: false,
      error: message,
      email: { sent: 0, failed: 0, total: 0 },
      push: { sent: 0, failed: 0, total: 0, tokensRemoved: 0 },
    });
  }
});
