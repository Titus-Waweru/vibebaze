import { useState, useEffect, useCallback } from "react";
import { initializeMessaging, getMessagingInstance, getToken, onMessage } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = "BFrNZGJrQMzCvC5LfDaKqxVJL9YKvRJcF8pSxqkqjJhEf8vYzRkPnZpHmGcTjQxLsKwNvDcXfAqBzCeYgHiJkL0";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Check if notifications are supported and get current status
  useEffect(() => {
    const checkSupport = async () => {
      // Check browser support
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      setIsSupported(true);

      // Check if user has a token stored
      if (user) {
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint")
          .eq("user_id", user.id)
          .maybeSingle();

        setIsEnabled(!!data);
      }

      setIsLoading(false);
    };

    checkSupport();
  }, [user]);

  // Register service worker and get FCM token
  const enableNotifications = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to enable notifications");
      return false;
    }

    try {
      setIsLoading(true);

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setIsLoading(false);
        return false;
      }

      // Register the service worker
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/"
      });

      console.log("Service Worker registered:", registration);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Initialize Firebase Messaging
      const messaging = await initializeMessaging();
      if (!messaging) {
        toast.error("Push notifications not supported in this browser");
        setIsLoading(false);
        return false;
      }

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (!token) {
        toast.error("Failed to get notification token");
        setIsLoading(false);
        return false;
      }

      console.log("FCM Token obtained:", token);
      setFcmToken(token);

      // Store token in database (using endpoint field for FCM token)
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: token,
          p256dh: "fcm", // Placeholder for FCM
          auth: "fcm"    // Placeholder for FCM
        }, {
          onConflict: "user_id"
        });

      if (error) {
        console.error("Error saving FCM token:", error);
        toast.error("Failed to save notification settings");
        setIsLoading(false);
        return false;
      }

      setIsEnabled(true);
      toast.success("Notifications enabled!");
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast.error("Failed to enable notifications");
      setIsLoading(false);
      return false;
    }
  }, [user]);

  // Disable notifications
  const disableNotifications = useCallback(async () => {
    if (!user) return false;

    try {
      setIsLoading(true);

      // Remove token from database
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing FCM token:", error);
        toast.error("Failed to disable notifications");
        setIsLoading(false);
        return false;
      }

      // Unregister service worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active?.scriptURL.includes("firebase-messaging-sw.js")) {
          await registration.unregister();
        }
      }

      setIsEnabled(false);
      setFcmToken(null);
      toast.success("Notifications disabled");
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error disabling notifications:", error);
      toast.error("Failed to disable notifications");
      setIsLoading(false);
      return false;
    }
  }, [user]);

  // Listen for foreground messages
  useEffect(() => {
    const setupForegroundListener = async () => {
      const messaging = getMessagingInstance();
      if (!messaging || !isEnabled) return;

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Foreground message received:", payload);
        
        // Show toast for foreground notifications
        toast(payload.notification?.title || "New Notification", {
          description: payload.notification?.body,
          action: payload.data?.url ? {
            label: "View",
            onClick: () => window.location.href = payload.data?.url
          } : undefined
        });
      });

      return unsubscribe;
    };

    setupForegroundListener();
  }, [isEnabled]);

  return {
    isSupported,
    isEnabled,
    isLoading,
    fcmToken,
    enableNotifications,
    disableNotifications
  };
};
