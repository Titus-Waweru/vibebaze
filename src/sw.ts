/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;
declare function importScripts(...urls: string[]): void;

// Workbox precache
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
  const options: NotificationOptions & { data?: Record<string, string>; vibrate?: number[] } = {
    body: payload.notification?.body || "You have a new notification",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || "vibebaze-notification",
  };

  self.registration.showNotification(title, options);
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
