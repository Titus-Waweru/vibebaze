import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    user_id: string;
    actor_id?: string;
    type: string;
    message: string;
    post_id?: string;
    comment_id?: string;
    created_at: string;
    is_read: boolean;
  };
  schema: string;
  old_record: null;
}

// Base64URL encode
function base64UrlEncode(data: Uint8Array | string): string {
  const base64 = typeof data === 'string' 
    ? btoa(data)
    : btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Get OAuth2 access token using service account credentials
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signInput = `${encodedHeader}.${encodedPayload}`;

  const pemContents = privateKey
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signInput)
  );

  const jwt = `${signInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// Get notification title based on type
function getNotificationTitle(type: string): string {
  switch (type) {
    case "like": return "New Like 💖";
    case "comment": return "New Comment 💬";
    case "follow": return "New Follower 🎉";
    case "new_post": return "New Post 📸";
    case "trending": return "Trending Content 🔥";
    case "tip": return "You Received a Tip! 💰";
    case "gift": return "You Received a Gift! 🎁";
    case "subscription": return "New Subscriber! ⭐";
    default: return "VibeLoop";
  }
}

// Get click URL based on notification type
function getClickUrl(record: NotificationPayload["record"]): string {
  if (record.post_id) {
    return `/post/${record.post_id}`;
  }
  if (record.actor_id) {
    return `/user/${record.actor_id}`;
  }
  return "/notifications";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");
    const fcmProjectId = Deno.env.get("VITE_FIREBASE_PROJECT_ID");

    console.log("[TriggerPush] Processing notification webhook");

    if (!fcmClientEmail || !fcmPrivateKey || !fcmProjectId) {
      console.warn("[TriggerPush] FCM credentials not configured, skipping push");
      return new Response(
        JSON.stringify({ success: false, message: "FCM not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const payload: NotificationPayload = await req.json();

    console.log("[TriggerPush] Notification type:", payload.record.type);
    console.log("[TriggerPush] Target user:", payload.record.user_id);

    // Get push subscriptions for the target user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", payload.record.user_id);

    if (fetchError) {
      console.error("[TriggerPush] Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[TriggerPush] No push subscriptions for user");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[TriggerPush] Found ${subscriptions.length} subscription(s)`);

    // Get access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(fcmClientEmail, fcmPrivateKey);
    } catch (tokenError) {
      console.error("[TriggerPush] Token error:", tokenError);
      return new Response(
        JSON.stringify({ success: false, error: String(tokenError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`;
    const baseUrl = "https://vbeloop.lovable.app";
    
    const title = getNotificationTitle(payload.record.type);
    const body = payload.record.message;
    const clickUrl = getClickUrl(payload.record);
    const absoluteClickUrl = `${baseUrl}${clickUrl}`;
    const absoluteIcon = `${baseUrl}/pwa-192x192.png`;
    const absoluteBadge = `${baseUrl}/pwa-192x192.png`;

    let successCount = 0;

    for (const subscription of subscriptions) {
      const isFCM = subscription.p256dh === "fcm" && subscription.auth === "fcm";
      
      if (!isFCM) continue;

      try {
        const fcmResponse = await fetch(fcmEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: subscription.endpoint,
              // DATA-ONLY payload for reliable service worker handling
              webpush: {
                headers: {
                  Urgency: "high",
                  TTL: "86400",
                },
                fcm_options: {
                  link: absoluteClickUrl,
                },
                data: {
                  title: title,
                  body: body,
                  icon: absoluteIcon,
                  badge: absoluteBadge,
                  url: absoluteClickUrl,
                  click_action: absoluteClickUrl,
                  notification_id: payload.record.id,
                  notification_type: payload.record.type,
                  timestamp: new Date().toISOString(),
                },
              },
              android: {
                priority: "high",
                ttl: "86400s",
                data: {
                  title: title,
                  body: body,
                  icon: absoluteIcon,
                  url: absoluteClickUrl,
                },
              },
              data: {
                title: title,
                body: body,
                icon: absoluteIcon,
                badge: absoluteBadge,
                url: absoluteClickUrl,
                notification_id: payload.record.id,
                notification_type: payload.record.type,
              },
            },
          }),
        });

        if (fcmResponse.ok) {
          successCount++;
          console.log("[TriggerPush] Sent to:", subscription.endpoint.substring(0, 20));
        } else {
          const errorText = await fcmResponse.text();
          console.error("[TriggerPush] FCM error:", errorText);
          
          // Remove invalid tokens
          try {
            const errorData = JSON.parse(errorText);
            const errorCode = errorData?.error?.details?.[0]?.errorCode || errorData?.error?.code;
            if (errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT") {
              await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
              console.log("[TriggerPush] Removed invalid token");
            }
          } catch {}
        }
      } catch (error) {
        console.error("[TriggerPush] Request error:", error);
      }
    }

    console.log(`[TriggerPush] Sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[TriggerPush] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
