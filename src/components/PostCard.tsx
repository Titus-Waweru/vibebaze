import { Heart, MessageCircle, Share2, Bookmark, Link2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import CommentSheet from "./CommentSheet";
import VideoPlayer from "./VideoPlayer";
import TipButton from "./TipButton";
import { useWallet } from "@/hooks/useWallet";
import { downloadWithWatermark } from "@/utils/downloadWithWatermark";

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
    views_count?: number;
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
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [isSaved, setIsSaved] = useState(false);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();
  const { sendTip } = useWallet(currentUserId);

  // Check if this is the user's own post (don't show tip button)
  const isOwnPost = currentUserId === post.user_id;

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
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
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

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.profiles?.username || 'User'}`,
          text: post.caption || 'Check out this post!',
          url: url,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
      }
    }
    
    // Fallback to clipboard
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Direct link copied!");
  };

  const handleDownload = async () => {
    if (!post.media_url) return;
    
    setDownloading(true);
    const success = await downloadWithWatermark({
      url: post.media_url,
      filename: post.media_url.split("/").pop() || "media",
      username: post.profiles?.username || "user",
      type: post.type as "image" | "video",
    });
    
    if (success) {
      toast.success("Downloaded with VibeBaze watermark!");
    } else {
      toast.error("Failed to download");
    }
    setDownloading(false);
  };

  const handleProfileClick = () => {
    if (post.user_id === currentUserId) {
      navigate("/profile");
    } else {
      navigate(`/user/${post.user_id}`);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 animate-fade-in">
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
        >
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
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
          
          {/* Direct link button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Media */}
        {post.type === "image" && post.media_url && (
          <div className="relative w-full bg-muted">
            <img
              src={post.media_url}
              alt="Post"
              className="w-full max-h-[600px] object-contain"
            />
          </div>
        )}
        {post.type === "video" && post.media_url && (
          <VideoPlayer
            src={post.media_url}
            postId={post.id}
            likesCount={likesCount}
            commentsCount={commentsCount}
            viewsCount={post.views_count}
          />
        )}
        {post.type === "audio" && post.media_url && (
          <div className="p-8 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex items-center justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center">
                <svg className="w-12 h-12 text-background" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            </div>
            <audio src={post.media_url} controls className="w-full" />
          </div>
        )}
        {post.type === "text" && (
          <div className="p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 min-h-[200px] flex items-center justify-center">
            <p className="text-xl text-foreground text-center font-medium leading-relaxed">{post.caption}</p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCommentSheetOpen(true)}
                className="hover:text-primary"
              >
                <MessageCircle className="h-6 w-6" />
                <span className="ml-1">{commentsCount}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare} className="hover:text-accent">
                <Share2 className="h-6 w-6" />
              </Button>
              {/* Download Button - only for image/video posts */}
              {(post.type === "image" || post.type === "video") && post.media_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="hover:text-primary"
                >
                  <Download className={`h-5 w-5 ${downloading ? "animate-bounce" : ""}`} />
                </Button>
              )}
              {/* Tip Button - only show for other users' posts */}
              {!isOwnPost && currentUserId && (
                <TipButton
                  creatorId={post.user_id}
                  creatorUsername={post.profiles?.username || "user"}
                  postId={post.id}
                  onTip={(amount) => sendTip(post.user_id, amount, post.id)}
                />
              )}
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

      <CommentSheet
        open={commentSheetOpen}
        onOpenChange={setCommentSheetOpen}
        postId={post.id}
        currentUserId={currentUserId}
        onCommentCountChange={setCommentsCount}
      />
    </>
  );
};

export default PostCard;
