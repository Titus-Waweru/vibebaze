import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, Search, Snowflake, Sun, Eye, DollarSign, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface WalletWithProfile {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  lifetime_earnings: number;
  is_frozen: boolean;
  frozen_reason: string | null;
  frozen_at: string | null;
  currency: string;
  created_at: string;
  profile: {
    username: string;
    avatar_url: string | null;
  } | null;
}

interface Transaction {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  transaction_type: string;
  status: string;
  description: string | null;
  created_at: string;
  sender_profile?: { username: string } | null;
  receiver_profile?: { username: string } | null;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_details: any;
  status: string;
  created_at: string;
  currency: string;
  failure_reason: string | null;
  profile?: { username: string; avatar_url: string | null } | null;
}

const AdminWalletsTab = () => {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<WalletWithProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WalletWithProfile[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Freeze dialog
  const [freezeDialog, setFreezeDialog] = useState<{
    walletId: string;
    userId: string;
    username: string;
    action: "freeze" | "unfreeze";
  } | null>(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Transactions dialog
  const [transactionsDialog, setTransactionsDialog] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all wallets
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (walletError) throw walletError;
      
      // Get user IDs to fetch profiles
      const userIds = (walletData || []).map(w => w.user_id);
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of profiles by user_id
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      
      // Transform the data to match our interface
      const transformedData = (walletData || []).map(wallet => ({
        ...wallet,
        profile: profilesMap.get(wallet.user_id) || null
      }));
      
      setWallets(transformedData);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    setLoadingWithdrawals(true);
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get profiles for withdrawal users
      const userIds = [...new Set((data || []).map(w => w.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      setWithdrawals((data || []).map(w => ({
        ...w,
        profile: profileMap.get(w.user_id) || null,
      })));
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    } finally {
      setLoadingWithdrawals(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
    fetchWithdrawals();
  }, [fetchWallets, fetchWithdrawals]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      // First search profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${searchQuery}%`)
        .limit(10);

      if (profileError) throw profileError;

      if (profiles && profiles.length > 0) {
        // Get wallets for matched profiles
        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("*")
          .in("user_id", profiles.map(p => p.id));

        if (walletError) throw walletError;

        // Combine data
        const results = (walletData || []).map(wallet => ({
          ...wallet,
          profile: profiles.find(p => p.id === wallet.user_id) || null
        }));
        
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching wallets:", error);
      toast.error("Failed to search");
    } finally {
      setSearching(false);
    }
  };

  const handleFreezeAction = async () => {
    if (!freezeDialog || !user) return;
    
    setProcessing(true);
    try {
      if (freezeDialog.action === "freeze") {
        if (!freezeReason.trim()) {
          toast.error("Please provide a reason");
          return;
        }
        
        const { error } = await supabase
          .from("wallets")
          .update({
            is_frozen: true,
            frozen_by: user.id,
            frozen_at: new Date().toISOString(),
            frozen_reason: freezeReason,
          })
          .eq("id", freezeDialog.walletId);

        if (error) throw error;
        
        // Log action
        await supabase.from("admin_logs").insert({
          admin_id: user.id,
          action_type: "wallet_freeze",
          target_type: "wallet",
          target_id: freezeDialog.userId,
          reason: freezeReason,
          new_value: { is_frozen: true },
        });
        
        toast.success(`Wallet frozen for @${freezeDialog.username}`);
      } else {
        const { error } = await supabase
          .from("wallets")
          .update({
            is_frozen: false,
            frozen_by: null,
            frozen_at: null,
            frozen_reason: null,
          })
          .eq("id", freezeDialog.walletId);

        if (error) throw error;
        
        // Log action
        await supabase.from("admin_logs").insert({
          admin_id: user.id,
          action_type: "wallet_unfreeze",
          target_type: "wallet",
          target_id: freezeDialog.userId,
          new_value: { is_frozen: false },
        });
        
        toast.success(`Wallet unfrozen for @${freezeDialog.username}`);
      }
      
      setFreezeDialog(null);
      setFreezeReason("");
      fetchWallets();
    } catch (error) {
      console.error("Error updating wallet:", error);
      toast.error("Failed to update wallet");
    } finally {
      setProcessing(false);
    }
  };

  const fetchUserTransactions = async (userId: string) => {
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const openTransactionsDialog = (userId: string, username: string) => {
    setTransactionsDialog({ userId, username });
    fetchUserTransactions(userId);
  };

  const handleApproveWithdrawal = async (withdrawalId: string, userId: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("withdrawals")
        .update({
          status: "completed",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      // Update the corresponding transaction
      await supabase
        .from("transactions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("sender_id", userId)
        .eq("transaction_type", "withdrawal")
        .eq("status", "pending");

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user.id,
        action_type: "withdrawal_approved",
        target_type: "withdrawal",
        target_id: withdrawalId,
      });

      toast.success("Withdrawal approved!");
      fetchWithdrawals();
      fetchWallets();
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      toast.error("Failed to approve withdrawal");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string, userId: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("withdrawals")
        .update({
          status: "failed",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          failure_reason: "Rejected by admin",
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      // Update the corresponding transaction to failed (triggers refund via DB trigger)
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("sender_id", userId)
        .eq("transaction_type", "withdrawal")
        .eq("status", "pending");

      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: user.id,
        action_type: "withdrawal_rejected",
        target_type: "withdrawal",
        target_id: withdrawalId,
      });

      toast.success("Withdrawal rejected. Balance refunded.");
      fetchWithdrawals();
      fetchWallets();
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      toast.error("Failed to reject withdrawal");
    } finally {
      setProcessing(false);
    }
  };

  const displayWallets = searchResults.length > 0 ? searchResults : wallets;
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="wallets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="withdrawals" className="relative">
            Withdrawals
            {pendingWithdrawals.length > 0 && (
              <Badge className="ml-2 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5">
                {pendingWithdrawals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Wallets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
            {searchResults.length > 0 && (
              <Button variant="outline" onClick={() => setSearchResults([])}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wallets List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {searchResults.length > 0 ? `Search Results (${searchResults.length})` : `All Wallets (${wallets.length})`}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchWallets}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayWallets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No wallets found
            </div>
          ) : (
            <div className="space-y-4">
              {displayWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`flex items-start justify-between p-4 rounded-lg border ${
                    wallet.is_frozen 
                      ? "bg-blue-500/10 border-blue-500/30" 
                      : "bg-muted/30 border-border/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={wallet.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {wallet.profile?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">@{wallet.profile?.username || "Unknown"}</p>
                        {wallet.is_frozen && (
                          <Badge className="bg-blue-500/20 text-blue-500">
                            <Snowflake className="h-3 w-3 mr-1" />
                            Frozen
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-green-500">
                          Available: {wallet.currency} {wallet.available_balance.toFixed(2)}
                        </span>
                        <span className="text-yellow-500">
                          Pending: {wallet.currency} {wallet.pending_balance.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">
                          Lifetime: {wallet.currency} {wallet.lifetime_earnings.toFixed(2)}
                        </span>
                      </div>
                      {wallet.is_frozen && wallet.frozen_reason && (
                        <p className="text-sm text-blue-400">
                          Reason: {wallet.frozen_reason}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(wallet.created_at))} ago
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTransactionsDialog(wallet.user_id, wallet.profile?.username || "Unknown")}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Transactions
                    </Button>
                    {wallet.is_frozen ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFreezeDialog({
                          walletId: wallet.id,
                          userId: wallet.user_id,
                          username: wallet.profile?.username || "Unknown",
                          action: "unfreeze",
                        })}
                      >
                        <Sun className="h-4 w-4 mr-1" />
                        Unfreeze
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-500 hover:text-blue-400"
                        onClick={() => setFreezeDialog({
                          walletId: wallet.id,
                          userId: wallet.user_id,
                          username: wallet.profile?.username || "Unknown",
                          action: "freeze",
                        })}
                      >
                        <Snowflake className="h-4 w-4 mr-1" />
                        Freeze
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="withdrawals" className="space-y-6">
        {/* Pending Withdrawals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Pending Withdrawals ({pendingWithdrawals.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchWithdrawals}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loadingWithdrawals ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingWithdrawals.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No pending withdrawals</p>
            ) : (
              <div className="space-y-4">
                {pendingWithdrawals.map((w) => (
                  <div key={w.id} className="flex items-start justify-between p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={w.profile?.avatar_url || undefined} />
                        <AvatarFallback>{w.profile?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">@{w.profile?.username || "Unknown"}</p>
                        <p className="text-lg font-bold text-foreground">{w.currency} {w.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          via {w.payment_method} • {formatDistanceToNow(new Date(w.created_at))} ago
                        </p>
                        {(w.payment_details as any)?.phone && (
                          <p className="text-xs text-muted-foreground">Phone: {(w.payment_details as any).phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApproveWithdrawal(w.id, w.user_id)}
                        disabled={processing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectWithdrawal(w.id, w.user_id)}
                        disabled={processing}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Withdrawals History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              All Withdrawals ({withdrawals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No withdrawals yet</p>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={w.profile?.avatar_url || undefined} />
                        <AvatarFallback>{w.profile?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">@{w.profile?.username || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(w.created_at))} ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{w.currency} {w.amount.toLocaleString()}</p>
                      <Badge variant={
                        w.status === "completed" ? "default" :
                        w.status === "pending" ? "secondary" : "destructive"
                      }>
                        {w.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      {/* Freeze Dialog */}
      <Dialog open={!!freezeDialog} onOpenChange={() => setFreezeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {freezeDialog?.action === "freeze" ? "Freeze Wallet" : "Unfreeze Wallet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {freezeDialog?.action === "freeze" 
                ? `Freezing wallet for @${freezeDialog?.username} will prevent all transactions.`
                : `Unfreezing wallet for @${freezeDialog?.username} will restore transaction abilities.`
              }
            </p>

            {freezeDialog?.action === "freeze" && (
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="Explain why this wallet is being frozen..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleFreezeAction}
              disabled={processing || (freezeDialog?.action === "freeze" && !freezeReason.trim())}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={!!transactionsDialog} onOpenChange={() => setTransactionsDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Transactions for @{transactionsDialog?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingTransactions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No transactions found</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                          {tx.transaction_type}
                        </Badge>
                        <Badge variant={tx.status === "completed" ? "default" : "outline"}>
                          {tx.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tx.description || "No description"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(tx.created_at))} ago
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">KSh {tx.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        Fee: KSh {tx.platform_fee.toFixed(2)}
                      </p>
                      <p className="text-xs text-green-500">
                        Net: KSh {tx.net_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWalletsTab;
