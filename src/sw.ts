/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & typeof globalThis & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };
declare function importScripts(...urls: string[]): void;

// Workbox precache (required by vite-plugin-pwa injectManifest)
precacheAndRoute(self.__WB_MANIFEST);


// Firebase Cloud Messaging
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js"
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fb = (self as any).firebase;

fb.initializeApp({
  apiKey: "AIzaSyBelWjvdwophP69GbZ9yHCWkPUfaZmrCFY",
  authDomain: "vibebaze-f08b2.firebaseapp.com",
  projectId: "vibebaze-f08b2",
  storageBucket: "vibebaze-f08b2.firebasestorage.app",
  messagingSenderId: "122281450366",
  appId: "1:122281450366:web:0158023505555e903fb12f",
  measurementId: "G-GDVVV4BY89",
});

const messaging = fb.messaging();

console.log("[VibeBaze] SW: Firebase initialized in unified service worker");

// Handle background push notifications
// eslint-disable-next-line @typescript-eslint/no-explicit-any
messaging.onBackgroundMessage((payload: any) => {
  console.log("[VibeBaze] Background message received:", payload);

  const title = payload.notification?.title || "VibeBaze";
  const notifTag = payload.data?.tag
    ? `${payload.data.tag}-${Date.now()}`
    : `vibebaze-${Date.now()}`;
  const options: NotificationOptions & { data?: Record<string, string>; vibrate?: number[]; requireInteraction?: boolean } = {
    body: payload.notification?.body || "You have a new notification",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: notifTag,
    requireInteraction: true,
  };

  self.registration.showNotification(title, options);
});

// Fallback: handle raw push events not caught by Firebase SDK
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    // Always show a notification — guarantees delivery when app is closed,
    // even if Firebase SDK background handler didn't fire. The `tag` dedupes
    // so Firebase + this handler won't show duplicates.
    const notif = payload.notification || payload.data || {};
    const title = notif.title || payload.data?.title || "VibeBaze";
    const body = notif.body || payload.data?.body || "You have a new notification";
    const baseTag = payload.data?.tag || "vibebaze-push";
    const tag = `${baseTag}-${Date.now()}`;

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag,
        requireInteraction: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...( { vibrate: [200, 100, 200] } as any ),
        data: payload.data || {},
      } as NotificationOptions)
    );
  } catch {
    // Not JSON or already handled
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[VibeBaze] Notification clicked:", event);
  event.notification.close();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const urlToOpen = (event.notification as any).data?.url || "/feed";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            (client as WindowClient).focus();
            return (client as WindowClient).navigate(urlToOpen);
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
