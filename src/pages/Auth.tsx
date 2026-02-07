import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { signIn, signUp } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import vibebazeLogo from "@/assets/vibebaze-logo.png";
import { Gift } from "lucide-react";
import { generateDeviceFingerprint } from "@/utils/deviceFingerprint";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const referralCode = searchParams.get("ref");
  const defaultTab = searchParams.get("mode") === "signup" || referralCode ? "signup" : "login";

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const africanNames = ["Brian Otieno", "Amina Hassan", "Wanjiku Mwangi", "Samuel Kiptoo", "Fatima Osei"];
  const randomName = africanNames[Math.floor(Math.random() * africanNames.length)];
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
  });

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast.error("Please enter your email address first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: { email: loginData.email },
      });

      if (error) throw error;

      toast.success("If this email exists, a reset link has been sent to your inbox.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      // Always show success to prevent email enumeration
      toast.success("If this email exists, a reset link has been sent to your inbox.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate("/feed");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.email || !signupData.password || !signupData.username || !signupData.fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    if (signupData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(
      signupData.email,
      signupData.password,
      signupData.username,
      signupData.fullName
    );
    
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Generate device fingerprint for abuse prevention
    const deviceFingerprint = generateDeviceFingerprint();

    // Handle referral if code exists - create pending referral (points awarded after first post)
    if (referralCode && data?.user) {
      try {
        // Find referrer by code
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("referral_code", referralCode.toUpperCase())
          .single();

        if (referrerProfile && referrerProfile.id !== data.user.id) {
          // Check for referral abuse
          const { data: abuseCheck } = await supabase
            .rpc("check_referral_abuse", {
              p_referrer_id: referrerProfile.id,
              p_ip_address: null,
              p_device_fingerprint: deviceFingerprint,
            });

          if (!abuseCheck) {
            // Check duplicate - one referral per referred user
            const { data: existing } = await supabase
              .from("referrals")
              .select("id")
              .eq("referred_id", data.user.id)
              .maybeSingle();

            if (!existing) {
              await supabase.from("referrals").insert({
                referrer_id: referrerProfile.id,
                referred_id: data.user.id,
                referral_code: referralCode.toUpperCase(),
                status: "pending",
                device_fingerprint: deviceFingerprint,
              });
              toast.success("Referral linked! Your friend earns points when you create your first post.");
            }
          } else {
            console.warn("Referral flagged as potential abuse");
          }
        }
      } catch (err) {
        console.error("Referral error:", err);
      }
    }

    // Send OTP for email verification AND welcome email
    if (data?.user) {
      try {
        // Send OTP
        await supabase.functions.invoke("send-otp", {
          body: { userId: data.user.id, email: signupData.email, type: "verification" },
        });

        // Send welcome email (async, don't wait)
        supabase.functions.invoke("send-welcome-email", {
          body: {
            email: signupData.email,
            username: signupData.username,
            fullName: signupData.fullName,
            referredBy: referralCode || undefined,
          },
        }).catch((e) => console.error("Welcome email error:", e));
        
        setLoading(false);
        toast.success("Account created! Please verify your email.");
        navigate(`/verify-email?email=${encodeURIComponent(signupData.email)}`);
        return;
      } catch (otpError) {
        console.error("OTP send error:", otpError);
        // Continue even if OTP fails - user can resend
      }
    }

    setLoading(false);
    toast.success("Account created! Welcome to VibeBaze!");
    navigate("/feed");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] animate-float" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] animate-pulse" />
      
      {/* Glass morphism card */}
      <Card className="w-full max-w-md relative z-10 border-border/30 shadow-2xl backdrop-blur-xl bg-card/80">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <img src={vibebazeLogo} alt="VibeBaze" className="h-20 w-20 object-contain" />
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent tracking-tight">
            VibeBaze
          </CardTitle>
          <CardDescription className="text-base mt-2">Where creators thrive</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="amina@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-primary hover:text-primary/80 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {referralCode && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-foreground">
                    You were invited! Your friend will earn <span className="font-semibold text-green-500">50 VibePoints</span> when you join.
                  </span>
                </div>
              )}
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="amina_creates"
                    value={signupData.username}
                    onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Full Name</Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder={randomName}
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="amina@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-muted-foreground"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;