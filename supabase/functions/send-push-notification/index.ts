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

    if (!FCM_SERVER_KEY) {
      console.warn("FCM_SERVER_KEY not configured, push notifications will not be sent");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { userId, title, body, icon, data }: PushPayload = await req.json();

    console.log(`Sending push notification to user: ${userId}`);
    console.log(`Title: ${title}, Body: ${body}`);

    // Get all push subscriptions for the user
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s)`);

    const results: { success: boolean; endpoint: string; error?: string }[] = [];

    for (const subscription of subscriptions) {
      const isFCM = subscription.p256dh === "fcm" && subscription.auth === "fcm";
      
      if (isFCM && FCM_SERVER_KEY) {
        // Send via Firebase Cloud Messaging
        try {
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
                click_action: data?.url || "/notifications",
              },
              data: {
                ...data,
                title,
                body,
              },
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  click_action: "OPEN_APP",
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

          const fcmResult = await fcmResponse.json();
          console.log("FCM response:", JSON.stringify(fcmResult));

          if (fcmResult.success === 1) {
            results.push({ success: true, endpoint: subscription.endpoint.substring(0, 20) + "..." });
          } else if (fcmResult.failure === 1) {
            console.error("FCM delivery failed:", fcmResult.results?.[0]?.error);
            
            // If token is invalid, remove it from database
            if (fcmResult.results?.[0]?.error === "NotRegistered" || 
                fcmResult.results?.[0]?.error === "InvalidRegistration") {
              console.log("Removing invalid FCM token");
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
          console.error("FCM request error:", fcmError);
          results.push({ 
            success: false, 
            endpoint: subscription.endpoint.substring(0, 20) + "...",
            error: String(fcmError) 
          });
        }
      } else {
        console.log("Skipping non-FCM subscription:", subscription.endpoint.substring(0, 20));
        results.push({ 
          success: false, 
          endpoint: subscription.endpoint.substring(0, 20) + "...",
          error: "Not an FCM subscription" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully sent ${successCount}/${subscriptions.length} notifications`);

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
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
