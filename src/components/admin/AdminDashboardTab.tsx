import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, DollarSign, Flag, TrendingUp, Wallet, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalTransactions: number;
  platformFeesEarned: number;
  totalFlagged: number;
  pendingReports: number;
  frozenWallets: number;
}

const AdminDashboardTab = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all stats in parallel
      const [
        usersResult,
        postsResult,
        transactionsResult,
        feesResult,
        flagsResult,
        reportsResult,
        frozenResult,
      ] = await Promise.all([
        // Total users
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        // Total posts
        supabase.from("posts").select("id", { count: "exact", head: true }),
        // Total transactions
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        // Platform fees earned
        supabase
          .from("transactions")
          .select("platform_fee")
          .eq("status", "completed"),
        // Pending flags
        supabase
          .from("content_flags")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        // Pending reports
        supabase
          .from("user_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        // Frozen wallets
        supabase
          .from("wallets")
          .select("id", { count: "exact", head: true })
          .eq("is_frozen", true),
      ]);

      // Calculate total platform fees
      const totalFees = (feesResult.data || []).reduce(
        (sum, tx) => sum + (tx.platform_fee || 0),
        0
      );

      // Calculate active users (users who posted in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: activeUsersCount } = await supabase
        .from("posts")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      setStats({
        totalUsers: usersResult.count || 0,
        activeUsers: activeUsersCount || 0,
        totalPosts: postsResult.count || 0,
        totalTransactions: transactionsResult.count || 0,
        platformFeesEarned: totalFees,
        totalFlagged: flagsResult.count || 0,
        pendingReports: reportsResult.count || 0,
        frozenWallets: frozenResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Active Users (30d)",
      value: stats?.activeUsers || 0,
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Total Posts",
      value: stats?.totalPosts || 0,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total Transactions",
      value: stats?.totalTransactions || 0,
      icon: DollarSign,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Platform Fees Earned",
      value: `KSh ${(stats?.platformFeesEarned || 0).toFixed(2)}`,
      icon: Wallet,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Pending Flags",
      value: stats?.totalFlagged || 0,
      icon: Flag,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Pending Reports",
      value: stats?.pendingReports || 0,
      icon: Flag,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Frozen Wallets",
      value: stats?.frozenWallets || 0,
      icon: Wallet,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Platform Overview</h2>
        <button
          onClick={fetchStats}
          className="text-sm text-primary hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Moderation Queue</span>
              <span className="font-medium">
                {(stats?.totalFlagged || 0) + (stats?.pendingReports || 0)} items pending
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">User Engagement Rate</span>
              <span className="font-medium">
                {stats?.totalUsers 
                  ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Average Revenue per Transaction</span>
              <span className="font-medium">
                KSh {stats?.totalTransactions 
                  ? (stats.platformFeesEarned / stats.totalTransactions).toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardTab;
