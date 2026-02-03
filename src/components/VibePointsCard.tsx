import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, ArrowRight, Loader2, CheckCircle } from "lucide-react";

interface VibePointsCardProps {
  userId: string;
}

const VibePointsCard = ({ userId }: VibePointsCardProps) => {
  const [vibePoints, setVibePoints] = useState(0);
  const [pendingPoints, setPendingPoints] = useState(0);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const MINIMUM_CLAIM = 3000;
  const POINTS_TO_KES_RATE = 100 / 1000; // 1000 points = 100 KES

  useEffect(() => {
    fetchWalletData();
    
    // Subscribe to wallet changes
    const channel = supabase
      .channel("wallet_points")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const wallet = payload.new as any;
          setVibePoints(wallet.vibe_points || 0);
          setPendingPoints(wallet.pending_points || 0);
          setTotalClaimed(wallet.total_points_claimed || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("vibe_points, pending_points, total_points_claimed")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      
      setVibePoints(data.vibe_points || 0);
      setPendingPoints(data.pending_points || 0);
      setTotalClaimed(data.total_points_claimed || 0);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPoints = async () => {
    if (vibePoints < MINIMUM_CLAIM) {
      toast.error(`You need at least ${MINIMUM_CLAIM} points to claim`);
      return;
    }

    setClaiming(true);
    try {
      const { error } = await supabase.rpc("claim_points", {
        p_user_id: userId,
        p_points: vibePoints,
      });

      if (error) throw error;
      
      const kesAmount = (vibePoints * POINTS_TO_KES_RATE).toFixed(0);
      toast.success(`Claimed KSh ${kesAmount}! Processing to your wallet.`);
      fetchWalletData();
    } catch (error: any) {
      console.error("Error claiming points:", error);
      toast.error(error.message || "Failed to claim points");
    } finally {
      setClaiming(false);
    }
  };

  const progressToMinimum = Math.min((vibePoints / MINIMUM_CLAIM) * 100, 100);
  const canClaim = vibePoints >= MINIMUM_CLAIM;
  const kesValue = (vibePoints * POINTS_TO_KES_RATE).toFixed(0);

  if (loading) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-card overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            VibePoints
          </span>
          {pendingPoints > 0 && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              {pendingPoints} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Points Display */}
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
          <p className="text-4xl font-bold text-foreground">{vibePoints.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">
            ≈ KSh {kesValue}
          </p>
        </div>

        {/* Progress to Claim */}
        {!canClaim && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to claim</span>
              <span className="text-foreground font-medium">
                {vibePoints} / {MINIMUM_CLAIM}
              </span>
            </div>
            <Progress value={progressToMinimum} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Earn {MINIMUM_CLAIM - vibePoints} more points to claim KSh {(MINIMUM_CLAIM * POINTS_TO_KES_RATE).toFixed(0)}
            </p>
          </div>
        )}

        {/* Claim Button */}
        <Button
          onClick={handleClaimPoints}
          disabled={!canClaim || claiming}
          className={`w-full ${canClaim ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : ""}`}
        >
          {claiming ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : canClaim ? (
            <CheckCircle className="h-4 w-4 mr-2" />
          ) : (
            <Coins className="h-4 w-4 mr-2" />
          )}
          {canClaim ? `Claim KSh ${kesValue}` : `${MINIMUM_CLAIM - vibePoints} points to go`}
        </Button>

        {/* Stats */}
        <div className="pt-2 border-t border-border flex justify-between text-sm">
          <span className="text-muted-foreground">Total claimed</span>
          <span className="text-foreground font-medium">
            {totalClaimed.toLocaleString()} points (KSh {(totalClaimed * POINTS_TO_KES_RATE).toFixed(0)})
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default VibePointsCard;
