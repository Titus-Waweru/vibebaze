import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  username: string;
  fullName?: string;
  referredBy?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, username, fullName, referredBy }: WelcomeEmailRequest = await req.json();

    if (!email || !username) {
      throw new Error("Missing required fields");
    }

    const displayName = fullName || username;

    const emailResponse = await resend.emails.send({
      from: "VibeBaze <no-reply@vibebaze.com>",
      to: [email],
      subject: `Welcome to VibeBaze, ${displayName}! 🎉`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to VibeBaze</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 16px; overflow: hidden;">
    
    <!-- Header with Logo -->
    <div style="text-align: center; padding: 40px 20px 20px;">
      <img src="https://vibebaze.com/vibebaze-logo.png" alt="VibeBaze" style="width: 80px; height: 80px; object-fit: contain;" />
      <h1 style="margin: 16px 0 0; font-size: 32px; background: linear-gradient(135deg, #e94560 0%, #ff6b9d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
        Welcome to VibeBaze!
      </h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 20px 40px;">
      <p style="color: #ffffff; font-size: 18px; line-height: 1.6; margin-bottom: 24px;">
        Hey <strong>${displayName}</strong>! 👋
      </p>
      
      <p style="color: #cccccc; font-size: 16px; line-height: 1.8; margin-bottom: 24px;">
        You've just joined <strong style="color: #e94560;">Africa's fastest-growing creator platform</strong>. 
        VibeBaze is where Kenyan creators like you turn their passion into income.
      </p>

      ${referredBy ? `
      <div style="background: rgba(233, 69, 96, 0.1); border: 1px solid rgba(233, 69, 96, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #e94560; font-size: 14px; margin: 0;">
          🎁 <strong>You were invited by a friend!</strong> They'll earn 50 VibePoints once you verify your email.
        </p>
      </div>
      ` : ''}

      <!-- Earning Potential Section -->
      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px;">💰 Your Earning Potential</h2>
        
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <div style="flex: 1; min-width: 140px; background: rgba(233, 69, 96, 0.15); border-radius: 8px; padding: 16px; text-align: center;">
            <p style="color: #e94560; font-size: 24px; font-weight: bold; margin: 0;">KSh 100+</p>
            <p style="color: #888888; font-size: 12px; margin: 8px 0 0;">Per 1,000 views</p>
          </div>
          <div style="flex: 1; min-width: 140px; background: rgba(233, 69, 96, 0.15); border-radius: 8px; padding: 16px; text-align: center;">
            <p style="color: #e94560; font-size: 24px; font-weight: bold; margin: 0;">Unlimited</p>
            <p style="color: #888888; font-size: 12px; margin: 8px 0 0;">Tips from fans</p>
          </div>
        </div>
      </div>

      <!-- Quick Start Guide -->
      <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 16px;">🚀 Get Started in 3 Steps:</h2>
      
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
          <span style="background: #e94560; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">1</span>
          <p style="color: #cccccc; margin: 4px 0 0;"><strong style="color: #ffffff;">Verify your email</strong> to unlock all features</p>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
          <span style="background: #e94560; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">2</span>
          <p style="color: #cccccc; margin: 4px 0 0;"><strong style="color: #ffffff;">Share your first vibe</strong> – video, photo, or audio</p>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <span style="background: #e94560; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">3</span>
          <p style="color: #cccccc; margin: 4px 0 0;"><strong style="color: #ffffff;">Hit 10K views</strong> to start earning real money</p>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.vibebaze.com/feed" 
           style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #ff6b9d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);">
          Start Creating Now →
        </a>
      </div>

      <!-- Referral Bonus -->
      <div style="background: rgba(46, 213, 115, 0.1); border: 1px solid rgba(46, 213, 115, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
        <p style="color: #2ed573; font-size: 16px; font-weight: bold; margin: 0 0 8px;">
          🌟 Invite Friends, Earn More!
        </p>
        <p style="color: #888888; font-size: 14px; margin: 0;">
          Earn <strong style="color: #2ed573;">50 VibePoints</strong> for every friend who joins. Share your unique link in your profile!
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
      <p style="color: #666666; font-size: 12px; margin: 0 0 8px;">
        © 2024 VibeBaze. Built for African Creators. 🌍
      </p>
      <p style="color: #666666; font-size: 12px; margin: 0;">
        <a href="https://www.vibebaze.com/privacy" style="color: #888888; text-decoration: none;">Privacy</a> · 
        <a href="https://www.vibebaze.com/terms" style="color: #888888; text-decoration: none;">Terms</a> · 
        <a href="https://www.vibebaze.com" style="color: #888888; text-decoration: none;">vibebaze.com</a>
      </p>
    </div>
  </div>
</body>
</html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
