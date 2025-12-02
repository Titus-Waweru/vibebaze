import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";

export const PermissionsSetup = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { user } = useAuth();
  const { isSubscribed, subscribe, isSupported } = usePushNotifications(user?.id);

  useEffect(() => {
    // Check if app is installed and user is authenticated
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
    
    // Check if we've already asked for permissions
    const hasAskedForPermissions = localStorage.getItem('permissions_requested');
    
    if (isInstalled && user && !isSubscribed && !hasAskedForPermissions && isSupported) {
      // Show permissions dialog after a short delay
      setTimeout(() => setShowDialog(true), 1000);
    }
  }, [user, isSubscribed, isSupported]);

  const handleEnableNotifications = async () => {
    const success = await subscribe();
    if (success) {
      localStorage.setItem('permissions_requested', 'true');
      setShowDialog(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('permissions_requested', 'true');
    setShowDialog(false);
  };

  if (!showDialog) return null;

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
