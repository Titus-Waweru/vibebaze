import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationPayload {
  userId?: string;
  userIds?: string[];
  broadcast?: boolean;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  imageUrl?: string;
}

// Generate JWT for Google OAuth2 authentication
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  return (await response.json()).access_token;
}

async function sendFCMNotification(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string; invalid?: boolean }> {
  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title, body },
            webpush: {
              notification: { title, body, icon: "/pwa-192x192.png", badge: "/pwa-192x192.png" },
              fcm_options: { link: data.url || "/feed" },
            },
            data,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FCM V1 API error:`, errorText);
      const invalid = errorText.includes("UNREGISTERED") || errorText.includes("INVALID_ARGUMENT");
      return { success: false, error: invalid ? "invalid_token" : errorText, invalid };
    }

    return { success: true };
  } catch (err) {
    console.error("FCM send exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (data: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");
    const fcmProjectId = Deno.env.get("VITE_FIREBASE_PROJECT_ID");

    if (!fcmClientEmail || !fcmPrivateKey || !fcmProjectId) {
      console.error("FCM service account credentials or project ID not configured");
      return respond({
        success: false, sent: 0, failed: 0, total: 0,
        error: "Push notifications not configured - missing service account credentials",
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload: NotificationPayload = await req.json();
    const { userId, userIds, broadcast, title, body, url, tag, imageUrl } = payload;

    if (!title || !body) {
      return respond({ success: false, error: "Title and body are required", sent: 0, failed: 0, total: 0 });
    }

    // Build query for tokens
    let query = supabase.from("push_subscriptions").select("endpoint, user_id, id");

    if (broadcast) {
      console.log("Broadcasting to all users");
    } else if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    } else if (userId) {
      query = query.eq("user_id", userId);
    } else {
      return respond({ success: false, error: "Must specify userId, userIds, or broadcast", sent: 0, failed: 0, total: 0 });
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return respond({ success: false, error: "Failed to fetch subscriptions", sent: 0, failed: 0, total: 0 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return respond({ success: true, sent: 0, failed: 0, total: 0, message: "No subscribers found" });
    }

    console.log(`Sending to ${subscriptions.length} subscribers using FCM V1 API`);

    // Get OAuth2 access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(fcmClientEmail, fcmPrivateKey);
    } catch (error) {
      console.error("Failed to get access token:", error);
      return respond({ success: false, error: "Failed to authenticate with FCM", sent: 0, failed: 0, total: subscriptions.length });
    }

    // Send notifications
    const invalidTokenIds: string[] = [];
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const data: Record<string, string> = {
        url: url || "/feed",
        tag: tag || "vibebaze-notification",
      };
      if (imageUrl) data.imageUrl = imageUrl;

      const result = await sendFCMNotification(accessToken, fcmProjectId, sub.endpoint, title, body, data);

      if (result.success) {
        sent++;
      } else {
        failed++;
        if (result.invalid) invalidTokenIds.push(sub.id);
      }
    }

    // Clean up invalid tokens
    if (invalidTokenIds.length > 0) {
      console.log(`Removing ${invalidTokenIds.length} invalid tokens`);
      await supabase.from("push_subscriptions").delete().in("id", invalidTokenIds);
    }

    console.log(`Sent: ${sent}, Failed: ${failed}, Tokens removed: ${invalidTokenIds.length}`);

    return respond({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
      tokensRemoved: invalidTokenIds.length,
    });
  } catch (error: unknown) {
    console.error("Error sending push notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return respond({
      success: false,
      error: message,
      sent: 0,
      failed: 0,
      total: 0,
    });
  }
});
