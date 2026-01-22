import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface AdminLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  old_value: Json | null;
  new_value: Json | null;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
  // Joined data
  admin_profile?: { username: string; avatar_url: string | null } | null;
}

export const useAdminLogs = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (limit: number = 100, actionType?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (actionType) {
        query = query.eq("action_type", actionType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch admin profiles
      if (data && data.length > 0) {
        const adminIds = [...new Set(data.map(l => l.admin_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", adminIds);

        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

        const enrichedLogs: AdminLog[] = data.map(log => ({
          ...log,
          admin_profile: profilesMap.get(log.admin_id) || null,
        }));

        setLogs(enrichedLogs);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      toast.error("Failed to load admin logs");
    } finally {
      setLoading(false);
    }
  }, []);

  const logAction = useCallback(async (
    actionType: string,
    targetType: string,
    targetId?: string,
    details?: { oldValue?: Json; newValue?: Json; reason?: string }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("admin_logs").insert({
        admin_id: user.id,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId || null,
        old_value: details?.oldValue || null,
        new_value: details?.newValue || null,
        reason: details?.reason || null,
      });
    } catch (error) {
      console.error("Error logging action:", error);
    }
  }, []);

  return {
    logs,
    loading,
    fetchLogs,
    logAction,
  };
};
