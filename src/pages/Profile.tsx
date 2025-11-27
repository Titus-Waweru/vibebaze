import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Settings, LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 py-6 w-full max-w-md">
                <div>
                  <div className="text-2xl font-bold text-foreground">{profile.posts_count}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{profile.followers_count}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{profile.following_count}</div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </div>
              </div>

              {/* Actions */}
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
                      className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {post.media_url && (
                        <img
                          src={post.media_url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;