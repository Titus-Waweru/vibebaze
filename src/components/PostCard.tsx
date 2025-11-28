import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    type: "video" | "image" | "audio" | "text";
    caption?: string;
    media_url?: string;
    thumbnail_url?: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    profiles?: {
      username: string;
      avatar_url?: string;
      full_name?: string;
    };
  };
  currentUserId?: string;
}

const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isSaved, setIsSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUserId) {
      checkLikeStatus();
      checkSaveStatus();
    }
  }, [currentUserId, post.id]);

  const checkLikeStatus = async () => {
    const { data } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    
    setIsLiked(!!data);
  };

  const checkSaveStatus = async () => {
    const { data } = await supabase
      .from("saved_posts")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    
    setIsSaved(!!data);
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error("Please log in to like posts");
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: currentUserId });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      toast.error("Failed to update like");
    }
  };

  const handleSave = async () => {
    if (!currentUserId) {
      toast.error("Please log in to save posts");
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setIsSaved(false);
        toast.success("Removed from saved");
      } else {
        await supabase
          .from("saved_posts")
          .insert({ post_id: post.id, user_id: currentUserId });
        setIsSaved(true);
        toast.success("Post saved!");
      }
    } catch (error) {
      toast.error("Failed to save post");
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleProfileClick = () => {
    if (post.user_id === currentUserId) {
      navigate("/profile");
    } else {
      navigate(`/user/${post.user_id}`);
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 animate-fade-in">
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={handleProfileClick}
      >
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarImage src={post.profiles?.avatar_url} />
          <AvatarFallback className="bg-gradient-primary text-background">
            {post.profiles?.username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{post.profiles?.username || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Media */}
      {post.type === "image" && post.media_url && (
        <img
          src={post.media_url}
          alt="Post"
          className="w-full aspect-square object-cover"
        />
      )}
      {post.type === "video" && post.media_url && (
        <video
          src={post.media_url}
          controls
          className="w-full aspect-video object-cover bg-muted"
        />
      )}
      {post.type === "audio" && post.media_url && (
        <div className="p-8 bg-gradient-primary/10">
          <audio src={post.media_url} controls className="w-full" />
        </div>
      )}
      {post.type === "text" && (
        <div className="p-8 bg-gradient-secondary">
          <p className="text-lg text-foreground">{post.caption}</p>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`hover:text-primary transition-colors ${isLiked ? "text-primary" : ""}`}
            >
              <Heart className={`h-6 w-6 ${isLiked ? "fill-current" : ""}`} />
              <span className="ml-1">{likesCount}</span>
            </Button>
            <Button variant="ghost" size="sm" className="hover:text-primary">
              <MessageCircle className="h-6 w-6" />
              <span className="ml-1">{post.comments_count}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare} className="hover:text-accent">
              <Share2 className="h-6 w-6" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={`hover:text-accent transition-colors ${isSaved ? "text-accent" : ""}`}
          >
            <Bookmark className={`h-6 w-6 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>

        {/* Caption */}
        {post.caption && post.type !== "text" && (
          <p className="text-sm text-foreground">
            <span
              className="font-semibold cursor-pointer hover:underline"
              onClick={handleProfileClick}
            >
              {post.profiles?.username}
            </span>{" "}
            {post.caption}
          </p>
        )}
      </div>
    </div>
  );
};

export default PostCard;
