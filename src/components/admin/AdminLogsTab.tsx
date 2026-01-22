import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Activity, User, FileText, Ban, AlertTriangle, Check } from "lucide-react";
import { useAdminLogs, AdminLog } from "@/hooks/useAdminLogs";
import { formatDistanceToNow } from "date-fns";

const AdminLogsTab = () => {
  const { logs, loading, fetchLogs } = useAdminLogs();
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchLogs(100, filter === "all" ? undefined : filter);
  }, [filter, fetchLogs]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "ban_user":
      case "unban_user":
        return <Ban className="h-4 w-4" />;
      case "suspend_user":
      case "unsuspend_user":
        return <User className="h-4 w-4" />;
      case "warn_user":
        return <AlertTriangle className="h-4 w-4" />;
      case "review_flag":
      case "review_report":
        return <Check className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes("ban")) return "bg-red-500/20 text-red-500";
    if (actionType.includes("suspend")) return "bg-orange-500/20 text-orange-500";
    if (actionType.includes("warn")) return "bg-yellow-500/20 text-yellow-500";
    if (actionType.includes("review") || actionType.includes("dismiss")) return "bg-blue-500/20 text-blue-500";
    if (actionType.includes("unban") || actionType.includes("unsuspend")) return "bg-green-500/20 text-green-500";
    return "bg-muted text-muted-foreground";
  };

  const formatActionType = (actionType: string) => {
    return actionType.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex justify-between items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="ban_user">Ban User</SelectItem>
            <SelectItem value="unban_user">Unban User</SelectItem>
            <SelectItem value="suspend_user">Suspend User</SelectItem>
            <SelectItem value="unsuspend_user">Unsuspend User</SelectItem>
            <SelectItem value="warn_user">Warn User</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchLogs(100, filter === "all" ? undefined : filter)}>
          Refresh
        </Button>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Admin Activity Log ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No admin logs found
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className={`p-2 rounded-full ${getActionBadgeColor(log.action_type)}`}>
                    {getActionIcon(log.action_type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getActionBadgeColor(log.action_type)}>
                        {formatActionType(log.action_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        on {log.target_type}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">By:</span>
                      {log.admin_profile && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={log.admin_profile.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {log.admin_profile.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">@{log.admin_profile.username}</span>
                        </div>
                      )}
                    </div>

                    {log.reason && (
                      <p className="text-sm text-muted-foreground">
                        Reason: {log.reason}
                      </p>
                    )}

                    {log.new_value && typeof log.new_value === 'object' && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(log.new_value, null, 2)}
                        </pre>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at))} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogsTab;
