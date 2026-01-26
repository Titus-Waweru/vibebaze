/**
 * Firebase Cloud Messaging Service Worker for VibeLoop
 * 
 * SECURITY NOTE:
 * This service worker contains ONLY public Firebase configuration values.
 * These are CLIENT-SIDE publishable keys, NOT secrets.
 * - API Key: Publishable key for client identification (not a secret)
 * - Project ID: Public project identifier
 * - Messaging Sender ID: Public identifier for Cloud Messaging
 * 
 * Private credentials (FCM_PRIVATE_KEY, FCM_CLIENT_EMAIL) are stored
 * securely in backend environment secrets and used ONLY in edge functions.
 * 
 * To update these values:
 * 1. Go to Firebase Console > Project Settings > General
 * 2. Copy the values from "Your apps" > Web app configuration
 * 3. Update the corresponding VITE_FIREBASE_* environment variables
 * 4. Update this file to match
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// PUBLIC Firebase configuration - these are publishable keys (not secrets)
// These values must match the VITE_FIREBASE_* environment variables
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

// Handle push events directly - ALWAYS show notification
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] Push data:', JSON.stringify(payload));
      
      // Extract notification data from various possible locations
      const data = payload.data || payload;
      const title = data.title || payload.notification?.title || 'VibeLoop';
      const body = data.body || payload.notification?.body || 'You have a new notification';
      const icon = data.icon || payload.notification?.icon || '/pwa-192x192.png';
      
      const notificationOptions = {
        body: body,
        icon: icon,
        badge: data.badge || '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        data: data,
        tag: 'vibeloop-' + Date.now(),
        renotify: true,
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };
      
      console.log('[firebase-messaging-sw.js] Showing notification:', title, notificationOptions);
      
      event.waitUntil(
        self.registration.showNotification(title, notificationOptions)
      );
    } catch (e) {
      console.error('[firebase-messaging-sw.js] Error parsing push data:', e);
      // Fallback notification
      event.waitUntil(
        self.registration.showNotification('VibeLoop', {
          body: 'You have a new notification',
          icon: '/pwa-192x192.png',
        })
      );
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
