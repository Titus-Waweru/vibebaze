import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Check, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";

export const PermissionsSetup = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { user } = useAuth();
  const { isSubscribed, subscribe, isSupported, permission } = usePushNotifications(user?.id);

  useEffect(() => {
    // Check if we've already dismissed the popup in this session
    const hasDismissed = sessionStorage.getItem('notification_popup_dismissed');
    
    // Show popup if:
    // - User is authenticated
    // - Push is supported
    // - Permission is "default" (not yet asked) or we haven't subscribed
    // - User hasn't dismissed in this session
    if (user && isSupported && permission === 'default' && !isSubscribed && !hasDismissed) {
      // Show permissions dialog after a short delay
      const timer = setTimeout(() => setShowDialog(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isSubscribed, isSupported, permission]);

  const handleEnableNotifications = async () => {
    const success = await subscribe();
    if (success) {
      localStorage.setItem('permissions_requested', 'true');
      setShowDialog(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem('notification_popup_dismissed', 'true');
    setShowDialog(false);
  };

  if (!showDialog) return null;

  return (
    <Dialog open={showDialog} onOpenChange={(open) => {
      if (!open) handleSkip();
      setShowDialog(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary">
            <Bell className="h-8 w-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">Stay Connected</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Enable notifications to get instant updates when someone likes your posts, follows you, or comments on your content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">Get notified about new followers and interactions</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">See when your posts go viral (10+ likes)</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">Never miss updates from your favorite creators</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button 
              size="lg" 
              className="bg-gradient-primary text-primary-foreground shadow-glow w-full"
              onClick={handleEnableNotifications}
            >
              <Bell className="mr-2 h-5 w-5" />
              Enable Notifications
            </Button>
            <Button 
              size="lg" 
              variant="ghost" 
              onClick={handleSkip}
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
