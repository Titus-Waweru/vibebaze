import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

// Firebase configuration - these are publishable keys
// To get these values:
// 1. Go to Firebase Console (https://console.firebase.google.com)
// 2. Create a new project or select existing
// 3. Go to Project Settings > General > Your apps > Web app
// 4. Copy the firebaseConfig values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app: ReturnType<typeof initializeApp> | null = null;
let messaging: Messaging | null = null;

export const initializeFirebase = () => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("Firebase config not set. Push notifications will not work.");
    return null;
  }

  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
    }
    if (!messaging && typeof window !== "undefined" && "Notification" in window) {
      messaging = getMessaging(app);
    }
    return messaging;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return null;
  }
};

export const requestFCMToken = async (vapidKey: string): Promise<string | null> => {
  const messagingInstance = initializeFirebase();
  if (!messagingInstance) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    // Get the service worker registration
    const swRegistration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    
    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

export const onFCMMessage = (callback: (payload: any) => void) => {
  const messagingInstance = initializeFirebase();
  if (!messagingInstance) return () => {};

  return onMessage(messagingInstance, (payload) => {
    console.log("Foreground message received:", payload);
    callback(payload);
  });
};

export { messaging };
