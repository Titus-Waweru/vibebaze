import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from "@/components/PostCard";
import Navbar from "@/components/Navbar";
import { Loader2, MessageCircle, Sparkles, Users, Flame } from "lucide-react";
import { VideoPlaybackProvider } from "@/contexts/VideoPlaybackContext";
import { Button } from "@/components/ui/button";

// Calculate engagement score for ranking
const calculateEngagementScore = (post: any): number => {
  const likes = post.likes_count || 0;
  const comments = post.comments_count || 0;
  const shares = post.shares_count || 0;
  const views = post.views_count || 0;
  
  // Weight: comments are most valuable, then likes, shares, views
  const score = (comments * 3) + (likes * 2) + (shares * 1.5) + (views * 0.1);
  
  // Boost recent posts (within last 24 hours)
  const hoursAgo = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  const recencyBoost = hoursAgo < 24 ? 1.5 : hoursAgo < 72 ? 1.2 : 1;
  
  return score * recencyBoost;
};

const Feed = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [forYouPosts, setForYouPosts] = useState<any[]>([]);
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("foryou");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchForYouPosts();
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === "following" && followingPosts.length === 0) {
      fetchFollowingPosts();
    }
    if (user && activeTab === "trending" && trendingPosts.length === 0) {
      fetchTrendingPosts();
    }
  }, [activeTab, user]);

  const fetchForYouPosts = async () => {
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
        .eq("is_private", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Filter out posts with unavailable media (media_url set but potentially broken)
      const validPosts = (data || []).filter(post => {
        // Text posts don't need media
        if (post.type === "text") return true;
        // Media posts must have a media_url
        if (!post.media_url) return false;
        return true;
      });

      // Apply engagement-based algorithm
      const rankedPosts = validPosts
        .map(post => ({ ...post, engagementScore: calculateEngagementScore(post) }))
        .sort((a, b) => {
          const engagementDiff = b.engagementScore - a.engagementScore;
          const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          return (engagementDiff * 0.7) + (timeDiff * 0.0000003);
        })
        .slice(0, 20);
      
      setForYouPosts(rankedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowingPosts = async () => {
    if (!user) return;
    
    try {
      setFollowingLoading(true);
      
      const { data: followingData, error: followingError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followingError) throw followingError;

      if (!followingData || followingData.length === 0) {
        setFollowingPosts([]);
        return;
      }

      const followingIds = followingData.map((f) => f.following_id);

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
        .in("user_id", followingIds)
        .eq("is_private", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      // Filter out media posts without valid media_url
      const validPosts = (data || []).filter(post => {
        if (post.type === "text") return true;
        return !!post.media_url;
      });
      setFollowingPosts(validPosts);
    } catch (error) {
      console.error("Error fetching following posts:", error);
    } finally {
      setFollowingLoading(false);
    }
  };

  const fetchTrendingPosts = async () => {
    try {
      setTrendingLoading(true);
      
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
        .eq("is_private", false)
        .order("likes_count", { ascending: false })
        .order("comments_count", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Filter and re-rank by engagement score
      const validPosts = (data || []).filter(post => {
        if (post.type === "text") return true;
        if (!post.media_url) return false;
        return true;
      });
      
      const rankedPosts = validPosts
        .map(post => ({ ...post, engagementScore: calculateEngagementScore(post) }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 20);
      
      setTrendingPosts(rankedPosts);
    } catch (error) {
      console.error("Error fetching trending posts:", error);
    } finally {
      setTrendingLoading(false);
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
    <VideoPlaybackProvider>
      <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
        <Navbar />
        
        {/* Fixed Top Header - Mobile */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border md:hidden">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              VibeBaze
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/messages")}
              className="relative hover:bg-primary/10"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        <div className="container mx-auto px-4 pt-16 md:pt-6 max-w-2xl">
          <Tabs defaultValue="foryou" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-card/50 backdrop-blur-sm sticky top-14 md:top-20 z-30">
              <TabsTrigger value="foryou" className="gap-1.5 data-[state=active]:bg-primary/20">
                <Sparkles className="h-4 w-4" />
                <span className="hidden xs:inline">Vibes</span>
              </TabsTrigger>
              <TabsTrigger value="following" className="gap-1.5 data-[state=active]:bg-primary/20">
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline">Circle</span>
              </TabsTrigger>
              <TabsTrigger value="trending" className="gap-1.5 data-[state=active]:bg-primary/20">
                <Flame className="h-4 w-4" />
                <span className="hidden xs:inline">Hot</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="foryou" className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : forYouPosts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No vibes yet. Be the first to drop one!</p>
                </div>
              ) : (
                forYouPosts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={user?.id} />
                ))
              )}
            </TabsContent>

            <TabsContent value="following" className="space-y-6">
              {followingLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : followingPosts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">Build your circle to see their vibes here</p>
                </div>
              ) : (
                followingPosts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={user?.id} />
                ))
              )}
            </TabsContent>

            <TabsContent value="trending" className="space-y-6">
              {trendingLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : trendingPosts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No hot vibes yet</p>
                </div>
              ) : (
                trendingPosts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={user?.id} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </VideoPlaybackProvider>
  );
};

export default Feed;
