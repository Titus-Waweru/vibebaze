import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_BATCH = 50;
const PUSH_BATCH = 100;
const BATCH_DELAY_MS = 300;

// ─── FCM V1 helpers ───
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
  const enc = new TextEncoder();
  const b64url = (s: string) => btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;
  const pem = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const binary = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${unsigned}.${sigB64}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = await createJWT(clientEmail, privateKey);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function sendFCM(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  url: string,
): Promise<{ success: boolean; invalid?: boolean }> {
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            webpush: {
              notification: { title, body, icon: "/pwa-192x192.png", badge: "/pwa-192x192.png" },
              fcm_options: { link: url },
            },
            data: { url, tag: "admin-broadcast" },
          },
        }),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      const invalid = errText.includes("UNREGISTERED") ||
        errText.includes("INVALID_ARGUMENT") ||
        errText.includes("NOT_FOUND") ||
        errText.includes("SENDER_ID_MISMATCH");
      return { success: false, invalid };
    }
    return { success: true };
  } catch (_err) {
    return { success: false };
  }
}

// ─── Email template ───
const typeEmoji: Record<string, string> = {
  update: "🚀", important: "📢", alert: "🚨", announcement: "🎉", maintenance: "🔧",
};
const typeLabel: Record<string, string> = {
  update: "Platform Update", important: "Important Notice", alert: "Security Alert",
  announcement: "Announcement", maintenance: "Maintenance Notice",
};
const typeColor: Record<string, string> = {
  update: "#3b82f6", important: "#f59e0b", alert: "#ef4444",
  announcement: "#e94560", maintenance: "#8b5cf6",
};

function buildEmailHtml(title: string, body: string, messageType: string): string {
  const emoji = typeEmoji[messageType] || "📢";
  const label = typeLabel[messageType] || "Update";
  const color = typeColor[messageType] || "#e94560";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#0a0a0a;">
  <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:16px;overflow:hidden;">
    <div style="text-align:center;padding:40px 20px 20px;">
      <img src="https://vibebaze.com/vibebaze-logo.png" alt="VibeBaze" style="width:60px;height:60px;object-fit:contain;" />
      <div style="display:inline-block;background:${color}22;border:1px solid ${color}55;border-radius:20px;padding:6px 16px;margin-top:16px;">
        <span style="color:${color};font-size:14px;font-weight:600;">${emoji} ${label}</span>
      </div>
    </div>
    <div style="padding:20px 40px;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 16px;line-height:1.3;">${title}</h1>
      <div style="color:#cccccc;font-size:16px;line-height:1.8;white-space:pre-wrap;">${body}</div>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://www.vibebaze.com/feed" style="display:inline-block;background:linear-gradient(135deg,#e94560 0%,#ff6b9d 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:30px;font-size:15px;font-weight:bold;">Open VibeBaze →</a>
      </div>
    </div>
    <div style="padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);">
      <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} VibeBaze. Built for African Creators. 🌍</p>
      <p style="color:#666;font-size:11px;margin:8px 0 0;">You're receiving this because you're a registered VibeBaze user.</p>
    </div>
  </div>
</body></html>`;
}

// ─── Main worker ───
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const respond = (data: Record<string, unknown>) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
  const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");
  const fcmProjectId = Deno.env.get("VITE_FIREBASE_PROJECT_ID");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Find a job to work on: prefer payload jobId, else next pending/processing
    let targetJobId: string | undefined;
    try {
      const payload = await req.json().catch(() => ({}));
      targetJobId = payload?.jobId;
    } catch (_) { /* no body */ }

    let job: any = null;
    if (targetJobId) {
      const { data } = await supabase.from("broadcast_jobs").select("*").eq("id", targetJobId).maybeSingle();
      job = data;
    } else {
      const { data } = await supabase
        .from("broadcast_jobs")
        .select("*")
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      job = data;
    }

    if (!job) return respond({ message: "no job to process" });
    if (job.status === "completed" || job.status === "failed") {
      return respond({ message: "job already finished", status: job.status });
    }

    // Mark processing
    if (job.status === "pending") {
      await supabase
        .from("broadcast_jobs")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", job.id);
      job.status = "processing";
    }

    const channel = job.channel as string;
    let workDone = false;

    // ── EMAIL BATCH ──
    if ((channel === "both" || channel === "email") && !job.email_done) {
      if (!resendApiKey) {
        await supabase.from("broadcast_jobs").update({
          email_done: true,
          last_error: "RESEND_API_KEY not configured",
        }).eq("id", job.id);
      } else {
        const resend = new Resend(resendApiKey);

        // Cursor-based pagination over auth.users by email (sortable)
        // We use admin.listUsers with page tracking by storing the last email seen
        // Page through all users, skip until past cursor, then take EMAIL_BATCH
        let page = 1;
        const perPage = 1000;
        const cursor = job.email_cursor as string | null;
        const batch: string[] = [];
        let totalSeen = job.total_users || 0;
        let exhausted = false;
        let lastEmailInBatch: string | null = cursor;

        // Walk pages until we collect EMAIL_BATCH new users past cursor
        while (batch.length < EMAIL_BATCH) {
          const { data: listData, error } = await supabase.auth.admin.listUsers({ page, perPage });
          if (error || !listData?.users?.length) { exhausted = true; break; }

          // Sort by email for stable cursor
          const sorted = [...listData.users]
            .filter((u: any) => u.email && u.email_confirmed_at)
            .sort((a: any, b: any) => (a.email || "").localeCompare(b.email || ""));

          // On the very first run, count totals (only if not yet set)
          if (!cursor && page === 1 && !job.total_users) {
            // Quick count: walk all pages just to count (cheap on small datasets, acceptable)
            // We approximate by counting current page; full total updated incrementally below.
          }

          for (const u of sorted) {
            const email = (u as any).email as string;
            if (cursor && email <= cursor) continue;
            batch.push(email);
            lastEmailInBatch = email;
            if (batch.length >= EMAIL_BATCH) break;
          }

          if (listData.users.length < perPage) { exhausted = true; break; }
          page++;
        }

        // Update total_users best-effort (use sent + remaining as rough estimate)
        if (batch.length === 0 && exhausted) {
          await supabase.from("broadcast_jobs").update({ email_done: true }).eq("id", job.id);
        } else if (batch.length > 0) {
          totalSeen = (job.email_sent || 0) + (job.email_failed || 0) + batch.length;

          const subjectPrefix = typeEmoji[job.message_type] || "📢";
          const html = buildEmailHtml(job.title, job.body, job.message_type);

          const results = await Promise.allSettled(
            batch.map((email) =>
              resend.emails.send({
                from: "VibeBaze <updates@vibebaze.com>",
                to: [email],
                subject: `${subjectPrefix} ${job.title}`,
                html,
              }).catch((e) => { throw e; })
            ),
          );

          let sent = 0, failed = 0;
          for (const r of results) {
            if (r.status === "fulfilled") sent++;
            else failed++;
          }

          await supabase.from("broadcast_jobs").update({
            email_sent: (job.email_sent || 0) + sent,
            email_failed: (job.email_failed || 0) + failed,
            email_cursor: lastEmailInBatch,
            total_users: Math.max(job.total_users || 0, totalSeen),
            email_done: exhausted,
          }).eq("id", job.id);

          workDone = true;
          console.log(`[job ${job.id}] email batch: ${sent} sent, ${failed} failed`);
        }
      }
    }

    // ── PUSH BATCH ──
    if ((channel === "both" || channel === "push") && !job.push_done) {
      if (!fcmClientEmail || !fcmPrivateKey || !fcmProjectId) {
        await supabase.from("broadcast_jobs").update({
          push_done: true,
          last_error: "FCM not configured",
        }).eq("id", job.id);
      } else {
        // Cursor by id (uuid stable order)
        let query = supabase
          .from("push_subscriptions")
          .select("id, endpoint")
          .order("id", { ascending: true })
          .limit(PUSH_BATCH);

        if (job.push_cursor) query = query.gt("id", job.push_cursor);
        const { data: subs, error: subsErr } = await query;

        if (subsErr) {
          console.error("push fetch error:", subsErr);
        } else if (!subs || subs.length === 0) {
          await supabase.from("broadcast_jobs").update({ push_done: true }).eq("id", job.id);
        } else {
          let accessToken: string | null = null;
          try {
            accessToken = await getAccessToken(fcmClientEmail, fcmPrivateKey);
          } catch (e) {
            console.error("FCM auth failed:", e);
            await supabase.from("broadcast_jobs").update({
              push_done: true,
              last_error: "FCM auth failed",
            }).eq("id", job.id);
          }

          if (accessToken) {
            const url = job.url || "/notifications";
            const invalidIds: string[] = [];
            let sent = 0, failed = 0;

            for (const sub of subs) {
              try {
                const r = await sendFCM(accessToken, fcmProjectId, sub.endpoint, job.title, job.body, url);
                if (r.success) sent++;
                else {
                  failed++;
                  if (r.invalid) invalidIds.push(sub.id);
                }
              } catch (_e) {
                failed++;
              }
            }

            if (invalidIds.length > 0) {
              await supabase.from("push_subscriptions").delete().in("id", invalidIds);
            }

            const newCursor = subs[subs.length - 1].id;
            const exhausted = subs.length < PUSH_BATCH;

            await supabase.from("broadcast_jobs").update({
              push_sent: (job.push_sent || 0) + sent,
              push_failed: (job.push_failed || 0) + failed,
              tokens_removed: (job.tokens_removed || 0) + invalidIds.length,
              total_subscriptions: (job.total_subscriptions || 0) + subs.length,
              push_cursor: newCursor,
              push_done: exhausted,
            }).eq("id", job.id);

            workDone = true;
            console.log(`[job ${job.id}] push batch: ${sent} sent, ${failed} failed`);
          }
        }
      }
    }

    // Refresh job
    const { data: updated } = await supabase
      .from("broadcast_jobs")
      .select("*")
      .eq("id", job.id)
      .single();

    const fullyDone = (updated?.email_done || channel === "push") &&
                      (updated?.push_done || channel === "email");

    if (fullyDone) {
      await supabase.from("broadcast_jobs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);

      try {
        await supabase.from("admin_logs").insert({
          admin_id: job.admin_id,
          action_type: "broadcast_completed",
          target_type: "broadcast_job",
          target_id: job.id,
          new_value: {
            email_sent: updated?.email_sent,
            email_failed: updated?.email_failed,
            push_sent: updated?.push_sent,
            push_failed: updated?.push_failed,
          },
        });
      } catch (_) { /* ignore */ }

      return respond({ status: "completed", jobId: job.id });
    }

    // Self-invoke for next batch (rate-limited delay)
    if (workDone) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      // Fire-and-forget
      fetch(`${supabaseUrl}/functions/v1/process-broadcast-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ jobId: job.id }),
      }).catch((e) => console.error("self-invoke failed:", e));
    }

    return respond({ status: "processing", jobId: job.id });
  } catch (error: unknown) {
    console.error("worker error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return respond({ success: false, error: message });
  }
});