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
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
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
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
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
      <Navbar />
      
      <div className="container mx-auto px-4 pt-6 max-w-2xl">
        <Tabs defaultValue="foryou" className="w-full">
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
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No posts yet. Be the first to create one!</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user?.id} />
              ))
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-6">
            <div className="text-center py-20">
              <p className="text-muted-foreground">Follow users to see their posts here</p>
            </div>
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <div className="text-center py-20">
              <p className="text-muted-foreground">Trending posts coming soon!</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Feed;