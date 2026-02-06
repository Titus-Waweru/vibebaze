import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate cryptographically secure reset token
function generateResetToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
}

// Hash token for storage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token + Deno.env.get("ADMIN_SECRET"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const handler = async (req: Request): Promise<Response> => {
  // Get the origin from the request for dynamic URL generation
  const origin = req.headers.get("origin") || "https://www.vibebaze.com";
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      // Always return success to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const user = authUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // If no user found, still return success (prevent enumeration)
    if (!user) {
      console.log("Password reset requested for non-existent email");
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const tokenHash = await hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store hashed token
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        reset_token_hash: tokenHash,
        reset_token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error storing reset token:", updateError);
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Production reset URL (IMPORTANT: Always use production domain)
    const resetUrl = `${origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your VibeBaze password</title>
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
              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px; text-align: center;">Reset Your Password</h2>
              <p style="color: #a0aec0; font-size: 14px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #718096; font-size: 13px; text-align: center; margin: 24px 0 0;">
                ⏰ This link expires in <strong style="color: #ffffff;">30 minutes</strong>
              </p>
              
              <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="color: #718096; font-size: 12px; margin: 0; line-height: 1.6;">
                  <strong style="color: #a0aec0;">Can't click the button?</strong><br>
                  Copy this link into your browser:<br>
                  <span style="color: #667eea; word-break: break-all; font-size: 11px;">${resetUrl}</span>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 40px;">
              <div style="border-top: 1px solid #2d3748; padding-top: 24px;">
                <p style="color: #4a5568; font-size: 12px; text-align: center; margin: 0; line-height: 1.6;">
                  If you didn't request this password reset, please ignore this email or contact support if you have concerns.
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

    await resend.emails.send({
      from: "VibeBaze Security <no-reply@vibebaze.com>",
      to: [email],
      subject: "Reset your VibeBaze password",
      html: emailHtml,
    });

    console.log("Password reset email sent:", { to: email });

    return new Response(
      JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset:", error);
    // Still return success to prevent enumeration
    return new Response(
      JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
