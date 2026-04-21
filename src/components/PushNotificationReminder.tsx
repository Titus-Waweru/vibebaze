import { useState, useEffect } from "react";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushNotificationReminderProps {
  userName?: string;
}

const PushNotificationReminder = ({ userName }: PushNotificationReminderProps) => {
  const { isSupported, isEnabled, isLoading, enableNotifications } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasSeenReminder = localStorage.getItem("vb_push_reminder_seen");
    setIsFirstLogin(!hasSeenReminder);
  }, []);

  // Smart trigger: only show if permission is "default" (never asked).
  // Skip entirely if "granted" (already on) or "denied" (don't spam).
  // Delay 8s after mount so it doesn't pop instantly.
  useEffect(() => {
    if (!isSupported || isEnabled || isLoading) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    const t = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(t);
  }, [isSupported, isEnabled, isLoading]);

  if (dismissed || !visible || !isSupported || isEnabled || isLoading) return null;
  if (typeof Notification !== "undefined" && Notification.permission !== "default") return null;

  const displayName = userName || "there";
  const message = isFirstLogin
    ? `👋 Hi ${displayName}! Don't miss out on updates—please enable push notifications for the latest news and features! 📢`
    : `🌟 Hey ${displayName}, you can stay updated with all VibeBaze notifications by turning on push notifications! 🔔`;

  const handleEnable = async () => {
    const success = await enableNotifications();
    if (success) {
      localStorage.setItem("vb_push_reminder_seen", "true");
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("vb_push_reminder_seen", "true");
    setDismissed(true);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-primary/95 text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md animate-in slide-in-from-top duration-300">
      <Bell className="h-5 w-5 shrink-0" />
      <p className="text-sm flex-1 leading-snug">{message}</p>
      <Button
        size="sm"
        variant="secondary"
        className="shrink-0 text-xs"
        onClick={handleEnable}
      >
        Enable
      </Button>
      <button onClick={handleDismiss} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PushNotificationReminder;
