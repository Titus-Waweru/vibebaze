import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, Send, Loader2, CheckCircle2, AlertCircle, Users, Shield } from "lucide-react";
import { broadcastNotification } from "@/lib/notificationService";
import { toast } from "sonner";

const AdminMessagingTab = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    sent: number;
    failed: number;
    total: number;
    tokensRemoved?: number;
  } | null>(null);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const result = await broadcastNotification(title.trim(), body.trim());
      
      setLastResult(result);
      
      if (result.sent > 0) {
        toast.success(`Notification sent to ${result.sent} users!`);
        setTitle("");
        setBody("");
      } else if (result.total === 0) {
        toast.info("No users with notifications enabled");
      } else {
        toast.error("Failed to send notifications");
      }
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send notification");
      setLastResult({
        success: false,
        sent: 0,
        failed: 0,
        total: 0
      });
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
            Send Push Notification
          </CardTitle>
          <CardDescription>
            Broadcast a notification to all users with push notifications enabled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-title">Notification Title</Label>
            <Input
              id="notification-title"
              placeholder="e.g., New Feature Alert! 🎉"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-body">Message</Label>
            <Textarea
              id="notification-body"
              placeholder="e.g., Check out our new Creator School to learn how to grow your audience!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length}/500
            </p>
          </div>

          <Button
            onClick={handleBroadcast}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to All Users
              </>
            )}
          </Button>

          {/* Last Result */}
          {lastResult && (
            <Alert variant={lastResult.sent > 0 ? "default" : "destructive"}>
              {lastResult.sent > 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {lastResult.sent > 0 ? "Broadcast Sent" : "Broadcast Failed"}
              </AlertTitle>
              <AlertDescription>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{lastResult.total} subscribers</span>
                  </div>
                  <div className="text-green-500">✓ {lastResult.sent} sent</div>
                  {lastResult.failed > 0 && (
                    <div className="text-destructive">✗ {lastResult.failed} failed</div>
                  )}
                  {lastResult.tokensRemoved && lastResult.tokensRemoved > 0 && (
                    <div className="text-muted-foreground">
                      🗑️ {lastResult.tokensRemoved} invalid tokens removed
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* FCM V1 API Info */}
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            FCM V1 API Configuration
          </CardTitle>
          <CardDescription>
            Firebase Cloud Messaging is configured using the modern V1 API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Setup Complete</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Push notifications are configured using Firebase V1 API with service account authentication.
                This is the modern, recommended approach by Google.
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
                <li>Firebase project: Configured via environment secrets</li>
                <li>Authentication: Service Account (OAuth2)</li>
                <li>API: FCM V1 (https://fcm.googleapis.com/v1/...)</li>
                <li>Service worker: /firebase-messaging-sw.js</li>
                <li>Tokens stored in: push_subscriptions table</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>Benefits of V1 API:</strong> Better security, no legacy server keys,
                automatic token management, and improved delivery reliability.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMessagingTab;
