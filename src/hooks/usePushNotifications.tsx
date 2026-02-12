import { useState, useEffect, useCallback } from "react";
import { initializeMessaging, getMessagingInstance, getToken, onMessage } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

// Detect device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) return "mobile";
  if (/tablet|ipad/.test(ua)) return "tablet";
  return "desktop";
};

export const usePushNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Check if notifications are supported and get current status
  useEffect(() => {
    const checkSupport = async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      setIsSupported(true);

      // Check if this user has any tokens stored (multi-device)
      if (user) {
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint")
          .eq("user_id", user.id);

        setIsEnabled(!!(data && data.length > 0));
        if (data && data.length > 0) {
          setFcmToken(data[0].endpoint);
        }
      }

      setIsLoading(false);
    };

    checkSupport();
  }, [user]);

  // Handle notification click navigation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICKED" && event.data?.url) {
        navigate(event.data.url);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [navigate]);

  const getPermissionState = useCallback((): NotificationPermission | "unsupported" => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to enable notifications");
      return false;
    }

    try {
      setIsLoading(true);

      const currentPermission = getPermissionState();
      
      if (currentPermission === "denied") {
        toast.error(
          "Notifications are blocked. Please enable them in your browser settings:\n" +
          "Chrome: Settings → Site Settings → Notifications\n" +
          "Safari: Preferences → Websites → Notifications",
          { duration: 8000 }
        );
        setIsLoading(false);
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") {
          toast.error(
            "Notification permission denied. To enable later, update your browser notification settings.",
            { duration: 6000 }
          );
        } else {
          toast.info("Notification permission dismissed. You can try again later.");
        }
        setIsLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      console.log("[VibeBaze] Using PWA service worker for FCM:", registration);

      const messaging = await initializeMessaging();
      if (!messaging) {
        toast.error("Push notifications not supported in this browser");
        setIsLoading(false);
        return false;
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (!token) {
        toast.error("Failed to get notification token");
        setIsLoading(false);
        return false;
      }

      console.log("[VibeBaze] FCM Token obtained:", token.substring(0, 20) + "...");
      setFcmToken(token);

      const deviceType = getDeviceType();

      // Upsert token per device (unique on user_id + endpoint)
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: token,
          p256dh: "fcm-v1",
          auth: "fcm-v1",
          device_type: deviceType
        }, {
          onConflict: "user_id,endpoint"
        });

      if (error) {
        console.error("[VibeBaze] Error saving FCM token:", error);
        toast.error("Failed to save notification settings");
        setIsLoading(false);
        return false;
      }

      setIsEnabled(true);
      toast.success("Notifications enabled!");
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("[VibeBaze] Error enabling notifications:", error);
      toast.error("Failed to enable notifications");
      setIsLoading(false);
      return false;
    }
  }, [user]);

  // Disable notifications - removes ALL tokens for this user
  const disableNotifications = useCallback(async () => {
    if (!user) return false;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("[VibeBaze] Error removing FCM tokens:", error);
        toast.error("Failed to disable notifications");
        setIsLoading(false);
        return false;
      }

      setIsEnabled(false);
      setFcmToken(null);
      toast.success("Notifications disabled");
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("[VibeBaze] Error disabling notifications:", error);
      toast.error("Failed to disable notifications");
      setIsLoading(false);
      return false;
    }
  }, [user]);

  // Refresh token if needed
  const refreshToken = useCallback(async () => {
    if (!user || !isEnabled) return;

    try {
      const messaging = getMessagingInstance();
      if (!messaging) return;

      const registration = await navigator.serviceWorker.ready;

      const newToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (newToken && newToken !== fcmToken) {
        console.log("[VibeBaze] Token refreshed");
        const deviceType = getDeviceType();
        
        // If old token exists, remove it first then insert new
        if (fcmToken) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", fcmToken);
        }

        await supabase
          .from("push_subscriptions")
          .upsert({
            user_id: user.id,
            endpoint: newToken,
            p256dh: "fcm-v1",
            auth: "fcm-v1",
            device_type: deviceType
          }, {
            onConflict: "user_id,endpoint"
          });

        setFcmToken(newToken);
      }
    } catch (error) {
      console.error("[VibeBaze] Error refreshing token:", error);
    }
  }, [user, isEnabled, fcmToken]);

  // Listen for foreground messages
  useEffect(() => {
    const setupForegroundListener = async () => {
      const messaging = getMessagingInstance();
      if (!messaging || !isEnabled) return;

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("[VibeBaze] Foreground message received:", payload);
        
        toast(payload.notification?.title || "New Notification", {
          description: payload.notification?.body,
          action: payload.data?.url ? {
            label: "View",
            onClick: () => navigate(payload.data?.url || "/feed")
          } : undefined
        });
      });

      return unsubscribe;
    };

    setupForegroundListener();
  }, [isEnabled, navigate]);

  // Periodically refresh token
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(refreshToken, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isEnabled, refreshToken]);

  return {
    isSupported,
    isEnabled,
    isLoading,
    fcmToken,
    enableNotifications,
    disableNotifications,
    refreshToken
  };
};

// Utility function to send a push notification
export const sendPushNotification = async (options: {
  userId?: string;
  userIds?: string[];
  broadcast?: boolean;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: options
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[VibeBaze] Error sending push notification:", error);
    throw error;
  }
};
