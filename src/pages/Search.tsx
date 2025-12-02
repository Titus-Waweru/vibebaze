import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon, Hash, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SearchTab = "users" | "hashtags" | "posts";

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("users");
  const [loading, setLoading] = useState(false);
  
  const [users, setUsers] = useState<any[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const debounce = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setUsers([]);
      setHashtags([]);
      setPosts([]);
    }
  }, [searchQuery, activeTab]);

  const performSearch = async () => {
    setLoading(true);
    try {
      if (activeTab === "users") {
        await searchUsers();
      } else if (activeTab === "hashtags") {
        await searchHashtags();
      } else if (activeTab === "posts") {
        await searchPosts();
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
      .limit(20);

    if (error) throw error;
    setUsers(data || []);
  };

  const searchHashtags = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("hashtags")
      .not("hashtags", "is", null);

    if (error) throw error;

    // Extract and filter unique hashtags
    const allHashtags = new Set<string>();
    data?.forEach((post) => {
      post.hashtags?.forEach((tag: string) => {
        if (tag.toLowerCase().includes(searchQuery.toLowerCase())) {
          allHashtags.add(tag);
        }
      });
    });

    setHashtags(Array.from(allHashtags).slice(0, 20));
  };

  const searchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .ilike("caption", `%${searchQuery}%`)
      .eq("is_private", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    setPosts(data || []);
  };

  const handleHashtagClick = (tag: string) => {
    navigate(`/feed?hashtag=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-6 max-w-2xl">
        {/* Search Input */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users, hashtags, posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SearchTab)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !searchQuery ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Start typing to search users</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <Card
                    key={user.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/user/${user.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-gradient-primary text-background">
                            {user.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{user.username}</p>
                          {user.full_name && (
                            <p className="text-sm text-muted-foreground">{user.full_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {user.followers_count} followers
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Hashtags Tab */}
          <TabsContent value="hashtags">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !searchQuery ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Start typing to search hashtags</p>
              </div>
            ) : hashtags.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No hashtags found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hashtags.map((tag, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleHashtagClick(tag)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-primary/20">
                          <Hash className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">#{tag}</p>
                          <p className="text-sm text-muted-foreground">Tap to view posts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !searchQuery ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Start typing to search posts</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No posts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/feed?postId=${post.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {/* Thumbnail/Media Preview */}
                        {post.media_url && (
                          <div className="flex-shrink-0 w-20 h-20 bg-muted rounded-lg overflow-hidden">
                            {post.type === "video" ? (
                              <video
                                src={post.media_url}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={post.media_url}
                                alt="Post thumbnail"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        )}
                        
                        {/* Post Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={post.profiles?.avatar_url} />
                              <AvatarFallback className="bg-gradient-primary text-background text-xs">
                                {post.profiles?.username?.[0]?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-medium text-foreground">
                              {post.profiles?.username}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.caption || "No caption"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{post.likes_count} likes</span>
                            <span>{post.comments_count} comments</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Search;
