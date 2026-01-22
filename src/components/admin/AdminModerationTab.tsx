import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Check, X, Trash2, Eye } from "lucide-react";
import { useContentModeration, ContentFlag } from "@/hooks/useContentModeration";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const AdminModerationTab = () => {
  const { flags, loading, stats, fetchFlags, reviewFlag, deleteContent } = useContentModeration();
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "actioned" | "dismissed">("pending");
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchFlags(filter === "all" ? undefined : filter);
  }, [filter, fetchFlags]);

  const handleAction = async (action: "reviewed" | "actioned" | "dismissed") => {
    if (!selectedFlag) return;
    setProcessing(true);
    await reviewFlag(selectedFlag.id, action, actionNotes);
    setSelectedFlag(null);
    setActionNotes("");
    setProcessing(false);
  };

  const handleDeleteContent = async () => {
    if (!selectedFlag) return;
    setProcessing(true);
    if (selectedFlag.post_id) {
      await deleteContent(selectedFlag.id, "post", selectedFlag.post_id);
    } else if (selectedFlag.comment_id) {
      await deleteContent(selectedFlag.id, "comment", selectedFlag.comment_id);
    }
    setSelectedFlag(null);
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{stats.reviewed}</div>
            <p className="text-sm text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{stats.actioned}</div>
            <p className="text-sm text-muted-foreground">Actioned</p>
          </CardContent>
        </Card>
        <Card className="border-muted">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.dismissed}</div>
            <p className="text-sm text-muted-foreground">Dismissed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Flags</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="actioned">Actioned</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchFlags(filter === "all" ? undefined : filter)}>
          Refresh
        </Button>
      </div>

      {/* Flags List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Content Flags ({flags.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : flags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No flags found with current filter
            </div>
          ) : (
            <div className="space-y-4">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${flag.urgency_level && flag.urgency_level >= 3 ? 'bg-red-500/20' : 'bg-muted'}`}>
                      <AlertTriangle className={`h-5 w-5 ${flag.urgency_level && flag.urgency_level >= 3 ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getReasonBadgeColor(flag.reason)}>
                          {flag.reason.replace("_", " ")}
                        </Badge>
                        {getStatusBadge(flag.status)}
                        <span className="text-xs text-muted-foreground">
                          via {flag.source.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {flag.description || "No description provided"}
                      </p>
                      {flag.reporter && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={flag.reporter.avatar_url || undefined} />
                            <AvatarFallback>{flag.reporter.username[0]}</AvatarFallback>
                          </Avatar>
                          Reported by @{flag.reporter.username}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(flag.created_at))} ago
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFlag(flag)}
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
      <Dialog open={!!selectedFlag} onOpenChange={() => setSelectedFlag(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Content Flag</DialogTitle>
          </DialogHeader>
          {selectedFlag && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getReasonBadgeColor(selectedFlag.reason)}>
                    {selectedFlag.reason.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Urgency: {selectedFlag.urgency_level || 1}/5
                  </span>
                </div>
                <p className="text-sm">{selectedFlag.description || "No description"}</p>
                {selectedFlag.post && (
                  <div className="mt-2 p-2 rounded bg-background/50">
                    <p className="text-xs text-muted-foreground">Post: {selectedFlag.post.type}</p>
                    <p className="text-sm truncate">{selectedFlag.post.caption || "No caption"}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Action Notes (optional)</label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add notes about this action..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {(selectedFlag?.post_id || selectedFlag?.comment_id) && (
              <Button
                variant="destructive"
                onClick={handleDeleteContent}
                disabled={processing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Content
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

export default AdminModerationTab;
