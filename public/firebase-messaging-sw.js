// VibeBaze Firebase Messaging Service Worker
// FCM V1 API - Receives config from main thread

importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

// Firebase will be initialized when config is received
let messaging = null;
let isInitialized = false;

// Initialize Firebase with provided config
function initializeFirebase(config) {
  if (isInitialized) return;
  
  try {
    firebase.initializeApp(config);
    messaging = firebase.messaging();
    isInitialized = true;
    console.log("[VibeBaze] Service Worker: Firebase initialized");
    
    // Set up background message handler after initialization
    setupBackgroundMessageHandler();
  } catch (error) {
    console.error("[VibeBaze] Service Worker: Failed to initialize Firebase", error);
  }
}

// Listen for config from main thread
self.addEventListener("message", function(event) {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    console.log("[VibeBaze] Service Worker: Received Firebase config");
    initializeFirebase(event.data.config);
  }
});

// Try to get config from cache on activation
self.addEventListener("activate", function(event) {
  console.log("[VibeBaze] Service Worker: Activated");
  // Claim clients immediately
  event.waitUntil(self.clients.claim());
});

// Setup background message handler
function setupBackgroundMessageHandler() {
  if (!messaging) return;
  
  messaging.onBackgroundMessage(function(payload) {
    console.log("[VibeBaze] Received background message:", payload);
    
    const notificationTitle = payload.notification?.title || "VibeBaze";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new notification",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: payload.data?.tag || "vibebaze-notification",
      data: payload.data || {},
      actions: [
        { action: "open", title: "Open VibeBaze" }
      ],
      vibrate: [200, 100, 200],
      requireInteraction: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification click
self.addEventListener("notificationclick", function(event) {
  console.log("[VibeBaze] Notification clicked:", event);
  
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

// Handle push events directly (for data-only messages)
self.addEventListener("push", function(event) {
  if (!event.data) return;
  
  try {
    const payload = event.data.json();
    console.log("[VibeBaze] Push event received:", payload);
    
    // If there's no notification field, this is a data-only message
    if (!payload.notification && payload.data) {
      const notificationOptions = {
        body: payload.data.body || "You have a new notification",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: payload.data.tag || "vibebaze-notification",
        data: payload.data,
        vibrate: [200, 100, 200]
      };
      
      event.waitUntil(
        self.registration.showNotification(
          payload.data.title || "VibeBaze",
          notificationOptions
        )
      );
    }
  } catch (e) {
    console.error("[VibeBaze] Error processing push event:", e);
  }
});
