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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
    const adminSecret = Deno.env.get("ADMIN_SECRET") || "vibesphere-admin-2024";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();

    // Verify admin secret
    if (payload.adminSecret !== adminSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, user_id");

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failureCount = 0;

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        // Check if it's an FCM token (not a browser subscription)
        if (!subscription.endpoint.startsWith("browser-") && fcmServerKey) {
          const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify({
              to: subscription.endpoint,
              notification: {
                title: payload.title,
                body: payload.body,
                icon: "/pwa-192x192.png",
                badge: "/pwa-192x192.png",
                click_action: `${supabaseUrl.replace('supabase.co', 'lovable.app')}/feed`,
              },
              data: {
                url: `${supabaseUrl.replace('supabase.co', 'lovable.app')}/feed`,
              },
            }),
          });

          if (fcmResponse.ok) {
            successCount++;
          } else {
            const errorData = await fcmResponse.json();
            console.error("FCM error:", errorData);
            
            // If token is invalid, remove it
            if (errorData.results?.[0]?.error === "NotRegistered" || 
                errorData.results?.[0]?.error === "InvalidRegistration") {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", subscription.endpoint);
            }
            failureCount++;
          }
        }
      } catch (error) {
        console.error("Error sending to subscription:", error);
        failureCount++;
      }
    }

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
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
