import { Heart, MessageCircle, Share2, Bookmark, Link2, Download, Sparkles, Flag, MoreVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import CommentSheet from "./CommentSheet";
import VideoPlayer from "./VideoPlayer";
import TipButton from "./TipButton";
import { useWallet } from "@/hooks/useWallet";
import { downloadWithWatermark } from "@/utils/downloadWithWatermark";
import ReportContentDialog from "./ReportContentDialog";
import { notifyPostLiked } from "@/lib/notificationService";
import EditPostModal from "./EditPostModal";
import DeletePostButton from "./DeletePostButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Check if post is less than 7 days old
const isNewPost = (createdAt: string): boolean => {
  const postDate = new Date(createdAt);
  const now = new Date();
  const diffTime = now.getTime() - postDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
};

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
    edited_at?: string;
    hashtags?: string[];
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
  const [editOpen, setEditOpen] = useState(false);
  const [localCaption, setLocalCaption] = useState(post.caption);
  const [localHashtags, setLocalHashtags] = useState(post.hashtags);
  const [editedAt, setEditedAt] = useState(post.edited_at);
  const navigate = useNavigate();
  const { sendTip } = useWallet(currentUserId);

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
    if (!currentUserId) { navigate("/auth"); return; }
    try {
      if (isLiked) {
        await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from("likes").insert({ post_id: post.id, user_id: currentUserId });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        if (post.user_id !== currentUserId) {
          const { data: profile } = await supabase.from("profiles").select("username").eq("id", currentUserId).maybeSingle();
          notifyPostLiked(post.user_id, profile?.username || "Someone").catch(() => {});
        }
      }
    } catch { toast.error("Failed to update like"); }
  };

  const handleSave = async () => {
    if (!currentUserId) { navigate("/auth"); return; }
    try {
      if (isSaved) {
        await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", currentUserId);
        setIsSaved(false);
        toast.success("Removed from saved");
      } else {
        await supabase.from("saved_posts").insert({ post_id: post.id, user_id: currentUserId });
        setIsSaved(true);
        toast.success("Post saved!");
      }
    } catch { toast.error("Failed to save post"); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    const title = `${post.profiles?.username || 'A creator'} on VibeBaze`;
    const text = post.caption ? `${post.caption}\n\n` : `Check out this ${post.type} on VibeBaze! `;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {}
    }
    // Desktop fallback: open WhatsApp/X share or copy
    const encoded = encodeURIComponent(`${text}${url}`);
    const wa = `https://wa.me/?text=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied! Opening WhatsApp...", { duration: 2000 });
    } catch {
      toast.success("Opening WhatsApp share...");
    }
    window.open(wa, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Direct link copied!");
  };

  const handleDownload = async () => {
    if (!currentUserId) { navigate("/auth"); return; }
    if (!post.media_url) return;
    setDownloading(true);
    const success = await downloadWithWatermark({
      url: post.media_url,
      filename: post.media_url.split("/").pop() || "media",
      username: post.profiles?.username || "user",
      type: post.type as "image" | "video",
    });
    if (success) toast.success("Downloaded with VibeBaze watermark!");
    else toast.error("Failed to download");
    setDownloading(false);
  };

  const handleProfileClick = () => {
    if (!currentUserId) {
      toast.info("Sign in to view profiles");
      navigate(`/auth?redirect=/user/${post.user_id}`);
      return;
    }
    if (post.user_id === currentUserId) navigate("/profile");
    else navigate(`/user/${post.user_id}`);
  };

  const handlePostEdited = (updates: { caption?: string; hashtags?: string[]; edited_at: string }) => {
    setLocalCaption(updates.caption);
    setLocalHashtags(updates.hashtags);
    setEditedAt(updates.edited_at);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 animate-fade-in">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleProfileClick}>
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
                {editedAt && " • Edited"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isNewPost(post.created_at) && (
              <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground gap-1 text-xs px-2 py-0.5">
                <Sparkles className="h-3 w-3" />
                NEW
              </Badge>
            )}

            {/* 3-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost && (
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Post
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                {!isOwnPost && currentUserId && (
                  <DropdownMenuItem asChild>
                    <ReportContentDialog
                      postId={post.id}
                      userId={post.user_id}
                      trigger={
                        <button className="flex items-center w-full px-2 py-1.5 text-sm text-destructive">
                          <Flag className="h-4 w-4 mr-2" />
                          Report
                        </button>
                      }
                    />
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Media */}
        {post.type === "image" && post.media_url && (
          <div className="relative w-full bg-muted">
            <img src={post.media_url} alt="Post" className="w-full max-h-[600px] object-contain" loading="lazy"
              onError={(e) => { const target = e.currentTarget; target.style.display = "none"; target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-48 text-muted-foreground text-sm">Image unavailable</div>'; }}
            />
          </div>
        )}
        {post.type === "video" && post.media_url && (
          <VideoPlayer src={post.media_url} postId={post.id} likesCount={likesCount} commentsCount={commentsCount} viewsCount={post.views_count} isGuest={!currentUserId} />
        )}
        {post.type === "audio" && post.media_url && (
          <div className="p-8 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex items-center justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center">
                <svg className="w-12 h-12 text-background" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
            </div>
            <audio src={post.media_url} controls className="w-full" />
          </div>
        )}
        {post.type === "text" && (
          <div className="p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 min-h-[200px] flex items-center justify-center">
            <p className="text-xl text-foreground text-center font-medium leading-relaxed">{localCaption}</p>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
              <Button variant="ghost" size="sm" onClick={handleLike} className={`px-2 min-h-[44px] hover:text-primary transition-colors ${isLiked ? "text-primary" : ""}`}>
                <Heart className={`h-5 w-5 sm:h-6 sm:w-6 ${isLiked ? "fill-current" : ""}`} />
                <span className="ml-1 text-sm">{likesCount}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCommentSheetOpen(true)} className="px-2 min-h-[44px] hover:text-primary">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="ml-1 text-sm">{commentsCount}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare} className="px-2 min-h-[44px] hover:text-accent">
                <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              {(post.type === "image" || post.type === "video") && post.media_url && (
                <Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading} className="px-2 min-h-[44px] hover:text-primary">
                  <Download className={`h-4 w-4 sm:h-5 sm:w-5 ${downloading ? "animate-bounce" : ""}`} />
                </Button>
              )}
              {!isOwnPost && currentUserId && (
                <TipButton creatorId={post.user_id} creatorUsername={post.profiles?.username || "user"} postId={post.id} onTip={(amount) => sendTip(post.user_id, amount, post.id)} />
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {isOwnPost && (
                <DeletePostButton postId={post.id} mediaUrl={post.media_url} onDeleted={() => window.location.reload()} />
              )}
              <Button variant="ghost" size="sm" onClick={handleSave} className={`px-2 min-h-[44px] hover:text-accent transition-colors ${isSaved ? "text-accent" : ""}`}>
                <Bookmark className={`h-5 w-5 sm:h-6 sm:w-6 ${isSaved ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Caption */}
          {localCaption && post.type !== "text" && (
            <p className="text-sm text-foreground">
              <span className="font-semibold cursor-pointer hover:underline" onClick={handleProfileClick}>
                {post.profiles?.username}
              </span>{" "}
              {localCaption}
            </p>
          )}

          {/* Hashtags */}
          {localHashtags && localHashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {localHashtags.map((tag) => (
                <span key={tag} className="text-xs text-primary cursor-pointer hover:underline"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(`#${tag}`)}`)}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <CommentSheet open={commentSheetOpen} onOpenChange={setCommentSheetOpen} postId={post.id} currentUserId={currentUserId} postOwnerId={post.user_id} onCommentCountChange={setCommentsCount} />

      {isOwnPost && (
        <EditPostModal
          open={editOpen}
          onOpenChange={setEditOpen}
          post={{ id: post.id, caption: localCaption, hashtags: localHashtags, type: post.type }}
          onUpdated={handlePostEdited}
        />
      )}
    </>
  );
};

export default PostCard;
