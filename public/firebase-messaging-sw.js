// VibeBaze Firebase Messaging Service Worker
// Production Stable Version

importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

// 🔥 Hardcoded Firebase Config (Safe for frontend use)
firebase.initializeApp({
  apiKey: "AIzaSyBelWjvdwophP69GbZ9yHCWkPUfaZmrCFY",
  authDomain: "vibebaze-f08b2.firebaseapp.com",
  projectId: "vibebaze-f08b2",
  storageBucket: "vibebaze-f08b2.firebasestorage.app",
  messagingSenderId: "122281450366",
  appId: "1:122281450366:web:0158023505555e903fb12f",
  measurementId: "G-GDVVV4BY89"
});

const messaging = firebase.messaging();

console.log("[VibeBaze] Service Worker: Firebase initialized");

// 🔔 Handle Background Messages
messaging.onBackgroundMessage(function (payload) {
  console.log("[VibeBaze] Background message received:", payload);

  const notificationTitle = payload.notification?.title || "VibeBaze";

  const notificationOptions = {
    body: payload.notification?.body || "You have a new notification",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || "vibebaze-notification"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 👆 Handle Notification Click
self.addEventListener("notificationclick", function (event) {
  console.log("[VibeBaze] Notification clicked:", event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/feed";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
