import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CommentReply from "./CommentReply";
import { notifyPostComment } from "@/lib/notificationService";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface CommentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  currentUserId?: string;
  postOwnerId?: string;
  onCommentCountChange?: (count: number) => void;
}

const CommentSheet = ({
  open,
  onOpenChange,
  postId,
  currentUserId,
  postOwnerId,
  onCommentCountChange,
}: CommentSheetProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          parent_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Organize comments into a tree structure
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      // First pass: create all comments
      (data || []).forEach((comment: any) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      // Second pass: organize into tree
      commentMap.forEach((comment) => {
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          commentMap.get(comment.parent_id)!.replies!.push(comment);
        } else if (!comment.parent_id) {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUserId) {
      toast.error("Please log in to comment");
      return;
    }

    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: newComment.trim(),
          parent_id: null,
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      onCommentCountChange?.((comments.length || 0) + 1);
      toast.success("Comment added!");

      // Send push notification to post owner (fire-and-forget)
      if (postOwnerId && postOwnerId !== currentUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", currentUserId)
          .maybeSingle();
        notifyPostComment(postOwnerId, profile?.username || "Someone").catch(() => {});
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!currentUserId) {
      toast.error("Please log in to reply");
      return;
    }

    const { error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        content,
        parent_id: parentId,
      });

    if (error) {
      toast.error("Failed to add reply");
      throw error;
    }

    fetchComments();
    toast.success("Reply added!");
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      fetchComments();
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleProfileClick = (userId: string) => {
    onOpenChange(false);
    if (userId === currentUserId) {
      navigate("/profile");
    } else {
      navigate(`/user/${userId}`);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  // Count total comments including replies
  const countAllComments = (comments: Comment[]): number => {
    return comments.reduce((total, comment) => {
      return total + 1 + (comment.replies ? countAllComments(comment.replies) : 0);
    }, 0);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-card border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-foreground">
            Comments {comments.length > 0 && `(${countAllComments(comments)})`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-80px)]">
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <CommentReply
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  postOwnerId={postOwnerId}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  onProfileClick={handleProfileClick}
                  formatTime={formatTime}
                />
              ))
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleSubmit} className="pt-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder={currentUserId ? "Add a comment..." : "Log in to comment"}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!currentUserId || submitting}
                className="flex-1 bg-muted/50 border-border"
                maxLength={500}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!currentUserId || !newComment.trim() || submitting}
                className="shrink-0"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CommentSheet;
