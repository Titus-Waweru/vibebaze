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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

    console.log("[Push] Starting push notification");
    console.log("[Push] FCM_SERVER_KEY configured:", !!FCM_SERVER_KEY);

    if (!FCM_SERVER_KEY) {
      console.warn("[Push] FCM_SERVER_KEY not configured, push notifications will not be sent");
      return new Response(
        JSON.stringify({ error: "FCM_SERVER_KEY not configured" }),
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

    const results: { success: boolean; endpoint: string; error?: string }[] = [];

    for (const subscription of subscriptions) {
      const isFCM = subscription.p256dh === "fcm" && subscription.auth === "fcm";
      
      if (isFCM) {
        // Send via Firebase Cloud Messaging
        try {
          console.log("[Push] Sending to FCM token:", subscription.endpoint.substring(0, 20) + "...");
          
          const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Authorization": `key=${FCM_SERVER_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: subscription.endpoint, // FCM token stored as endpoint
              notification: {
                title,
                body,
                icon: icon || "/pwa-192x192.png",
                badge: "/pwa-192x192.png",
              },
              data: {
                ...data,
                title,
                body,
                url: data?.url || "/notifications",
              },
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                },
              },
              webpush: {
                headers: {
                  Urgency: "high",
                },
                notification: {
                  icon: icon || "/pwa-192x192.png",
                  badge: "/pwa-192x192.png",
                  vibrate: [100, 50, 100],
                  requireInteraction: false,
                },
                fcm_options: {
                  link: data?.url || "/notifications",
                },
              },
            }),
          });

          console.log("[Push] FCM response status:", fcmResponse.status);

          // Check content type before parsing
          const contentType = fcmResponse.headers.get("content-type") || "";
          const responseText = await fcmResponse.text();
          
          console.log("[Push] FCM response content-type:", contentType);
          console.log("[Push] FCM response body:", responseText.substring(0, 300));

          if (!contentType.includes("application/json")) {
            console.error("[Push] FCM returned non-JSON response");
            results.push({ 
              success: false, 
              endpoint: subscription.endpoint.substring(0, 20) + "...",
              error: "FCM returned non-JSON response" 
            });
            continue;
          }

          let fcmResult;
          try {
            fcmResult = JSON.parse(responseText);
          } catch (parseError) {
            console.error("[Push] Failed to parse FCM response:", parseError);
            results.push({ 
              success: false, 
              endpoint: subscription.endpoint.substring(0, 20) + "...",
              error: "Failed to parse FCM response" 
            });
            continue;
          }

          console.log("[Push] FCM response parsed:", JSON.stringify(fcmResult));

          if (fcmResult.success === 1) {
            console.log("[Push] Successfully sent notification");
            results.push({ success: true, endpoint: subscription.endpoint.substring(0, 20) + "..." });
          } else if (fcmResult.failure === 1) {
            console.error("[Push] FCM delivery failed:", fcmResult.results?.[0]?.error);
            
            // If token is invalid, remove it from database
            if (fcmResult.results?.[0]?.error === "NotRegistered" || 
                fcmResult.results?.[0]?.error === "InvalidRegistration") {
              console.log("[Push] Removing invalid FCM token");
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", subscription.id);
            }
            
            results.push({ 
              success: false, 
              endpoint: subscription.endpoint.substring(0, 20) + "...",
              error: fcmResult.results?.[0]?.error 
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
