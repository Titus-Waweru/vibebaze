import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Settings, LogOut, Loader2, GraduationCap, Wallet, Gift, Trash2, ExternalLink } from "lucide-react";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";
import FollowListModal from "@/components/FollowListModal";
import ReferralCard from "@/components/ReferralCard";
import VibePointsCard from "@/components/VibePointsCard";
import DeletePostButton from "@/components/DeletePostButton";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followModal, setFollowModal] = useState<{ open: boolean; type: "followers" | "following" }>({
    open: false,
    type: "followers",
  });

  const openFollowersModal = () => {
    setFollowModal({ open: true, type: "followers" });
  };

  const openFollowingModal = () => {
    setFollowModal({ open: true, type: "following" });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserPosts();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  if (authLoading || loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-6 max-w-2xl">
        <Card className="border-border/50 shadow-card">
          <CardContent className="pt-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-gradient-primary text-background text-3xl">
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-2xl font-bold text-foreground">{profile.username}</h2>
                {profile.full_name && (
                  <p className="text-muted-foreground">{profile.full_name}</p>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-foreground max-w-md">{profile.bio}</p>
              )}

              {/* External Links */}
              {profile.external_links && Array.isArray(profile.external_links) && (profile.external_links as any[]).length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {(profile.external_links as any[]).map((link: any, i: number) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-primary transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </a>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 py-6 w-full max-w-md">
                <div>
                  <div className="text-2xl font-bold text-foreground">{profile.posts_count}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={openFollowersModal}
                >
                  <div className="text-2xl font-bold text-foreground">{profile.followers_count}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={openFollowingModal}
                >
                  <div className="text-2xl font-bold text-foreground">{profile.following_count}</div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                <Button
                  variant="outline"
                  className="flex-1 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-primary/30 hover:border-primary"
                  onClick={() => navigate("/wallet")}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Wallet
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 hover:border-green-500"
                  onClick={() => {
                    const element = document.getElementById('referral-section');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Refer
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500"
                  onClick={() => navigate("/creators-school")}
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Learn
                </Button>
              </div>

              {/* Profile Actions */}
              <div className="flex gap-4 w-full max-w-md">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="border-destructive/50 hover:bg-destructive/10 text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="mt-8 border-t border-border pt-8">
              <h3 className="text-lg font-semibold mb-4">Your Posts</h3>
              {posts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No posts yet. Create your first one!
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="aspect-square bg-muted rounded-lg overflow-hidden relative group"
                    >
                      {post.media_url && (
                        <img
                          src={post.media_url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      )}
                      {/* Delete overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <DeletePostButton
                          postId={post.id}
                          mediaUrl={post.media_url}
                          onDeleted={fetchUserPosts}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Referral & Points Section */}
        <div id="referral-section" className="mt-6 space-y-6">
          <ReferralCard userId={user.id} />
          <VibePointsCard userId={user.id} />
        </div>
      </div>

      <FollowListModal
        open={followModal.open}
        onOpenChange={(open) => setFollowModal((prev) => ({ ...prev, open }))}
        userId={user.id}
        type={followModal.type}
        currentUserId={user.id}
      />
    </div>
  );
};

export default Profile;