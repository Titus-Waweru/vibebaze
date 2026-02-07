import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Check, X, Eye, Trash2 } from "lucide-react";
import { useUserReports, UserReport } from "@/hooks/useUserReports";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminReportsTab = () => {
  const { reports, loading, fetchReports, updateReportStatus } = useUserReports();
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "actioned" | "dismissed">("pending");
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [processing, setProcessing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports(filter === "all" ? undefined : filter);
  }, [filter, fetchReports]);

  const handleAction = async (action: "reviewed" | "actioned" | "dismissed") => {
    if (!selectedReport) return;
    setProcessing(true);
    await updateReportStatus(selectedReport.id, action);
    setSelectedReport(null);
    setProcessing(false);
  };

  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case "violence":
      case "hate_speech":
        return "bg-red-500/20 text-red-500";
      case "nudity":
        return "bg-orange-500/20 text-orange-500";
      case "harassment":
      case "scam_fraud":
        return "bg-yellow-500/20 text-yellow-500";
      case "spam":
      case "misinformation":
        return "bg-blue-500/20 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">Pending</Badge>;
      case "reviewed":
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-500">Reviewed</Badge>;
      case "actioned":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-500">Actioned</Badge>;
      case "dismissed":
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Dismissed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex justify-between items-center">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchReports(filter === "all" ? undefined : filter)}>
          Refresh
        </Button>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Reports ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports found with current filter
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {report.reporter && (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={report.reporter.avatar_url || undefined} />
                        <AvatarFallback>{report.reporter.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getReasonBadgeColor(report.reason)}>
                          {report.reason.replace("_", " ")}
                        </Badge>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Reporter: </span>
                        <span className="font-medium">@{report.reporter?.username || "Unknown"}</span>
                      </p>
                      {report.reported_user && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Reported User: </span>
                          <span className="font-medium text-red-400">@{report.reported_user.username}</span>
                        </p>
                      )}
                      {report.reported_post && (
                        <p className="text-sm text-muted-foreground">
                          Reported Post: {report.reported_post.type} - "{report.reported_post.caption?.substring(0, 50) || "No caption"}..."
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(report.created_at))} ago
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReport(report)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review User Report</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={getReasonBadgeColor(selectedReport.reason)}>
                    {selectedReport.reason.replace("_", " ")}
                  </Badge>
                  {getStatusBadge(selectedReport.status)}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reporter: </span>
                    <span className="font-medium">@{selectedReport.reporter?.username}</span>
                  </p>
                  {selectedReport.reported_user && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Reported User: </span>
                      <span className="font-medium text-red-400">@{selectedReport.reported_user.username}</span>
                    </p>
                  )}
                </div>

                {selectedReport.description && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Description:</p>
                    <p className="text-sm p-2 rounded bg-background/50">{selectedReport.description}</p>
                  </div>
                )}

                {selectedReport.reported_post && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Reported Post:</p>
                    <div className="p-2 rounded bg-background/50">
                      <p className="text-xs text-muted-foreground">Type: {selectedReport.reported_post.type}</p>
                      <p className="text-sm">{selectedReport.reported_post.caption || "No caption"}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto"
                        onClick={() => navigate(`/post/${selectedReport.reported_post_id}`)}
                      >
                        View Post →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedReport?.reported_post_id && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!selectedReport?.reported_post_id) return;
                  setDeleting(true);
                  try {
                    // Get post media URL first
                    const { data: post } = await supabase.from("posts").select("media_url, thumbnail_url").eq("id", selectedReport.reported_post_id).single();
                    // Delete from storage
                    if (post?.media_url) {
                      try {
                        const url = new URL(post.media_url);
                        const pathParts = url.pathname.split("/storage/v1/object/public/");
                        if (pathParts.length > 1) {
                          const [bucket, ...fp] = pathParts[1].split("/");
                          await supabase.storage.from(bucket).remove([fp.join("/")]);
                        }
                      } catch {}
                    }
                    // Delete post (cascades)
                    await supabase.from("posts").delete().eq("id", selectedReport.reported_post_id);
                    await handleAction("actioned");
                    toast.success("Post permanently deleted");
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to delete post");
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting || processing}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete Post
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleAction("dismissed")}
              disabled={processing}
            >
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAction("reviewed")}
              disabled={processing}
            >
              Mark Reviewed
            </Button>
            <Button
              onClick={() => handleAction("actioned")}
              disabled={processing}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark Actioned
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsTab;
