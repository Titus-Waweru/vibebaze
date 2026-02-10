import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PostCard from "@/components/PostCard";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { VideoPlaybackProvider } from "@/contexts/VideoPlaybackContext";
import { Card, CardContent } from "@/components/ui/card";
import vibebazeLogo from "@/assets/vibebaze-logo.png";

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) {
      fetchPost();
      incrementViewCount();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            full_name
          )
        `)
        .eq("id", postId)
        .single();

      if (error) throw error;
      
      if (!data) {
        setError("Post not found");
        return;
      }

      if (data.is_private && data.user_id !== user?.id) {
        setError("This post is private");
        return;
      }

      setPost(data);
    } catch (err) {
      console.error("Error fetching post:", err);
      setError("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    if (!postId) return;
    try {
      await supabase
        .from("posts")
        .update({ views_count: (post?.views_count || 0) + 1 })
        .eq("id", postId);
    } catch (err) {
      console.error("Failed to increment view count:", err);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
        <Navbar />
        <div className="container mx-auto px-4 pt-6 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-foreground mb-2">{error}</h1>
            <p className="text-muted-foreground mb-6">
              The post you're looking for might have been removed or is not accessible.
            </p>
            <Button onClick={() => navigate("/feed")}>Go to Feed</Button>
          </div>
        </div>
      </div>
    );
  }

  // Guest user — can view but not interact
  const isGuest = !user;

  return (
    <VideoPlaybackProvider>
      <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
        <Navbar />
        
        <div className="container mx-auto px-4 pt-6 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>

          {post && (
            <PostCard
              post={post}
              currentUserId={isGuest ? undefined : user?.id}
            />
          )}

          {/* Signup CTA for unauthenticated visitors */}
          {isGuest && post && (
            <Card className="mt-6 border-primary/30 bg-card/80 backdrop-blur-xl">
              <CardContent className="p-6 text-center space-y-4">
                <img src={vibebazeLogo} alt="VibeBaze" className="h-12 w-12 mx-auto" />
                <h3 className="text-lg font-bold text-foreground">Join VibeBaze</h3>
                <p className="text-sm text-muted-foreground">
                  Sign up to like, comment, tip creators, download content, and share your own vibes!
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate("/auth?mode=signup")} className="bg-gradient-primary gap-2">
                    <UserPlus className="h-4 w-4" />
                    Sign Up Free
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/auth")}>
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </VideoPlaybackProvider>
  );
};

export default PostDetail;
