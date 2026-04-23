import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bell, Send, Loader2, CheckCircle2, AlertCircle, Users, Shield, Mail, Smartphone, Clock, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type MessageType = "update" | "important" | "alert" | "announcement" | "maintenance";
type DeliveryChannel = "both" | "email" | "push";

const messageTypeOptions: { value: MessageType; label: string; emoji: string; description: string }[] = [
  { value: "update", label: "Platform Update", emoji: "🚀", description: "New features & improvements" },
  { value: "important", label: "Important Notice", emoji: "📢", description: "Critical information for users" },
  { value: "alert", label: "Security Alert", emoji: "🚨", description: "Security-related notices" },
  { value: "announcement", label: "Announcement", emoji: "🎉", description: "General announcements" },
  { value: "maintenance", label: "Maintenance", emoji: "🔧", description: "Scheduled maintenance notices" },
];

interface BroadcastJob {
  id: string;
  title: string;
  body: string;
  message_type: string;
  channel: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_users: number;
  total_subscriptions: number;
  email_sent: number;
  email_failed: number;
  push_sent: number;
  push_failed: number;
  tokens_removed: number;
  email_done: boolean;
  push_done: boolean;
  last_error: string | null;
  created_at: string;
  completed_at: string | null;
}

const AdminMessagingTab = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("update");
  const [channel, setChannel] = useState<DeliveryChannel>("both");
  const [sending, setSending] = useState(false);
  const [jobs, setJobs] = useState<BroadcastJob[]>([]);

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from("broadcast_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error && data) setJobs(data as BroadcastJob[]);
  }, []);

  useEffect(() => {
    fetchJobs();
    // Poll every 3s while any job is active
    const interval = setInterval(() => {
      fetchJobs();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-broadcast", {
        body: {
          title: title.trim(),
          body: body.trim(),
          messageType,
          channel,
        },
      });

      if (error) throw error;

      if (data?.jobId) {
        toast.success("Broadcast queued — processing in background");
        setTitle("");
        setBody("");
        fetchJobs();
      } else {
        toast.error(data?.error || "Failed to queue broadcast");
      }
    } catch (error) {
      console.error("Error queuing broadcast:", error);
      toast.error("Failed to queue broadcast");
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status: BroadcastJob["status"]) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" />, label: "Pending" },
      processing: { variant: "secondary", icon: <Activity className="h-3 w-3 animate-pulse" />, label: "Processing" },
      completed: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" />, label: "Completed" },
      failed: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" />, label: "Failed" },
    };
    const cfg = map[status] || map.pending;
    return (
      <Badge variant={cfg.variant} className="gap-1">
        {cfg.icon}
        {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Broadcast Card */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Admin Broadcast
          </CardTitle>
          <CardDescription>
            Queue an email + push notification broadcast — processed in background batches for resilience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message Type */}
          <div className="space-y-2">
            <Label htmlFor="message-type">Message Type</Label>
            <Select value={messageType} onValueChange={(v) => setMessageType(v as MessageType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {messageTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                      <span className="text-muted-foreground text-xs ml-1">— {opt.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="notification-title">Title</Label>
            <Input
              id="notification-title"
              placeholder="e.g., New Creator Tools Available! 🎉"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="notification-body">Message</Label>
            <Textarea
              id="notification-body"
              placeholder="e.g., We've launched exciting new tools for creators. Check them out now!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={5}
            />
            <p className="text-xs text-muted-foreground text-right">{body.length}/1000</p>
          </div>

          {/* Delivery Channel */}
          <div className="space-y-2">
            <Label>Delivery Channel</Label>
            <RadioGroup value={channel} onValueChange={(v) => setChannel(v as DeliveryChannel)} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="both" id="ch-both" />
                <Label htmlFor="ch-both" className="flex items-center gap-1 cursor-pointer text-sm">
                  <Mail className="h-3.5 w-3.5" /> + <Smartphone className="h-3.5 w-3.5" /> Both
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="email" id="ch-email" />
                <Label htmlFor="ch-email" className="flex items-center gap-1 cursor-pointer text-sm">
                  <Mail className="h-3.5 w-3.5" /> Email only
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="push" id="ch-push" />
                <Label htmlFor="ch-push" className="flex items-center gap-1 cursor-pointer text-sm">
                  <Smartphone className="h-3.5 w-3.5" /> Push only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={handleBroadcast}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full gap-2"
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Queuing...</>
            ) : (
              <><Send className="h-4 w-4" /> Queue Broadcast</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Broadcast Jobs
          </CardTitle>
          <CardDescription>Live progress — auto-refreshes every 3 seconds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No broadcasts yet</p>
          )}
          {jobs.map((job) => {
            const emailTotal = job.email_sent + job.email_failed;
            const pushTotal = job.push_sent + job.push_failed;
            const emailPct = job.total_users > 0 ? Math.min(100, Math.round((emailTotal / job.total_users) * 100)) : (job.email_done ? 100 : 0);
            const pushPct = job.total_subscriptions > 0 ? Math.min(100, Math.round((pushTotal / job.total_subscriptions) * 100)) : (job.push_done ? 100 : 0);
            const includeEmail = job.channel === "both" || job.channel === "email";
            const includePush = job.channel === "both" || job.channel === "push";

            return (
              <div key={job.id} className="border border-border/50 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                  {statusBadge(job.status)}
                </div>

                {includeEmail && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" /> Email
                      </span>
                      <span className="text-muted-foreground">
                        {emailTotal} {job.total_users > 0 ? `/ ${job.total_users}` : ""}
                        {job.email_failed > 0 && <span className="text-destructive ml-1">({job.email_failed} failed)</span>}
                      </span>
                    </div>
                    <Progress value={emailPct} className="h-1.5" />
                  </div>
                )}

                {includePush && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Smartphone className="h-3 w-3" /> Push
                      </span>
                      <span className="text-muted-foreground">
                        {pushTotal} {job.total_subscriptions > 0 ? `/ ${job.total_subscriptions}` : ""}
                        {job.push_failed > 0 && <span className="text-destructive ml-1">({job.push_failed} failed)</span>}
                        {job.tokens_removed > 0 && <span className="ml-1">🗑️ {job.tokens_removed}</span>}
                      </span>
                    </div>
                    <Progress value={pushPct} className="h-1.5" />
                  </div>
                )}

                {job.last_error && (
                  <p className="text-xs text-destructive truncate">⚠️ {job.last_error}</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Broadcast System Info
          </CardTitle>
          <CardDescription>Communication infrastructure details</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>Background Job System Active</AlertTitle>
            <AlertDescription className="space-y-2">
              <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
                <li><strong>Architecture:</strong> Cursor-paginated background worker</li>
                <li><strong>Email batches:</strong> 50 per cycle via Resend (updates@vibebaze.com)</li>
                <li><strong>Push batches:</strong> 100 per cycle via FCM V1</li>
                <li><strong>Resilience:</strong> Self-invoking worker + pg_cron safety net (every minute)</li>
                <li><strong>Fault tolerance:</strong> Per-message try/catch, failed sends don't halt the job</li>
                <li><strong>Audit:</strong> Every job + completion logged to admin_logs</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMessagingTab;
