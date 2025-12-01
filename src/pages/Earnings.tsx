import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/Navbar";
import { ArrowLeft, DollarSign, Eye, TrendingUp, Sparkles, CheckCircle2, Clock, Loader2 } from "lucide-react";

const VIEWS_THRESHOLD = 10000;

const Earnings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTotalViews();
    }
  }, [user]);

  const fetchTotalViews = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("views_count")
        .eq("user_id", user?.id);

      if (error) throw error;

      const total = data?.reduce((sum, post) => sum + (post.views_count || 0), 0) || 0;
      setTotalViews(total);
    } catch (error) {
      console.error("Error fetching views:", error);
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.min((totalViews / VIEWS_THRESHOLD) * 100, 100);
  const isEligible = totalViews >= VIEWS_THRESHOLD;
  const viewsRemaining = Math.max(VIEWS_THRESHOLD - totalViews, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-6 max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Creator Earnings</h1>
        </div>

        {/* Hero Card */}
        <Card className="border-border/50 shadow-card bg-gradient-to-br from-primary/20 via-background to-accent/20 mb-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
          <CardHeader className="relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Creator Program
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4">
                <DollarSign className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Get Paid for Your Content
              </h2>
              <p className="text-muted-foreground">
                Reach {VIEWS_THRESHOLD.toLocaleString()} total views to unlock monetization
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="border-border/50 shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Views</span>
                <span className="font-semibold text-foreground">
                  {totalViews.toLocaleString()} / {VIEWS_THRESHOLD.toLocaleString()}
                </span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {progress.toFixed(1)}% complete
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Eye className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                {isEligible ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">You're eligible for payments!</span>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">
                      {viewsRemaining.toLocaleString()} views to go
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Keep creating great content!
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="border-border/50 shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {isEligible ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEligible ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-green-500 font-medium mb-2">
                    🎉 Congratulations! You've reached the milestone!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Our team will contact you within 48 hours to set up your payment details. 
                    Make sure your profile information is up to date.
                  </p>
                </div>
                <Button className="w-full" onClick={() => navigate("/settings")}>
                  Update Profile Information
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-sm">
                  Once you reach {VIEWS_THRESHOLD.toLocaleString()} total views, you'll be eligible 
                  to receive payments for your content. Focus on creating engaging videos, 
                  photos, and posts to grow your audience!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-medium text-foreground">Create Content</h4>
                <p className="text-sm text-muted-foreground">
                  Post videos, photos, and stories that resonate with your audience
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-medium text-foreground">Reach {VIEWS_THRESHOLD.toLocaleString()} Views</h4>
                <p className="text-sm text-muted-foreground">
                  Your total views across all posts count toward the threshold
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-medium text-foreground">Get Paid</h4>
                <p className="text-sm text-muted-foreground">
                  We'll reach out to set up your payments and start earning
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Earnings;
