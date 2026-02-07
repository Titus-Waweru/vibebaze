import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bell, Send, Loader2, CheckCircle2, AlertCircle, Users, Shield, Mail, Smartphone } from "lucide-react";
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

interface BroadcastResult {
  success: boolean;
  email: { sent: number; failed: number; total: number };
  push: { sent: number; failed: number; total: number; tokensRemoved: number };
}

const AdminMessagingTab = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("update");
  const [channel, setChannel] = useState<DeliveryChannel>("both");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<BroadcastResult | null>(null);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    setSending(true);
    setLastResult(null);

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

      const result = data as BroadcastResult;
      setLastResult(result);

      const totalSent = (result.email?.sent || 0) + (result.push?.sent || 0);
      if (totalSent > 0) {
        toast.success(`Broadcast sent! ${result.email?.sent || 0} emails, ${result.push?.sent || 0} push notifications`);
        setTitle("");
        setBody("");
      } else {
        toast.info("No users received the broadcast");
      }
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast");
      setLastResult(null);
    } finally {
      setSending(false);
    }
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
            Send an email + push notification to all registered users simultaneously
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
              <><Loader2 className="h-4 w-4 animate-spin" /> Broadcasting...</>
            ) : (
              <><Send className="h-4 w-4" /> Broadcast to All Users</>
            )}
          </Button>

          {/* Last Result */}
          {lastResult && (
            <Alert variant={(lastResult.email?.sent || 0) + (lastResult.push?.sent || 0) > 0 ? "default" : "destructive"}>
              {(lastResult.email?.sent || 0) + (lastResult.push?.sent || 0) > 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>Broadcast Results</AlertTitle>
              <AlertDescription>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {/* Email results */}
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-1 text-sm"><Mail className="h-3.5 w-3.5" /> Email</p>
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {lastResult.email?.total || 0} recipients</div>
                      <div className="text-primary">✓ {lastResult.email?.sent || 0} sent</div>
                      {(lastResult.email?.failed || 0) > 0 && (
                        <div className="text-destructive">✗ {lastResult.email.failed} failed</div>
                      )}
                    </div>
                  </div>
                  {/* Push results */}
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-1 text-sm"><Smartphone className="h-3.5 w-3.5" /> Push</p>
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {lastResult.push?.total || 0} subscribers</div>
                      <div className="text-primary">✓ {lastResult.push?.sent || 0} sent</div>
                      {(lastResult.push?.failed || 0) > 0 && (
                        <div className="text-destructive">✗ {lastResult.push.failed} failed</div>
                      )}
                      {(lastResult.push?.tokensRemoved || 0) > 0 && (
                        <div className="text-muted-foreground">🗑️ {lastResult.push.tokensRemoved} stale tokens removed</div>
                      )}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
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
            <AlertTitle>System Ready</AlertTitle>
            <AlertDescription className="space-y-2">
              <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
                <li><strong>Email:</strong> Resend API via updates@vibebaze.com</li>
                <li><strong>Push:</strong> Firebase Cloud Messaging V1 (Service Account OAuth2)</li>
                <li><strong>Delivery:</strong> Email + Push sent in parallel for instant reach</li>
                <li><strong>Audit:</strong> Every broadcast logged to admin_logs</li>
                <li><strong>Security:</strong> Admin role required, server-side verification</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMessagingTab;
