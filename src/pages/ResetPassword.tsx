import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff, CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import vibebazeLogo from "@/assets/vibebaze-logo.png";

type PageMode = "request" | "reset" | "success";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [mode, setMode] = useState<PageMode>(token ? "reset" : "request");
  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: { email },
      });

      if (error) throw error;

      toast.success("If this email exists, a reset link has been sent");
      setEmail("");
    } catch (error: any) {
      console.error("Reset request error:", error);
      // Still show success to prevent email enumeration
      toast.success("If this email exists, a reset link has been sent");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      toast.error("Please meet all password requirements");
      return;
    }

    if (!token || !emailParam) {
      toast.error("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { email: emailParam, token, newPassword: password },
      });

      if (error) throw error;

      if (data.success) {
        setMode("success");
        toast.success("Password updated successfully!");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
          <CardContent className="pt-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h2>
            <p className="text-muted-foreground mb-6">
              Your password has been updated successfully.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="bg-gradient-primary hover:shadow-glow"
            >
              Sign In Now
            </Button>
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
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={vibebazeLogo} alt="VibeBaze" className="h-16 w-16 object-contain" />
          </div>
          <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
            {mode === "reset" ? "Reset Password" : "Forgot Password?"}
          </CardTitle>
          <CardDescription>
            {mode === "reset"
              ? "Create a strong new password for your account"
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "request" ? (
            <form onSubmit={handleRequestReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow h-12"
                disabled={loading || !email}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground font-medium">Password must have:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex items-center gap-2 ${hasMinLength ? "text-green-500" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasUppercase ? "text-green-500" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasLowercase ? "text-green-500" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasNumber ? "text-green-500" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Number</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-destructive text-xs">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow h-12"
                disabled={loading || !isValid}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
