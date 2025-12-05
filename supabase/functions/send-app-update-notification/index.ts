import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  adminSecret: string;
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
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

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

  // Parse PEM private key
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

  // Exchange JWT for access token
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");
    const fcmProjectId = Deno.env.get("VITE_FIREBASE_PROJECT_ID");
    const adminSecret = Deno.env.get("ADMIN_SECRET") || "vibesphere-admin-2024";

    console.log("[Notification] Starting app update notification");
    console.log("[Notification] FCM credentials configured:", !!fcmClientEmail && !!fcmPrivateKey && !!fcmProjectId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();

    // Verify admin secret
    if (payload.adminSecret !== adminSecret) {
      console.log("[Notification] Unauthorized - invalid admin secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, user_id");

    if (error) {
      console.error("[Notification] Error fetching subscriptions:", error);
      throw error;
    }

    console.log("[Notification] Found subscriptions:", subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fcmClientEmail || !fcmPrivateKey || !fcmProjectId) {
      console.error("[Notification] FCM credentials not fully configured");
      return new Response(
        JSON.stringify({ error: "FCM credentials not fully configured (need FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY, VITE_FIREBASE_PROJECT_ID)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth2 access token
    let accessToken: string;
    try {
      console.log("[Notification] Getting OAuth2 access token...");
      accessToken = await getAccessToken(fcmClientEmail, fcmPrivateKey);
      console.log("[Notification] Access token obtained successfully");
    } catch (tokenError) {
      console.error("[Notification] Failed to get access token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with FCM: " + String(tokenError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failureCount = 0;

    // FCM HTTP v1 API endpoint
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`;
    console.log("[Notification] Using FCM endpoint:", fcmEndpoint);

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        // Skip browser subscriptions (we only handle FCM tokens)
        if (subscription.endpoint.startsWith("browser-")) {
          console.log("[Notification] Skipping browser subscription");
          continue;
        }

        console.log("[Notification] Sending to FCM token:", subscription.endpoint.substring(0, 20) + "...");

        const fcmResponse = await fetch(fcmEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: subscription.endpoint,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              webpush: {
                notification: {
                  icon: "/pwa-192x192.png",
                  badge: "/pwa-192x192.png",
                },
                fcm_options: {
                  link: "/feed",
                },
              },
              data: {
                url: "/feed",
                title: payload.title,
                body: payload.body,
              },
            },
          }),
        });

        console.log("[Notification] FCM response status:", fcmResponse.status);

        const responseText = await fcmResponse.text();
        console.log("[Notification] FCM response body:", responseText.substring(0, 300));

        if (fcmResponse.ok) {
          console.log("[Notification] Successfully sent to:", subscription.user_id);
          successCount++;
        } else {
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { error: responseText };
          }
          
          console.error("[Notification] FCM error response:", responseData);
          
          // If token is invalid, remove it
          const errorCode = responseData?.error?.details?.[0]?.errorCode || responseData?.error?.code;
          if (errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT") {
            console.log("[Notification] Removing invalid token");
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", subscription.endpoint);
          }
          failureCount++;
        }
      } catch (error) {
        console.error("[Notification] Error sending to subscription:", error);
        failureCount++;
      }
    }

    console.log("[Notification] Complete - success:", successCount, "failed:", failureCount);

    return new Response(
      JSON.stringify({
        message: "App update notification sent",
        total: subscriptions.length,
        success: successCount,
        failed: failureCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Notification] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
