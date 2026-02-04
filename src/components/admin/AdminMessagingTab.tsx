import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Bell } from "lucide-react";

const AdminMessagingTab = () => {
  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notification system has been reset for a fresh setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Clean Slate</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                The Firebase Cloud Messaging (FCM) integration has been completely removed.
                A fresh push notification setup can now be configured.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                To set up new push notifications:
              </p>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-sm text-muted-foreground">
                <li>Create a new Firebase project</li>
                <li>Generate new service account credentials</li>
                <li>Add new secrets (FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY, etc.)</li>
                <li>Create new service worker and edge functions</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMessagingTab;