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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    if (!fcmServerKey) {
      console.error("FCM_SERVER_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload: NotificationPayload = await req.json();
    const { userId, userIds, broadcast, title, body, url, tag } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query for tokens
    let query = supabase.from("push_subscriptions").select("endpoint, user_id");

    if (broadcast) {
      // Get all tokens for broadcast
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
        JSON.stringify({ success: true, sent: 0, message: "No subscribers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending to ${subscriptions.length} subscribers`);

    // Send notifications using FCM HTTP v1 API
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const fcmToken = sub.endpoint;
        
        const message = {
          to: fcmToken,
          notification: {
            title,
            body,
            icon: "/pwa-192x192.png",
            click_action: url || "/feed"
          },
          data: {
            url: url || "/feed",
            tag: tag || "vibebaze-notification"
          }
        };

        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `key=${fcmServerKey}`
          },
          body: JSON.stringify(message)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`FCM error for user ${sub.user_id}:`, errorText);
          
          // If token is invalid, remove it from database
          if (response.status === 400 || errorText.includes("NotRegistered")) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", sub.user_id);
            console.log(`Removed invalid token for user ${sub.user_id}`);
          }
          
          throw new Error(errorText);
        }

        return { userId: sub.user_id, success: true };
      })
    );

    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    console.log(`Sent: ${successful}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed,
        total: subscriptions.length 
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
