import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
async function createJWT(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600, // 1 hour expiry
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key and sign
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.replace(pemHeader, "").replace(pemFooter, "").replace(/\\n/g, "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsignedToken}.${signatureB64}`;
}

// Get OAuth2 access token from Google
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

  const data = await response.json();
  return data.access_token;
}

// Send notification using FCM V1 API
async function sendFCMNotification(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const message = {
    message: {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          title,
          body,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
        },
        fcm_options: {
          link: data.url || "/feed",
        },
      },
      data,
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`FCM V1 API error:`, errorText);
    
    // Check if token is invalid
    if (errorText.includes("UNREGISTERED") || errorText.includes("INVALID_ARGUMENT")) {
      return { success: false, error: "invalid_token" };
    }
    
    return { success: false, error: errorText };
  }

  return { success: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Firebase Service Account credentials
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");
    const fcmProjectId = "vibebaze-f08b2"; // Firebase project ID

    if (!fcmClientEmail || !fcmPrivateKey) {
      console.error("FCM service account credentials not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured - missing service account credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload: NotificationPayload = await req.json();
    const { userId, userIds, broadcast, title, body, url, tag, imageUrl } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Must specify userId, userIds, or broadcast" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, total: 0, message: "No subscribers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending to ${subscriptions.length} subscribers using FCM V1 API`);

    // Get OAuth2 access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(fcmClientEmail, fcmPrivateKey);
    } catch (error) {
      console.error("Failed to get access token:", error);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with FCM" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notifications
    const invalidTokenIds: string[] = [];
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const fcmToken = sub.endpoint;
        const data: Record<string, string> = {
          url: url || "/feed",
          tag: tag || "vibebaze-notification",
        };
        if (imageUrl) {
          data.imageUrl = imageUrl;
        }

        const result = await sendFCMNotification(
          accessToken,
          fcmProjectId,
          fcmToken,
          title,
          body,
          data
        );

        if (!result.success && result.error === "invalid_token") {
          invalidTokenIds.push(sub.id);
        }

        if (!result.success) {
          throw new Error(result.error);
        }

        return { userId: sub.user_id, success: true };
      })
    );

    // Clean up invalid tokens
    if (invalidTokenIds.length > 0) {
      console.log(`Removing ${invalidTokenIds.length} invalid tokens`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", invalidTokenIds);
    }

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Sent: ${successful}, Failed: ${failed}, Tokens removed: ${invalidTokenIds.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
        tokensRemoved: invalidTokenIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending push notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
