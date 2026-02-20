import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Loader2, Reply, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface CommentData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: CommentUser;
  replies?: CommentData[];
}

interface CommentReplyProps {
  comment: CommentData;
  currentUserId?: string;
  postOwnerId?: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onProfileClick: (userId: string) => void;
  formatTime: (date: string) => string;
  /** Current nesting depth. 0 = root, 1 = first reply, 2 = second reply (max) */
  depth?: number;
}

const MAX_DEPTH = 2; // 0-indexed → 3 visible levels

const CommentReply = ({
  comment,
  currentUserId,
  postOwnerId,
  onReply,
  onDelete,
  onProfileClick,
  formatTime,
  depth = 0,
}: CommentReplyProps) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const canDelete = currentUserId === comment.user_id || currentUserId === postOwnerId;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isReply = depth > 0;
  // Only allow replying up to MAX_DEPTH levels
  const canReply = currentUserId && depth < MAX_DEPTH;

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    
    setSubmitting(true);
    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent("");
      setShowReplyInput(false);
      setShowReplies(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn(
      "flex gap-3 group",
      isReply && "border-l-2 border-border/50 pl-4",
      depth === 1 && "ml-8",
      depth === 2 && "ml-6",
    )}>
      <Avatar
        className={cn(
          "cursor-pointer ring-2 ring-primary/10 shrink-0",
          depth === 0 ? "h-8 w-8" : "h-6 w-6"
        )}
        onClick={() => onProfileClick(comment.user_id)}
      >
        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
        <AvatarFallback className="bg-gradient-primary text-background text-xs">
          {comment.profiles?.username?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="font-semibold text-sm text-foreground cursor-pointer hover:underline"
            onClick={() => onProfileClick(comment.user_id)}
          >
            {comment.profiles?.username || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(comment.created_at)}
          </span>
        </div>
        
        <p className="text-sm text-foreground break-words">{comment.content}</p>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          {canReply && (
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          )}
          
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              {showReplies ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
          
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Reply Input */}
        {showReplyInput && (
          <div className="flex gap-2 pt-2">
            <Input
              placeholder={`Reply to @${comment.profiles?.username}...`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              disabled={submitting}
              className="flex-1 h-8 text-sm bg-muted/50"
              maxLength={300}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReplySubmit()}
            />
            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={!replyContent.trim() || submitting}
              onClick={handleReplySubmit}
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}
        
        {/* Nested Replies — recurse up to MAX_DEPTH */}
        {showReplies && hasReplies && (
          <div className="space-y-3 pt-2">
            {comment.replies!.map((reply) => (
              <CommentReply
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                postOwnerId={postOwnerId}
                onReply={onReply}
                onDelete={onDelete}
                onProfileClick={onProfileClick}
                formatTime={formatTime}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentReply;
