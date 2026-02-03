import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gift, Copy, Users, Check, Share2, Coins } from "lucide-react";

interface ReferralCardProps {
  userId: string;
}

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  points_awarded: number;
  created_at: string;
  referred_profile?: {
    username: string;
    avatar_url?: string;
  };
}

const ReferralCard = ({ userId }: ReferralCardProps) => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, [userId]);

  const fetchReferralData = async () => {
    try {
      // Get user's referral code
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setReferralCode(profile.referral_code);

      // Get referrals made by this user
      const { data: referralData, error: referralError } = await supabase
        .from("referrals")
        .select(`
          id,
          referred_id,
          status,
          points_awarded,
          created_at
        `)
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });

      if (referralError) throw referralError;

      // Calculate total points
      const points = referralData?.reduce((acc, r) => acc + (r.points_awarded || 0), 0) || 0;
      setTotalPoints(points);
      setReferrals(referralData || []);
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join VibeBaze!",
          text: "Join me on VibeBaze - Africa's creator platform! Use my referral link to get started.",
          url: referralLink,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-card overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Refer & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">Referrals</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-center">
            <Coins className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">VibePoints</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Your unique referral link:</p>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="text-xs bg-muted/30"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button onClick={handleShare} className="w-full bg-gradient-primary hover:shadow-glow">
          <Share2 className="h-4 w-4 mr-2" />
          Share & Earn 50 VibePoints
        </Button>

        {/* How it works */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Earn <span className="text-primary font-medium">50 VibePoints</span> for each friend who joins.
            Convert <span className="text-amber-500 font-medium">3000 points</span> to <span className="font-medium">KSh 300</span>!
          </p>
        </div>

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Recent Referrals</p>
            <div className="space-y-1">
              {referrals.slice(0, 3).map((ref) => (
                <div key={ref.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">User joined</span>
                  <Badge variant={ref.status === "rewarded" ? "default" : "outline"}>
                    {ref.status === "rewarded" ? `+${ref.points_awarded} pts` : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
