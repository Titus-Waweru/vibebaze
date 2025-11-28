import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useFollow = (targetUserId: string | undefined, currentUserId: string | undefined) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (targetUserId && currentUserId && targetUserId !== currentUserId) {
      checkFollowStatus();
    }
  }, [targetUserId, currentUserId]);

  const checkFollowStatus = async () => {
    if (!targetUserId || !currentUserId) return;

    const { data, error } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (!error && data) {
      setIsFollowing(true);
    } else {
      setIsFollowing(false);
    }
  };

  const toggleFollow = async () => {
    if (!targetUserId || !currentUserId) {
      toast.error("Please log in to follow users");
      return;
    }

    if (targetUserId === currentUserId) {
      toast.error("You cannot follow yourself");
      return;
    }

    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);

        if (error) throw error;
        setIsFollowing(false);
        toast.success("Unfollowed successfully");
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: targetUserId,
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success("Following!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update follow status");
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, loading, toggleFollow };
};
