import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/useFollow";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

const FollowButton = ({
  targetUserId,
  currentUserId,
  variant = "default",
  size = "default",
  showIcon = true,
  className,
}: FollowButtonProps) => {
  const { isFollowing, loading, toggleFollow } = useFollow(targetUserId, currentUserId);

  if (targetUserId === currentUserId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size={size}
      onClick={toggleFollow}
      disabled={loading || !currentUserId}
      className={`${isFollowing ? "border-primary/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50" : ""} ${className || ""}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {showIcon && (
            isFollowing ? (
              <UserMinus className="h-4 w-4 mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )
          )}
          {isFollowing ? "Unfollow" : "Follow"}
        </>
      )}
    </Button>
  );
};

export default FollowButton;
