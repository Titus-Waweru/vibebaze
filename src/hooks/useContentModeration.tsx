import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type FlagSource = Database["public"]["Enums"]["flag_source"];
type ReportReason = Database["public"]["Enums"]["report_reason"];
type ModerationStatus = Database["public"]["Enums"]["moderation_status"];
type ModerationAction = Database["public"]["Enums"]["moderation_action"];

export interface ContentFlag {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  user_id: string | null;
  flagged_by: string | null;
  source: FlagSource;
  reason: ReportReason;
  ai_category: string | null;
  ai_confidence: number | null;
  urgency_level: number | null;
  status: ModerationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: ModerationAction | null;
  action_notes: string | null;
  description: string | null;
  created_at: string;
  // Joined data
  post?: { id: string; caption: string | null; type: string; media_url: string | null } | null;
  flagged_user?: { username: string; avatar_url: string | null } | null;
  reporter?: { username: string; avatar_url: string | null } | null;
}

export const useContentModeration = () => {
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    reviewed: 0,
    actioned: 0,
    dismissed: 0,
  });

  const fetchFlags = useCallback(async (status?: ModerationStatus | "all") => {
    setLoading(true);
    try {
      let query = supabase
        .from("content_flags")
        .select("*")
        .order("urgency_level", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch related data for flags
      if (data && data.length > 0) {
        const postIds = [...new Set(data.filter(f => f.post_id).map(f => f.post_id!))] as string[];
        const userIds = [...new Set([
          ...data.filter(f => f.user_id).map(f => f.user_id!),
          ...data.filter(f => f.flagged_by).map(f => f.flagged_by!),
        ])] as string[];

        const [postsRes, profilesRes] = await Promise.all([
          postIds.length > 0 
            ? supabase.from("posts").select("id, caption, type, media_url").in("id", postIds)
            : { data: [] },
          userIds.length > 0
            ? supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
            : { data: [] },
        ]);

        const postsMap = new Map((postsRes.data || []).map(p => [p.id, p]));
        const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

        const enrichedFlags: ContentFlag[] = data.map(flag => ({
          ...flag,
          post: flag.post_id ? postsMap.get(flag.post_id) || null : null,
          flagged_user: flag.user_id ? profilesMap.get(flag.user_id) || null : null,
          reporter: flag.flagged_by ? profilesMap.get(flag.flagged_by) || null : null,
        }));

        setFlags(enrichedFlags);
      } else {
        setFlags([]);
      }
    } catch (error) {
      console.error("Error fetching content flags:", error);
      toast.error("Failed to load content flags");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("content_flags")
        .select("status");

      if (error) throw error;

      const counts = {
        pending: 0,
        reviewed: 0,
        actioned: 0,
        dismissed: 0,
      };

      data?.forEach(flag => {
        if (flag.status in counts) {
          counts[flag.status as keyof typeof counts]++;
        }
      });

      setStats(counts);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const reviewFlag = useCallback(async (
    flagId: string,
    action: ModerationStatus,
    notes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return false;
      }

      const { error } = await supabase
        .from("content_flags")
        .update({
          status: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          action_notes: notes || null,
        })
        .eq("id", flagId);

      if (error) throw error;

      toast.success(`Flag marked as ${action}`);
      fetchFlags();
      fetchStats();
      return true;
    } catch (error) {
      console.error("Error reviewing flag:", error);
      toast.error("Failed to update flag");
      return false;
    }
  }, [fetchFlags, fetchStats]);

  const deleteContent = useCallback(async (flagId: string, contentType: "post" | "comment", contentId: string) => {
    try {
      const table = contentType === "post" ? "posts" : "comments";
      const { error } = await supabase.from(table).delete().eq("id", contentId);

      if (error) throw error;

      await reviewFlag(flagId, "actioned", `${contentType} deleted`);
      toast.success(`${contentType} deleted successfully`);
      return true;
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error("Failed to delete content");
      return false;
    }
  }, [reviewFlag]);

  useEffect(() => {
    fetchFlags();
    fetchStats();
  }, [fetchFlags, fetchStats]);

  return {
    flags,
    loading,
    stats,
    fetchFlags,
    fetchStats,
    reviewFlag,
    deleteContent,
  };
};
