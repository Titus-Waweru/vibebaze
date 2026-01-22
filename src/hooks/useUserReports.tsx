import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type ReportReason = Database["public"]["Enums"]["report_reason"];
type ModerationStatus = Database["public"]["Enums"]["moderation_status"];

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reported_comment_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: ModerationStatus;
  content_flag_id: string | null;
  created_at: string;
  // Joined data
  reporter?: { username: string; avatar_url: string | null } | null;
  reported_user?: { username: string; avatar_url: string | null } | null;
  reported_post?: { id: string; caption: string | null; type: string } | null;
}

export const useUserReports = () => {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async (status?: ModerationStatus | "all") => {
    setLoading(true);
    try {
      let query = supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with profile data
      if (data && data.length > 0) {
        const userIds = [...new Set([
          ...data.map(r => r.reporter_id),
          ...data.filter(r => r.reported_user_id).map(r => r.reported_user_id!),
        ])] as string[];
        
        const postIds = [...new Set(data.filter(r => r.reported_post_id).map(r => r.reported_post_id!))] as string[];

        const [profilesRes, postsRes] = await Promise.all([
          supabase.from("profiles").select("id, username, avatar_url").in("id", userIds),
          postIds.length > 0 
            ? supabase.from("posts").select("id, caption, type").in("id", postIds)
            : { data: [] },
        ]);

        const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
        const postsMap = new Map((postsRes.data || []).map(p => [p.id, p]));

        const enrichedReports: UserReport[] = data.map(report => ({
          ...report,
          reporter: profilesMap.get(report.reporter_id) || null,
          reported_user: report.reported_user_id ? profilesMap.get(report.reported_user_id) || null : null,
          reported_post: report.reported_post_id ? postsMap.get(report.reported_post_id) || null : null,
        }));

        setReports(enrichedReports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitReport = useCallback(async (
    reason: ReportReason,
    description: string,
    target: {
      userId?: string;
      postId?: string;
      commentId?: string;
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to report content");
        return false;
      }

      // Check rate limit (max 10 reports per day)
      const { data: canReport } = await supabase.rpc("check_rate_limit", {
        p_user_id: user.id,
        p_action_type: "report",
        p_max_actions: 10,
        p_window_hours: 24,
      });

      if (!canReport) {
        toast.error("You've reached the maximum number of reports for today");
        return false;
      }

      // Create the report
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id,
        reported_user_id: target.userId || null,
        reported_post_id: target.postId || null,
        reported_comment_id: target.commentId || null,
        reason,
        description,
      });

      if (error) throw error;

      // Increment rate limit
      await supabase.rpc("increment_rate_limit", {
        p_user_id: user.id,
        p_action_type: "report",
      });

      toast.success("Report submitted. Thank you for helping keep VibeLoop safe!");
      return true;
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
      return false;
    }
  }, []);

  const updateReportStatus = useCallback(async (
    reportId: string,
    status: ModerationStatus
  ) => {
    try {
      const { error } = await supabase
        .from("user_reports")
        .update({ status })
        .eq("id", reportId);

      if (error) throw error;

      toast.success(`Report marked as ${status}`);
      fetchReports();
      return true;
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
      return false;
    }
  }, [fetchReports]);

  return {
    reports,
    loading,
    fetchReports,
    submitReport,
    updateReportStatus,
  };
};
