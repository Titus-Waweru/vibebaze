import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Bell, Loader2, Send, Shield, Flag, Users, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminModerationTab from "@/components/admin/AdminModerationTab";
import AdminReportsTab from "@/components/admin/AdminReportsTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminLogsTab from "@/components/admin/AdminLogsTab";

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        setIsAdmin(!!data);
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

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

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
        <Navbar />
        <div className="container mx-auto px-4 pt-6 max-w-xl">
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Shield className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground">
                  You don't have permission to access the admin panel.
                </p>
                <Button onClick={() => navigate("/feed")}>Go to Feed</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage content, users, and platform settings</p>
          </div>
        </div>

        <Tabs defaultValue="moderation" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="moderation" className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">Moderation</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notify</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="moderation">
            <AdminModerationTab />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReportsTab />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersTab />
          </TabsContent>

          <TabsContent value="logs">
            <AdminLogsTab />
          </TabsContent>

          <TabsContent value="notifications">
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
                    placeholder="e.g., VibeLoop Update Available!"
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
