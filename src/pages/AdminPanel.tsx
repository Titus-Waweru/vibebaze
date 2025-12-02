import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Bell, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [adminSecret, setAdminSecret] = useState("");

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!adminSecret.trim()) {
      toast.error("Admin secret is required");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-app-update-notification",
        {
          body: {
            title: title.trim(),
            body: body.trim(),
            adminSecret: adminSecret.trim(),
          },
        }
      );

      if (error) throw error;

      toast.success(
        `Notification sent! ${data.success}/${data.total} delivered successfully`
      );
      setTitle("");
      setBody("");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification. Check admin secret.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-6 max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        </div>

        {/* Send App-Wide Notification */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send App Update Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-secret">Admin Secret *</Label>
              <Input
                id="admin-secret"
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Enter admin secret"
              />
              <p className="text-xs text-muted-foreground">
                This is required to authorize app-wide notifications
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-title">Title *</Label>
              <Input
                id="notification-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., VibeSphere Update Available!"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-body">Message *</Label>
              <Textarea
                id="notification-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g., New features and improvements are now available. Update now to enjoy the latest version!"
                maxLength={200}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {body.length}/200
              </p>
            </div>

            <Button
              onClick={handleSendNotification}
              disabled={sending}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to All Users
            </Button>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-500">
                ⚠️ This will send a push notification to ALL users with
                notifications enabled. Use responsibly!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
