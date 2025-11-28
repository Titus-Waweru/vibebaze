import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FollowButton from "./FollowButton";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

interface FollowListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: "followers" | "following";
  currentUserId?: string;
}

const FollowListModal = ({
  open,
  onOpenChange,
  userId,
  type,
  currentUserId,
}: FollowListModalProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchList();
    }
  }, [open, userId, type]);

  const fetchList = async () => {
    setLoading(true);
    try {
      if (type === "followers") {
        // Get users who follow this user
        const { data, error } = await supabase
          .from("follows")
          .select("follower_id, profiles!follows_follower_id_fkey(id, username, avatar_url, full_name)")
          .eq("following_id", userId);

        if (error) throw error;
        const profilesList = data?.map((item: any) => item.profiles).filter(Boolean) || [];
        setProfiles(profilesList);
      } else {
        // Get users this user follows
        const { data, error } = await supabase
          .from("follows")
          .select("following_id, profiles!follows_following_id_fkey(id, username, avatar_url, full_name)")
          .eq("follower_id", userId);

        if (error) throw error;
        const profilesList = data?.map((item: any) => item.profiles).filter(Boolean) || [];
        setProfiles(profilesList);
      }
    } catch (error) {
      console.error("Error fetching follow list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (profileId: string) => {
    onOpenChange(false);
    navigate(`/user/${profileId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {type === "followers" ? "Followers" : "Following"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : profiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {type === "followers" ? "No followers yet" : "Not following anyone"}
            </p>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => handleProfileClick(profile.id)}
                >
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-background">
                      {profile.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{profile.username}</p>
                    {profile.full_name && (
                      <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                    )}
                  </div>
                </div>
                <FollowButton
                  targetUserId={profile.id}
                  currentUserId={currentUserId}
                  size="sm"
                  showIcon={false}
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowListModal;
