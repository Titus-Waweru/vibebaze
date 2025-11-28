import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import FollowListModal from "@/components/FollowListModal";

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followModal, setFollowModal] = useState<{ open: boolean; type: "followers" | "following" }>({
    open: false,
    type: "followers",
  });

  useEffect(() => {
    // If viewing own profile, redirect to /profile
    if (user && userId === user.id) {
      navigate("/profile");
      return;
    }
    if (userId) {
      fetchProfile();
      fetchUserPosts();
    }
  }, [userId, user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
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
        .eq("user_id", userId)
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const openFollowersModal = () => {
    setFollowModal({ open: true, type: "followers" });
  };

  const openFollowingModal = () => {
    setFollowModal({ open: true, type: "following" });
  };

  if (loading || !profile) {
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

              {/* Follow Button */}
              <div className="w-full max-w-md">
                <FollowButton
                  targetUserId={userId!}
                  currentUserId={user?.id}
                  variant="default"
                  size="lg"
                />
              </div>
            </div>

            {/* Posts Grid */}
            <div className="mt-8 border-t border-border pt-8">
              <h3 className="text-lg font-semibold mb-4">Posts</h3>
              {posts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No public posts yet.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      {post.media_url ? (
                        post.type === "video" ? (
                          <video
                            src={post.media_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={post.media_url}
                            alt="Post"
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-secondary">
                          <p className="text-xs text-foreground line-clamp-3">{post.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <FollowListModal
        open={followModal.open}
        onOpenChange={(open) => setFollowModal((prev) => ({ ...prev, open }))}
        userId={userId!}
        type={followModal.type}
        currentUserId={user?.id}
      />
    </div>
  );
};

export default UserProfile;
