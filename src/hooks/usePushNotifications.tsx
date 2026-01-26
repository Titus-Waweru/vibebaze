import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requestFCMToken, onFCMMessage, initializeFirebase } from "@/lib/firebase";

// VAPID public key for FCM - This needs to be set in project environment variables
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export const usePushNotifications = (userId: string | undefined) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 
      "serviceWorker" in navigator && 
      "PushManager" in window && 
      "Notification" in window;
    setIsSupported(supported);

    if (supported && typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
    
    // Log configuration status for debugging
    console.log("[Push] VAPID key configured:", !!VAPID_PUBLIC_KEY);
    console.log("[Push] Push supported:", supported);
  }, []);

  useEffect(() => {
    if (userId && isSupported) {
      checkSubscription();
    }
  }, [userId, isSupported]);

  // Set up foreground message listener
  useEffect(() => {
    if (!isSubscribed) return;

    const unsubscribe = onFCMMessage((payload) => {
      // Show toast for foreground notifications
      const title = payload.notification?.title || payload.data?.title || "VibeLoop";
      const body = payload.notification?.body || payload.data?.body || "";
      
      toast(title, {
        description: body,
        action: payload.data?.url ? {
          label: "View",
          onClick: () => window.location.href = payload.data.url,
        } : undefined,
      });
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [isSubscribed]);

  const checkSubscription = async () => {
    if (!userId) return;

    try {
      // Check if user has any subscription stored
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("endpoint")
        .eq("user_id", userId)
        .limit(1);

      if (!error && data && data.length > 0) {
        // Check if it's a valid FCM token (not a browser placeholder)
        const hasValidToken = data.some(sub => 
          sub.endpoint && !sub.endpoint.startsWith("browser-")
        );
        
        // Also check if notification permission is granted
        const permissionGranted = Notification.permission === "granted";
        
        console.log("[Push] Has valid token:", hasValidToken);
        console.log("[Push] Permission granted:", permissionGranted);
        
        // Only show as subscribed if we have valid token AND permission
        setIsSubscribed(hasValidToken && permissionGranted);
      }
    } catch (error) {
      console.error("[Push] Error checking subscription:", error);
    }
  };

  const subscribe = useCallback(async () => {
    if (!userId || !isSupported) {
      toast.error("Push notifications not supported on this device");
      return false;
    }

    setLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      console.log("[Push] Permission result:", permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Please allow notifications to receive updates");
        setLoading(false);
        return false;
      }

      // Register Firebase service worker
      let swRegistration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (!swRegistration) {
        console.log("[Push] Registering service worker...");
        swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        await navigator.serviceWorker.ready;
      }
      console.log("[Push] Service worker ready");

      // Initialize Firebase and get FCM token
      const messagingInstance = initializeFirebase();
      
      if (!VAPID_PUBLIC_KEY) {
        console.warn("[Push] VAPID_PUBLIC_KEY not configured");
        toast.error("Push notifications not fully configured. Contact support.");
        setLoading(false);
        return false;
      }

      console.log("[Push] Requesting FCM token...");
      const token = await requestFCMToken(VAPID_PUBLIC_KEY);
      
      if (!token) {
        console.error("[Push] Failed to get FCM token");
        toast.error("Failed to enable notifications. Try again.");
        setLoading(false);
        return false;
      }

      console.log("[Push] FCM token obtained successfully");
      setFcmToken(token);

      // UPSERT: Delete existing and insert new in a transaction-safe way
      // First try to upsert by deleting then inserting
      console.log("[Push] Saving FCM token to database...");
      
      // Use upsert pattern: delete first, then insert
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);
      
      if (deleteError) {
        console.warn("[Push] Delete warning (non-fatal):", deleteError);
      }

      // Small delay to ensure delete completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now insert the new token
      const { error: insertError } = await supabase.from("push_subscriptions").insert({
        user_id: userId,
        endpoint: token, // Store FCM token as endpoint
        p256dh: "fcm", // Marker to identify as FCM
        auth: "fcm",
      });

      // If insert fails with conflict, try update instead
      if (insertError?.code === "23505" || insertError?.message?.includes("duplicate") || insertError?.message?.includes("409")) {
        console.log("[Push] Conflict detected, attempting update...");
        const { error: updateError } = await supabase
          .from("push_subscriptions")
          .update({
            endpoint: token,
            p256dh: "fcm",
            auth: "fcm",
          })
          .eq("user_id", userId);
        
        if (updateError) {
          console.error("[Push] Update also failed:", updateError);
          throw updateError;
        }
        console.log("[Push] Token updated successfully via fallback");
      } else if (insertError) {
        throw insertError;
      } else {
        console.log("[Push] Token inserted successfully");
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
      return true;
    } catch (error) {
      console.error("[Push] Error subscribing:", error);
      toast.error("Failed to enable notifications. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return false;

    setLoading(true);

    try {
      // Remove FCM token from database
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);

      // Try to unregister service worker
      const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      setIsSubscribed(false);
      setFcmToken(null);
      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      toast.error("Failed to disable notifications");
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    isSubscribed,
    isSupported,
    permission,
    loading,
    fcmToken,
    subscribe,
    unsubscribe,
  };
};
