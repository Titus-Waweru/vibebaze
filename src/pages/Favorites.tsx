import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/PostCard";
import SEO from "@/components/SEO";
import { Bookmark, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlaybackProvider } from "@/contexts/VideoPlaybackContext";

const Favorites = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/favorites", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("saved_posts")
        .select("created_at, post_id, posts:post_id(*, profiles:user_id(username, full_name, avatar_url))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = (data || [])
        .map((row: any) => row?.posts)
        .filter((p: any) => p && p.id);
      setPosts(mapped);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError("We couldn't load your saved posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <SEO title="Favorites | VibeBaze" description="Posts you have saved on VibeBaze." path="/favorites" />
      <Navbar />
      <div className="container mx-auto px-4 pt-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Your Favorites</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20 px-6 rounded-2xl border border-destructive/40 bg-card/40 backdrop-blur-sm">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchFavorites} variant="outline">Try again</Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/60" />
            <h2 className="text-lg font-semibold mb-2">You haven't saved anything yet</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tap the bookmark icon on any post to save it here.
            </p>
            <Button onClick={() => navigate("/feed")} className="bg-gradient-primary text-primary-foreground">
              Start exploring
            </Button>
          </div>
        ) : (
          <VideoPlaybackProvider>
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user!.id} />
              ))}
            </div>
          </VideoPlaybackProvider>
        )}
      </div>
    </div>
  );
};

export default Favorites;
