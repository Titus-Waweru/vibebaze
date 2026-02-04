import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple hash function for OTP (in production, use crypto.subtle)
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("ADMIN_SECRET"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, type = "verification" } = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit (max 3 per hour)
    const { data: canRequest } = await supabase.rpc("check_otp_rate_limit", { p_user_id: userId });

    if (!canRequest) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please wait before trying again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store hashed OTP
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        otp_hash: otpHash,
        otp_expires_at: expiresAt.toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error storing OTP:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to process request" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Increment rate limit
    await supabase.rpc("increment_otp_attempts", { p_user_id: userId });

    // Send email
    const subject = type === "verification" 
      ? "Verify your VibeBaze account" 
      : "Your VibeBaze security code";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <img src="https://www.vibebaze.com/pwa-192x192.png" alt="VibeBaze" width="80" height="80" style="border-radius: 16px;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 20px 0 0; font-weight: 700;">VibeBaze</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px; text-align: center;">${subject}</h2>
              <p style="color: #a0aec0; font-size: 14px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                Use the code below to ${type === "verification" ? "verify your email address" : "complete your request"}:
              </p>
              
              <!-- OTP Code -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;">
                  ${otp}
                </span>
              </div>
              
              <p style="color: #718096; font-size: 13px; text-align: center; margin: 24px 0 0;">
                ⏰ This code expires in <strong style="color: #ffffff;">10 minutes</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 40px;">
              <div style="border-top: 1px solid #2d3748; padding-top: 24px;">
                <p style="color: #4a5568; font-size: 12px; text-align: center; margin: 0; line-height: 1.6;">
                  If you didn't request this code, please ignore this email.<br>
                  Your account remains secure.
                </p>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Legal Footer -->
        <table width="100%" max-width="480" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 24px 20px; text-align: center;">
              <p style="color: #4a5568; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} VibeBaze. All rights reserved.<br>
                <a href="https://www.vibebaze.com/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a> • 
                <a href="https://www.vibebaze.com/terms" style="color: #667eea; text-decoration: none;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "VibeBaze Security <no-reply@vibebaze.com>",
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    console.log("OTP email sent:", { to: email, type });

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-otp:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send verification code" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
