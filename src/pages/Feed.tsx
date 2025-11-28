import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from "@/components/PostCard";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

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
        .limit(20);

      if (error) throw error;
      setForYouPosts(data || []);
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
      
      // First get the list of users the current user follows
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

      // Then fetch posts from those users
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
      setFollowingPosts(data || []);
    } catch (error) {
      console.error("Error fetching following posts:", error);
    } finally {
      setFollowingLoading(false);
    }
  };

  const fetchTrendingPosts = async () => {
    try {
      setTrendingLoading(true);
      
      // Fetch posts ordered by likes_count for trending
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
        .limit(20);

      if (error) throw error;
      setTrendingPosts(data || []);
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
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-6 max-w-2xl">
        <Tabs defaultValue="foryou" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="foryou">For You</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          <TabsContent value="foryou" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : forYouPosts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No posts yet. Be the first to create one!</p>
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
                <p className="text-muted-foreground">Follow users to see their posts here</p>
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
                <p className="text-muted-foreground">No trending posts yet</p>
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
  );
};

export default Feed;
