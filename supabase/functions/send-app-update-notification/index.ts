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

    console.log("[Notification] Starting app update notification");
    console.log("[Notification] FCM Server Key configured:", !!fcmServerKey);

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

    if (!fcmServerKey) {
      console.error("[Notification] FCM_SERVER_KEY not configured");
      return new Response(
        JSON.stringify({ error: "FCM_SERVER_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failureCount = 0;

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        // Skip browser subscriptions (we only handle FCM tokens)
        if (subscription.endpoint.startsWith("browser-")) {
          console.log("[Notification] Skipping browser subscription");
          continue;
        }

        console.log("[Notification] Sending to FCM token:", subscription.endpoint.substring(0, 20) + "...");

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
            },
            data: {
              url: "/feed",
              title: payload.title,
              body: payload.body,
            },
          }),
        });

        console.log("[Notification] FCM response status:", fcmResponse.status);

        // Check content type before parsing
        const contentType = fcmResponse.headers.get("content-type") || "";
        const responseText = await fcmResponse.text();
        
        console.log("[Notification] FCM response content-type:", contentType);
        console.log("[Notification] FCM response body:", responseText.substring(0, 200));

        if (!contentType.includes("application/json")) {
          console.error("[Notification] FCM returned non-JSON response:", responseText.substring(0, 500));
          failureCount++;
          continue;
        }

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("[Notification] Failed to parse FCM response:", parseError);
          failureCount++;
          continue;
        }

        if (fcmResponse.ok && responseData.success === 1) {
          console.log("[Notification] Successfully sent to:", subscription.user_id);
          successCount++;
        } else {
          console.error("[Notification] FCM error response:", responseData);
          
          // If token is invalid, remove it
          if (responseData.results?.[0]?.error === "NotRegistered" || 
              responseData.results?.[0]?.error === "InvalidRegistration") {
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
