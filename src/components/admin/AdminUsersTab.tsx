import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Ban, AlertTriangle, Shield, UserX, UserCheck } from "lucide-react";
import { useUserModeration } from "@/hooks/useUserModeration";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminUsersTab = () => {
  const { users, loading, fetchModeratedUsers, suspendUser, unsuspendUser, banUser, unbanUser, warnUser } = useUserModeration();
  const [filter, setFilter] = useState<"all" | "suspended" | "banned" | "warned">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{
    type: "suspend" | "ban" | "warn" | null;
    userId: string;
    username: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [suspensionHours, setSuspensionHours] = useState("24");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchModeratedUsers(filter === "all" ? undefined : filter);
  }, [filter, fetchModeratedUsers]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, created_at")
        .ilike("username", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const handleAction = async () => {
    if (!actionDialog || !actionReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setProcessing(true);
    let success = false;

    switch (actionDialog.type) {
      case "suspend":
        success = await suspendUser(actionDialog.userId, actionReason, parseInt(suspensionHours));
        break;
      case "ban":
        success = await banUser(actionDialog.userId, actionReason);
        break;
      case "warn":
        success = await warnUser(actionDialog.userId, actionReason);
        break;
    }

    if (success) {
      setActionDialog(null);
      setActionReason("");
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Search Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Search Users
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
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">@{user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(user.created_at))} ago
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionDialog({ type: "warn", userId: user.id, username: user.username })}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionDialog({ type: "suspend", userId: user.id, username: user.username })}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setActionDialog({ type: "ban", userId: user.id, username: user.username })}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moderated Users */}
      <div className="flex justify-between items-center">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Moderated</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="warned">Warned</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchModeratedUsers(filter === "all" ? undefined : filter)}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Moderated Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No moderated users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((modUser) => (
                <div
                  key={modUser.id}
                  className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={modUser.user_profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {modUser.user_profile?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="font-medium">@{modUser.user_profile?.username || "Unknown"}</p>
                      <div className="flex flex-wrap gap-2">
                        {modUser.is_banned && (
                          <Badge variant="destructive">Banned</Badge>
                        )}
                        {modUser.is_suspended && (
                          <Badge className="bg-orange-500/20 text-orange-500">
                            Suspended until {modUser.suspended_until ? new Date(modUser.suspended_until).toLocaleDateString() : "N/A"}
                          </Badge>
                        )}
                        {modUser.warning_count > 0 && (
                          <Badge className="bg-yellow-500/20 text-yellow-500">
                            {modUser.warning_count} warning{modUser.warning_count > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      {modUser.is_banned && modUser.banned_reason && (
                        <p className="text-sm text-muted-foreground">
                          Ban reason: {modUser.banned_reason}
                        </p>
                      )}
                      {modUser.is_suspended && modUser.suspension_reason && (
                        <p className="text-sm text-muted-foreground">
                          Suspension reason: {modUser.suspension_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {modUser.is_suspended && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unsuspendUser(modUser.user_id)}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Unsuspend
                      </Button>
                    )}
                    {modUser.is_banned && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unbanUser(modUser.user_id)}
                      >
                        Unban
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === "warn" && "Issue Warning"}
              {actionDialog?.type === "suspend" && "Suspend User"}
              {actionDialog?.type === "ban" && "Ban User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Taking action on user: <span className="font-medium text-foreground">@{actionDialog?.username}</span>
            </p>

            {actionDialog?.type === "suspend" && (
              <div className="space-y-2">
                <Label>Suspension Duration (hours)</Label>
                <Select value={suspensionHours} onValueChange={setSuspensionHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Explain the reason for this action..."
                rows={3}
              />
            </div>

            {actionDialog?.type === "ban" && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  ⚠️ Banning a user will also freeze their wallet. This action should be reserved for severe violations.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={actionDialog?.type === "ban" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={processing || !actionReason.trim()}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersTab;
