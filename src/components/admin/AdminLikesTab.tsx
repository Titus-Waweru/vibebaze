import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Heart, Search, Eye, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PostResult {
  id: string;
  caption: string | null;
  type: string;
  likes_count: number;
  views_count: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

interface UserResult {
  id: string;
  username: string;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
}

const AdminLikesTab = () => {
  const { user } = useAuth();

  // Post search
  const [searchUsername, setSearchUsername] = useState("");
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adjustValues, setAdjustValues] = useState<Record<string, string>>({});
  const [viewAdjustValues, setViewAdjustValues] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  // User search for follower adjustment
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [followerAdjust, setFollowerAdjust] = useState<Record<string, string>>({});
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchUsername.trim()) return;
    setSearching(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", searchUsername.trim())
        .maybeSingle();

      if (!profile) {
        toast.error("User not found");
        setPosts([]);
        setSearching(false);
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, caption, type, likes_count, views_count, created_at,
          profiles:user_id (username, avatar_url)
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts((data as any) || []);
    } catch {
      toast.error("Failed to search posts");
    } finally {
      setSearching(false);
    }
  };

  const handleAdjustLikes = async (post: PostResult) => {
    const delta = parseInt(adjustValues[post.id] || "0", 10);
    if (isNaN(delta) || delta === 0) {
      toast.error("Enter a non-zero number");
      return;
    }
    const newCount = Math.max(0, (post.likes_count || 0) + delta);
    setProcessing(`likes-${post.id}`);
    try {
      const { error } = await supabase.from("posts").update({ likes_count: newCount }).eq("id", post.id);
      if (error) throw error;
      await supabase.from("admin_logs").insert({
        admin_id: user!.id, action_type: "adjust_likes", target_type: "post", target_id: post.id,
        old_value: { likes_count: post.likes_count }, new_value: { likes_count: newCount },
        reason: `Admin adjusted likes by ${delta > 0 ? "+" : ""}${delta}`,
      });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: newCount } : p));
      setAdjustValues(prev => ({ ...prev, [post.id]: "" }));
      toast.success(`Likes updated to ${newCount}`);
    } catch { toast.error("Failed to update likes"); }
    finally { setProcessing(null); }
  };

  const handleAdjustViews = async (post: PostResult) => {
    const delta = parseInt(viewAdjustValues[post.id] || "0", 10);
    if (isNaN(delta) || delta === 0) {
      toast.error("Enter a non-zero number");
      return;
    }
    const newCount = Math.max(0, (post.views_count || 0) + delta);
    setProcessing(`views-${post.id}`);
    try {
      const { error } = await supabase.from("posts").update({ views_count: newCount }).eq("id", post.id);
      if (error) throw error;
      await supabase.from("admin_logs").insert({
        admin_id: user!.id, action_type: "adjust_views", target_type: "post", target_id: post.id,
        old_value: { views_count: post.views_count }, new_value: { views_count: newCount },
        reason: `Admin adjusted views by ${delta > 0 ? "+" : ""}${delta}`,
      });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, views_count: newCount } : p));
      setViewAdjustValues(prev => ({ ...prev, [post.id]: "" }));
      toast.success(`Views updated to ${newCount}`);
    } catch { toast.error("Failed to update views"); }
    finally { setProcessing(null); }
  };

  const handleUserSearch = async () => {
    if (!userSearch.trim()) return;
    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, followers_count, following_count")
        .ilike("username", `%${userSearch.trim()}%`)
        .limit(10);
      if (error) throw error;
      setUserResults(data || []);
      if (!data?.length) toast.info("No users found");
    } catch { toast.error("Failed to search"); }
    finally { setSearchingUsers(false); }
  };

  const handleAdjustFollowers = async (u: UserResult) => {
    const delta = parseInt(followerAdjust[u.id] || "0", 10);
    if (isNaN(delta) || delta === 0) {
      toast.error("Enter a non-zero number");
      return;
    }
    const newCount = Math.max(0, (u.followers_count || 0) + delta);
    setProcessingUser(u.id);
    try {
      const { error } = await supabase.from("profiles").update({ followers_count: newCount }).eq("id", u.id);
      if (error) throw error;
      await supabase.from("admin_logs").insert({
        admin_id: user!.id, action_type: "adjust_followers", target_type: "user", target_id: u.id,
        old_value: { followers_count: u.followers_count }, new_value: { followers_count: newCount },
        reason: `Admin adjusted followers by ${delta > 0 ? "+" : ""}${delta}`,
      });
      setUserResults(prev => prev.map(p => p.id === u.id ? { ...p, followers_count: newCount } : p));
      setFollowerAdjust(prev => ({ ...prev, [u.id]: "" }));
      toast.success(`Followers updated to ${newCount}`);
    } catch { toast.error("Failed to update followers"); }
    finally { setProcessingUser(null); }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <Heart className="h-4 w-4" /> Post Stats
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> User Stats
          </TabsTrigger>
        </TabsList>

        {/* Post likes/views adjustment */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Post Stats Override
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Search a user's posts and adjust like/view counts. All changes are logged.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username..."
                  value={searchUsername}
                  onChange={e => setSearchUsername(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {posts.length > 0 && (
                <div className="space-y-3 mt-4">
                  {posts.map(post => (
                    <div key={post.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={(post.profiles as any)?.avatar_url || undefined} />
                          <AvatarFallback>{(post.profiles as any)?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {post.caption ? post.caption.slice(0, 60) + (post.caption.length > 60 ? "…" : "") : `[${post.type} post]`}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3 text-primary" />
                              <span className="font-semibold text-foreground">{post.likes_count}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-primary" />
                              <span className="font-semibold text-foreground">{post.views_count || 0}</span>
                            </span>
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Likes adjustment */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">Likes:</span>
                        <Input
                          type="number" placeholder="+50 or -10"
                          value={adjustValues[post.id] || ""}
                          onChange={e => setAdjustValues(prev => ({ ...prev, [post.id]: e.target.value }))}
                          className="w-28 h-8 text-sm"
                        />
                        <Button size="sm" onClick={() => handleAdjustLikes(post)} disabled={processing === `likes-${post.id}`} className="shrink-0">
                          {processing === `likes-${post.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                        </Button>
                      </div>

                      {/* Views adjustment */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">Views:</span>
                        <Input
                          type="number" placeholder="+100 or -20"
                          value={viewAdjustValues[post.id] || ""}
                          onChange={e => setViewAdjustValues(prev => ({ ...prev, [post.id]: e.target.value }))}
                          className="w-28 h-8 text-sm"
                        />
                        <Button size="sm" onClick={() => handleAdjustViews(post)} disabled={processing === `views-${post.id}`} className="shrink-0">
                          {processing === `views-${post.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User follower adjustment */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Follower Override
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Search a user and adjust their follower count. All changes are logged.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUserSearch()}
                />
                <Button onClick={handleUserSearch} disabled={searchingUsers}>
                  {searchingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {userResults.length > 0 && (
                <div className="space-y-3 mt-4">
                  {userResults.map(u => (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>{u.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">@{u.username}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span className="font-semibold text-foreground">{u.followers_count}</span>
                            <span>followers</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number" placeholder="+100 or -10"
                          value={followerAdjust[u.id] || ""}
                          onChange={e => setFollowerAdjust(prev => ({ ...prev, [u.id]: e.target.value }))}
                          className="w-28 h-8 text-sm"
                        />
                        <Button size="sm" onClick={() => handleAdjustFollowers(u)} disabled={processingUser === u.id} className="shrink-0">
                          {processingUser === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLikesTab;
