import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import vibebazeLogo from "@/assets/vibebaze-logo.png";
import { Mail, RefreshCw, CheckCircle2, Shield } from "lucide-react";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  
  const email = searchParams.get("email") || user?.email || "";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    if (!user) {
      toast.error("Please log in first");
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { userId: user.id, otp },
      });

      if (error) throw error;

      if (data.success) {
        setVerified(true);
        toast.success("Email verified successfully!");
        setTimeout(() => navigate("/feed"), 2000);
      } else {
        toast.error(data.error || "Invalid code. Please try again.");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0 || !user) return;

    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { userId: user.id, email: user.email, type: "verification" },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Verification code sent!");
        setCountdown(60);
        setOtp("");
      } else {
        toast.error(data.error || "Failed to send code");
      }
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message || "Failed to send code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
          <CardContent className="pt-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h2>
            <p className="text-muted-foreground">
              Your account is now fully activated. Redirecting you to the app...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] animate-float" style={{ animationDelay: "2s" }} />

      <Card className="w-full max-w-md relative z-10 border-border/30 shadow-2xl backdrop-blur-xl bg-card/80">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <img src={vibebazeLogo} alt="VibeBaze" className="h-16 w-16 object-contain" />
          </div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription className="mt-2">
            We sent a 6-digit code to<br />
            <span className="text-foreground font-medium">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              disabled={loading}
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="w-12 h-14 text-xl font-bold" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl font-bold" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl font-bold" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl font-bold" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl font-bold" />
                <InputOTPSlot index={5} className="w-12 h-14 text-xl font-bold" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || loading}
            className="w-full bg-gradient-primary hover:shadow-glow h-12"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
            <Button
              variant="ghost"
              onClick={handleResendOTP}
              disabled={countdown > 0 || resending}
              className="text-primary hover:text-primary/80"
            >
              {resending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Code expires in 10 minutes. Check your spam folder if you don't see it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
