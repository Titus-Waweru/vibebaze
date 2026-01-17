import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Wallet {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  lifetime_earnings: number;
  currency: string;
  mpesa_phone: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  post_id: string | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  payment_method: string | null;
  description: string | null;
  created_at: string;
  completed_at: string | null;
  sender_profile?: { username: string; avatar_url: string | null } | null;
  receiver_profile?: { username: string; avatar_url: string | null } | null;
}

export const useWallet = (userId: string | undefined) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No wallet found - this shouldn't happen due to trigger, but handle gracefully
          console.log("No wallet found for user");
        } else {
          throw error;
        }
      }

      if (data) {
        setWallet(data as Wallet);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;

    setTransactionsLoading(true);
    try {
      // Fetch transactions first
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (txError) throw txError;

      // Get unique user IDs for profile lookup
      const userIds = new Set<string>();
      txData?.forEach((tx) => {
        if (tx.sender_id) userIds.add(tx.sender_id);
        if (tx.receiver_id) userIds.add(tx.receiver_id);
      });

      // Fetch profiles for those users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Map transactions with profiles
      const transactionsWithProfiles: Transaction[] = (txData || []).map((tx) => ({
        ...tx,
        sender_profile: tx.sender_id ? profileMap.get(tx.sender_id) || null : null,
        receiver_profile: tx.receiver_id ? profileMap.get(tx.receiver_id) || null : null,
      }));

      setTransactions(transactionsWithProfiles);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  }, [userId]);

  const sendTip = useCallback(async (
    creatorId: string,
    amount: number,
    postId?: string
  ) => {
    if (!userId) {
      toast.error("Please log in to send tips");
      return false;
    }

    if (amount < 10) {
      toast.error("Minimum tip amount is KSh 10");
      return false;
    }

    try {
      // Get platform fee percentage
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "platform_fee_percentage")
        .single();

      const feePercentage = settings?.setting_value ? Number(settings.setting_value) : 10;
      const platformFee = (amount * feePercentage) / 100;
      const netAmount = amount - platformFee;

      const { error } = await supabase.from("transactions").insert({
        sender_id: userId,
        receiver_id: creatorId,
        post_id: postId || null,
        amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        transaction_type: "tip",
        status: "completed", // For now, tips are instant
        description: postId ? "Tip for post" : "Direct tip",
      });

      if (error) throw error;

      toast.success(`Sent KSh ${amount} tip!`);
      
      // Refresh wallet and transactions
      fetchWallet();
      fetchTransactions();
      
      return true;
    } catch (error) {
      console.error("Error sending tip:", error);
      toast.error("Failed to send tip. Please try again.");
      return false;
    }
  }, [userId, fetchWallet, fetchTransactions]);

  const updatePaymentDetails = useCallback(async (mpesaPhone: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from("wallets")
        .update({ mpesa_phone: mpesaPhone })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Payment details updated!");
      fetchWallet();
      return true;
    } catch (error) {
      console.error("Error updating payment details:", error);
      toast.error("Failed to update payment details");
      return false;
    }
  }, [userId, fetchWallet]);

  const requestWithdrawal = useCallback(async (amount: number) => {
    if (!userId || !wallet) return false;

    if (amount < 50) {
      toast.error("Minimum withdrawal is KSh 50");
      return false;
    }

    if (amount > wallet.available_balance) {
      toast.error("Insufficient balance");
      return false;
    }

    if (!wallet.mpesa_phone) {
      toast.error("Please add M-PESA phone number first");
      return false;
    }

    try {
      // Create withdrawal request
      const { error: withdrawError } = await supabase.from("withdrawals").insert({
        user_id: userId,
        amount,
        payment_method: "mpesa",
        payment_details: { phone: wallet.mpesa_phone },
        status: "pending",
      });

      if (withdrawError) throw withdrawError;

      // Create transaction record
      const { error: txError } = await supabase.from("transactions").insert({
        sender_id: userId,
        amount,
        platform_fee: 0,
        net_amount: amount,
        transaction_type: "withdrawal",
        status: "pending",
        payment_method: "mpesa",
        description: `Withdrawal to M-PESA ${wallet.mpesa_phone}`,
      });

      if (txError) throw txError;

      toast.success("Withdrawal request submitted!");
      fetchWallet();
      fetchTransactions();
      return true;
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      toast.error("Failed to request withdrawal");
      return false;
    }
  }, [userId, wallet, fetchWallet, fetchTransactions]);

  // Real-time updates for wallet
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`wallet-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchWallet();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          // Show notification for incoming tips
          const tx = payload.new as Transaction;
          if (tx.transaction_type === "tip") {
            toast.success(`You received a KSh ${tx.net_amount} tip!`);
          }
          fetchTransactions();
          fetchWallet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchWallet, fetchTransactions]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [fetchWallet, fetchTransactions]);

  return {
    wallet,
    transactions,
    loading,
    transactionsLoading,
    sendTip,
    updatePaymentDetails,
    requestWithdrawal,
    refreshWallet: fetchWallet,
    refreshTransactions: fetchTransactions,
  };
};
