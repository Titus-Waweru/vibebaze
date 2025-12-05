import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");
    const fcmProjectId = Deno.env.get("VITE_FIREBASE_PROJECT_ID");

    console.log("[Push] Starting push notification");
    console.log("[Push] FCM credentials configured:", !!fcmClientEmail && !!fcmPrivateKey && !!fcmProjectId);

    if (!fcmClientEmail || !fcmPrivateKey || !fcmProjectId) {
      console.warn("[Push] FCM credentials not fully configured");
      return new Response(
        JSON.stringify({ error: "FCM credentials not fully configured (need FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY, VITE_FIREBASE_PROJECT_ID)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { userId, title, body, icon, data }: PushPayload = await req.json();

    console.log(`[Push] Sending push notification to user: ${userId}`);
    console.log(`[Push] Title: ${title}, Body: ${body}`);

    // Get all push subscriptions for the user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (fetchError) {
      console.error("[Push] Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[Push] No push subscriptions found for user");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Push] Found ${subscriptions.length} subscription(s)`);

    // Get OAuth2 access token
    let accessToken: string;
    try {
      console.log("[Push] Getting OAuth2 access token...");
      accessToken = await getAccessToken(fcmClientEmail, fcmPrivateKey);
      console.log("[Push] Access token obtained successfully");
    } catch (tokenError) {
      console.error("[Push] Failed to get access token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with FCM: " + String(tokenError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FCM HTTP v1 API endpoint
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`;
    console.log("[Push] Using FCM endpoint:", fcmEndpoint);

    const results: { success: boolean; endpoint: string; error?: string }[] = [];

    for (const subscription of subscriptions) {
      const isFCM = subscription.p256dh === "fcm" && subscription.auth === "fcm";
      
      if (isFCM) {
        // Send via Firebase Cloud Messaging HTTP v1 API
        try {
          console.log("[Push] Sending to FCM token:", subscription.endpoint.substring(0, 20) + "...");
          
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
                  title,
                  body,
                },
                webpush: {
                  notification: {
                    icon: icon || "/pwa-192x192.png",
                    badge: "/pwa-192x192.png",
                    vibrate: [100, 50, 100],
                  },
                  fcm_options: {
                    link: data?.url || "/notifications",
                  },
                },
                android: {
                  priority: "high",
                  notification: {
                    sound: "default",
                  },
                },
                data: {
                  ...data,
                  title,
                  body,
                  url: data?.url || "/notifications",
                },
              },
            }),
          });

          console.log("[Push] FCM response status:", fcmResponse.status);

          const responseText = await fcmResponse.text();
          console.log("[Push] FCM response body:", responseText.substring(0, 300));

          if (fcmResponse.ok) {
            console.log("[Push] Successfully sent notification");
            results.push({ success: true, endpoint: subscription.endpoint.substring(0, 20) + "..." });
          } else {
            let fcmResult;
            try {
              fcmResult = JSON.parse(responseText);
            } catch {
              fcmResult = { error: responseText };
            }
            
            console.error("[Push] FCM delivery failed:", fcmResult);
            
            // If token is invalid, remove it from database
            const errorCode = fcmResult?.error?.details?.[0]?.errorCode || fcmResult?.error?.code;
            if (errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT") {
              console.log("[Push] Removing invalid FCM token");
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", subscription.id);
            }
            
            results.push({ 
              success: false, 
              endpoint: subscription.endpoint.substring(0, 20) + "...",
              error: fcmResult?.error?.message || String(fcmResult) 
            });
          }
        } catch (fcmError) {
          console.error("[Push] FCM request error:", fcmError);
          results.push({ 
            success: false, 
            endpoint: subscription.endpoint.substring(0, 20) + "...",
            error: String(fcmError) 
          });
        }
      } else {
        console.log("[Push] Skipping non-FCM subscription:", subscription.endpoint.substring(0, 20));
        results.push({ 
          success: false, 
          endpoint: subscription.endpoint.substring(0, 20) + "...",
          error: "Not an FCM subscription" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Push] Successfully sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount} notification(s)`,
        results,
        subscriptionCount: subscriptions.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Push] Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
