import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BroadcastPayload {
  title: string;
  body: string;
  messageType: "update" | "important" | "alert" | "announcement" | "maintenance";
  channel: "both" | "email" | "push";
  url?: string;
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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return respond({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return respond({ error: "Admin access required" }, 403);

    const payload: BroadcastPayload = await req.json();
    const { title, body, messageType, url, channel = "both" } = payload;

    if (!title?.trim() || !body?.trim()) {
      return respond({ error: "Title and body are required" }, 400);
    }

    // Enqueue the job
    const { data: job, error: insertError } = await supabase
      .from("broadcast_jobs")
      .insert({
        admin_id: user.id,
        title: title.trim(),
        body: body.trim(),
        message_type: messageType || "update",
        channel,
        url: url || "/notifications",
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !job) {
      console.error("Failed to enqueue job:", insertError);
      return respond({ error: "Failed to create broadcast job" }, 500);
    }

    // Audit log
    try {
      await supabase.from("admin_logs").insert({
        admin_id: user.id,
        action_type: "broadcast_enqueued",
        target_type: "broadcast_job",
        target_id: job.id,
        reason: `[${messageType}] ${title}`,
        new_value: { title, body, messageType, channel },
      });
    } catch (e) {
      console.error("admin_logs insert failed:", e);
    }

    // Kick off worker (fire-and-forget, don't await)
    try {
      fetch(`${supabaseUrl}/functions/v1/process-broadcast-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch((e) => console.error("Failed to trigger worker:", e));
    } catch (e) {
      console.error("Worker trigger error:", e);
    }

    return respond({ success: true, jobId: job.id, status: "pending" });
  } catch (error: unknown) {
    console.error("admin-broadcast error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return respond({ success: false, error: message });
  }
});