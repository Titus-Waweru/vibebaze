importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

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

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log("[firebase-messaging-sw.js] Received background message:", payload);
  
  const notificationTitle = payload.notification?.title || "VibeBaze";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new notification",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: payload.data?.tag || "vibebaze-notification",
    data: payload.data || {},
    actions: [
      { action: "open", title: "Open VibeBaze" }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", function(event) {
  console.log("[firebase-messaging-sw.js] Notification clicked:", event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || "/feed";
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({
            type: "NOTIFICATION_CLICKED",
            url: urlToOpen
          });
          return;
        }
      }
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
