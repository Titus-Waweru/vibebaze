import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Heart, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PostResult {
  id: string;
  caption: string | null;
  type: string;
  likes_count: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

const AdminLikesTab = () => {
  const { user } = useAuth();
  const [searchUsername, setSearchUsername] = useState("");
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adjustValues, setAdjustValues] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchUsername.trim()) return;
    setSearching(true);
    try {
      // Find user by username first
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
          id,
          caption,
          type,
          likes_count,
          created_at,
          profiles:user_id (username, avatar_url)
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts((data as any) || []);
    } catch (err) {
      toast.error("Failed to search posts");
    } finally {
      setSearching(false);
    }
  };

  const handleAdjust = async (post: PostResult) => {
    const rawVal = adjustValues[post.id];
    const delta = parseInt(rawVal || "0", 10);

    if (isNaN(delta) || delta === 0) {
      toast.error("Enter a non-zero number (positive to add, negative to remove)");
      return;
    }

    const newCount = Math.max(0, (post.likes_count || 0) + delta);

    setProcessing(post.id);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ likes_count: newCount })
        .eq("id", post.id);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user!.id,
        action_type: "adjust_likes",
        target_type: "post",
        target_id: post.id,
        old_value: { likes_count: post.likes_count },
        new_value: { likes_count: newCount },
        reason: `Admin manually adjusted likes by ${delta > 0 ? "+" : ""}${delta}`,
      });

      // Update local state
      setPosts(prev =>
        prev.map(p => p.id === post.id ? { ...p, likes_count: newCount } : p)
      );
      setAdjustValues(prev => ({ ...prev, [post.id]: "" }));
      toast.success(`✅ Likes updated to ${newCount}`);
    } catch (err) {
      toast.error("Failed to update likes");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Likes Boost Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Search a user's posts and manually adjust their like counts. All changes are logged.
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
                <div
                  key={post.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={(post.profiles as any)?.avatar_url || undefined} />
                      <AvatarFallback>{(post.profiles as any)?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {post.caption ? post.caption.slice(0, 60) + (post.caption.length > 60 ? "…" : "") : `[${post.type} post]`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Heart className="h-3 w-3 text-primary" />
                        <span className="font-semibold text-foreground">{post.likes_count}</span>
                        <span>likes</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      placeholder="+50 or -10"
                      value={adjustValues[post.id] || ""}
                      onChange={e =>
                        setAdjustValues(prev => ({ ...prev, [post.id]: e.target.value }))
                      }
                      className="w-28 h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAdjust(post)}
                      disabled={processing === post.id}
                      className="shrink-0"
                    >
                      {processing === post.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {posts.length === 0 && searchUsername && !searching && (
            <p className="text-center text-muted-foreground text-sm py-4">No posts found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLikesTab;
