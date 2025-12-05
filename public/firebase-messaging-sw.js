// Firebase Cloud Messaging Service Worker for VibeLoop
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration - must match the app's config
firebase.initializeApp({
  apiKey: "AIzaSyAGuVmPvFk2n17zEPtw2ps5HtpJf6oQ3yY",
  authDomain: "vibesphere-5e17c.firebaseapp.com",
  projectId: "vibesphere-5e17c",
  storageBucket: "vibesphere-5e17c.firebasestorage.app",
  messagingSenderId: "104538175724",
  appId: "1:104538175724:web:2240b5a37526966f468dc9",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'VibeLoop';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: false,
    tag: 'vibeloop-notification',
    renotify: true,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/notifications';
        return clients.openWindow(url);
      }
    })
  );
});

// Handle push events directly (fallback)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[firebase-messaging-sw.js] Push data:', data);
      
      // Firebase messaging handles notifications with 'notification' field
      // This fallback handles data-only messages
      if (!data.notification) {
        const notificationOptions = {
          body: data.body || data.data?.body || 'You have a new notification',
          icon: data.icon || '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [100, 50, 100],
          data: data.data || data || {},
        };
        event.waitUntil(
          self.registration.showNotification(data.title || data.data?.title || 'VibeLoop', notificationOptions)
        );
      }
    } catch (e) {
      console.error('[firebase-messaging-sw.js] Error parsing push data:', e);
    }
  }
});

// Log when service worker is activated
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
});

// Log when service worker is installed
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed');
  self.skipWaiting();
});
