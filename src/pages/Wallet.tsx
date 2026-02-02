import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, Transaction } from "@/hooks/useWallet";
import { usePaystack } from "@/hooks/usePaystack";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Loader2,
  Gift,
  DollarSign,
  TrendingUp,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const Wallet = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { initializePayment, loading: paystackLoading } = usePaystack();
  const {
    wallet,
    transactions,
    loading,
    transactionsLoading,
    updatePaymentDetails,
    requestWithdrawal,
  } = useWallet(user?.id);

  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [processing, setProcessing] = useState(false);

  // Check for payment success callback
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success("Payment successful! Your wallet will be updated shortly.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (wallet?.mpesa_phone) {
      setMpesaPhone(wallet.mpesa_phone);
    }
  }, [wallet]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 50) {
      toast.error("Minimum withdrawal is KSh 50");
      return;
    }

    setProcessing(true);
    const success = await requestWithdrawal(amount);
    setProcessing(false);

    if (success) {
      setShowWithdrawDialog(false);
      setWithdrawAmount("");
    }
  };

  const handleSavePhone = async () => {
    if (!mpesaPhone || !/^(?:\+254|0)[17]\d{8}$/.test(mpesaPhone.replace(/\s/g, ""))) {
      toast.error("Please enter a valid Kenyan phone number");
      return;
    }

    setProcessing(true);
    const success = await updatePaymentDetails(mpesaPhone.replace(/\s/g, ""));
    setProcessing(false);

    if (success) {
      setShowPhoneDialog(false);
    }
  };

  const handleFundWallet = async () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount < 50) {
      toast.error("Minimum funding amount is KSh 50");
      return;
    }

    // Get user email
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email) {
      toast.error("Email required for payment");
      return;
    }

    await initializePayment(amount, authUser.email, user!.id);
  };

  const getTransactionIcon = (tx: Transaction) => {
    if (tx.transaction_type === "withdrawal") {
      return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
    }
    if (tx.sender_id === user?.id) {
      return <ArrowUpRight className="h-4 w-4 text-destructive" />;
    }
    return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="text-green-500 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-6 max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">My Wallet</h1>
        </div>

        {/* Balance Card */}
        <Card className="border-border/50 shadow-card bg-gradient-to-br from-primary/20 via-background to-accent/20 mb-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-primary/20">
                <WalletIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-muted-foreground">Available Balance</span>
            </div>

            <div className="text-4xl font-bold text-foreground mb-2">
              KSh {wallet?.available_balance?.toLocaleString() || "0.00"}
            </div>

            <div className="flex gap-6 text-sm mb-6">
              <div>
                <span className="text-muted-foreground">Pending: </span>
                <span className="text-yellow-500 font-medium">
                  KSh {wallet?.pending_balance?.toLocaleString() || "0.00"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Lifetime: </span>
                <span className="text-green-500 font-medium">
                  KSh {wallet?.lifetime_earnings?.toLocaleString() || "0.00"}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowFundDialog(true)}
                className="flex-1 bg-gradient-primary hover:shadow-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Fund Wallet
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!wallet?.mpesa_phone) {
                    setShowPhoneDialog(true);
                  } else {
                    setShowWithdrawDialog(true);
                  }
                }}
                disabled={!wallet || wallet.available_balance < 50}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* M-PESA Info */}
        {wallet?.mpesa_phone && (
          <Card className="border-border/50 shadow-card mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <Phone className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">M-PESA Connected</p>
                    <p className="text-sm text-muted-foreground">{wallet.mpesa_phone}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowPhoneDialog(true)}>
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-4 text-center">
              <Gift className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {transactions.filter(t => t.transaction_type === "tip" && t.receiver_id === user?.id).length}
              </p>
              <p className="text-sm text-muted-foreground">Tips Received</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {transactions.filter(t => t.status === "completed").length}
              </p>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactionsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No transactions yet
              </p>
            ) : (
              transactions.map((tx) => {
                const isOutgoing = tx.sender_id === user?.id;
                const profile = isOutgoing ? tx.receiver_profile : tx.sender_profile;
                const displayAmount = tx.transaction_type === "withdrawal" || isOutgoing
                  ? `-KSh ${tx.amount}`
                  : `+KSh ${tx.net_amount}`;

                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {profile?.username?.[0]?.toUpperCase() || (tx.transaction_type === "withdrawal" ? "W" : "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background">
                        {getTransactionIcon(tx)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {tx.transaction_type === "withdrawal" 
                          ? "Withdrawal"
                          : isOutgoing 
                            ? `Tip to @${profile?.username || "user"}`
                            : `Tip from @${profile?.username || "user"}`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isOutgoing || tx.transaction_type === "withdrawal" ? "text-destructive" : "text-green-500"}`}>
                        {displayAmount}
                      </p>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw to M-PESA</DialogTitle>
            <DialogDescription>
              Enter the amount you want to withdraw. Minimum KSh 50.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (KSh)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min={50}
                max={wallet?.available_balance || 0}
              />
              <p className="text-xs text-muted-foreground">
                Available: KSh {wallet?.available_balance?.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Sending to: <span className="font-medium text-foreground">{wallet?.mpesa_phone}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>M-PESA Phone Number</DialogTitle>
            <DialogDescription>
              Enter your M-PESA registered phone number for withdrawals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="e.g. 0712345678"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Kenyan phone number (Safaricom M-PESA)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePhone} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund Wallet Dialog */}
      <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fund Your Wallet</DialogTitle>
            <DialogDescription>
              Add money to your VibeBaze wallet via Paystack.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (KSh)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                min={50}
              />
              <p className="text-xs text-muted-foreground">
                Minimum: KSh 50 • 2% platform fee on transfers
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFundDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFundWallet} disabled={paystackLoading}>
              {paystackLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wallet;
