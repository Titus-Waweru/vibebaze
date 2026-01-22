import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserModerationStatus {
  id: string;
  user_id: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  suspended_until: string | null;
  suspended_by: string | null;
  is_banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  warning_count: number;
  last_warning_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_profile?: { username: string; avatar_url: string | null; email?: string } | null;
}

export const useUserModeration = () => {
  const [users, setUsers] = useState<UserModerationStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModeratedUsers = useCallback(async (filter?: "suspended" | "banned" | "warned") => {
    setLoading(true);
    try {
      let query = supabase
        .from("user_moderation")
        .select("*")
        .order("updated_at", { ascending: false });

      if (filter === "suspended") {
        query = query.eq("is_suspended", true);
      } else if (filter === "banned") {
        query = query.eq("is_banned", true);
      } else if (filter === "warned") {
        query = query.gt("warning_count", 0);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profile data
      if (data && data.length > 0) {
        const userIds = data.map(u => u.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

        const enrichedUsers: UserModerationStatus[] = data.map(user => ({
          ...user,
          user_profile: profilesMap.get(user.user_id) || null,
        }));

        setUsers(enrichedUsers);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching moderated users:", error);
      toast.error("Failed to load moderation data");
    } finally {
      setLoading(false);
    }
  }, []);

  const suspendUser = useCallback(async (
    userId: string,
    reason: string,
    durationHours: number
  ) => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) {
        toast.error("You must be logged in");
        return false;
      }

      const suspendedUntil = new Date();
      suspendedUntil.setHours(suspendedUntil.getHours() + durationHours);

      // Upsert moderation record
      const { error } = await supabase
        .from("user_moderation")
        .upsert({
          user_id: userId,
          is_suspended: true,
          suspension_reason: reason,
          suspended_until: suspendedUntil.toISOString(),
          suspended_by: admin.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      // Log action
      await supabase.from("admin_logs").insert({
        admin_id: admin.id,
        action_type: "suspend_user",
        target_type: "user",
        target_id: userId,
        new_value: { reason, duration_hours: durationHours },
      });

      toast.success("User suspended successfully");
      fetchModeratedUsers();
      return true;
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Failed to suspend user");
      return false;
    }
  }, [fetchModeratedUsers]);

  const unsuspendUser = useCallback(async (userId: string) => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) return false;

      const { error } = await supabase
        .from("user_moderation")
        .update({
          is_suspended: false,
          suspension_reason: null,
          suspended_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      await supabase.from("admin_logs").insert({
        admin_id: admin.id,
        action_type: "unsuspend_user",
        target_type: "user",
        target_id: userId,
      });

      toast.success("User unsuspended");
      fetchModeratedUsers();
      return true;
    } catch (error) {
      console.error("Error unsuspending user:", error);
      toast.error("Failed to unsuspend user");
      return false;
    }
  }, [fetchModeratedUsers]);

  const banUser = useCallback(async (userId: string, reason: string) => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) return false;

      const { error } = await supabase
        .from("user_moderation")
        .upsert({
          user_id: userId,
          is_banned: true,
          banned_reason: reason,
          banned_at: new Date().toISOString(),
          banned_by: admin.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      // Also freeze their wallet
      await supabase
        .from("wallets")
        .update({
          is_frozen: true,
          frozen_reason: "Account banned",
          frozen_by: admin.id,
          frozen_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await supabase.from("admin_logs").insert({
        admin_id: admin.id,
        action_type: "ban_user",
        target_type: "user",
        target_id: userId,
        new_value: { reason },
      });

      toast.success("User banned and wallet frozen");
      fetchModeratedUsers();
      return true;
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Failed to ban user");
      return false;
    }
  }, [fetchModeratedUsers]);

  const unbanUser = useCallback(async (userId: string) => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) return false;

      const { error } = await supabase
        .from("user_moderation")
        .update({
          is_banned: false,
          banned_reason: null,
          banned_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Unfreeze wallet
      await supabase
        .from("wallets")
        .update({
          is_frozen: false,
          frozen_reason: null,
          frozen_by: null,
          frozen_at: null,
        })
        .eq("user_id", userId);

      await supabase.from("admin_logs").insert({
        admin_id: admin.id,
        action_type: "unban_user",
        target_type: "user",
        target_id: userId,
      });

      toast.success("User unbanned and wallet unfrozen");
      fetchModeratedUsers();
      return true;
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Failed to unban user");
      return false;
    }
  }, [fetchModeratedUsers]);

  const warnUser = useCallback(async (userId: string, reason: string) => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) return false;

      // Get current warning count
      const { data: existing } = await supabase
        .from("user_moderation")
        .select("warning_count")
        .eq("user_id", userId)
        .single();

      const newCount = (existing?.warning_count || 0) + 1;

      const { error } = await supabase
        .from("user_moderation")
        .upsert({
          user_id: userId,
          warning_count: newCount,
          last_warning_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      await supabase.from("admin_logs").insert({
        admin_id: admin.id,
        action_type: "warn_user",
        target_type: "user",
        target_id: userId,
        new_value: { reason, warning_number: newCount },
      });

      toast.success(`Warning issued (${newCount} total)`);
      fetchModeratedUsers();
      return true;
    } catch (error) {
      console.error("Error warning user:", error);
      toast.error("Failed to issue warning");
      return false;
    }
  }, [fetchModeratedUsers]);

  return {
    users,
    loading,
    fetchModeratedUsers,
    suspendUser,
    unsuspendUser,
    banUser,
    unbanUser,
    warnUser,
  };
};
