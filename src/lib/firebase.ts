import { initializeApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Firebase configuration from environment variables
// All values come from Lovable Cloud secrets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that required Firebase config is present
const validateConfig = () => {
  const required = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
  const missing = required.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  if (missing.length > 0) {
    console.warn(`[VibeBaze] Missing Firebase config: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

let app: FirebaseApp | null = null;

// Initialize Firebase only if config is valid
if (validateConfig()) {
  app = initializeApp(firebaseConfig);
} else {
  console.error('[VibeBaze] Firebase not initialized - missing configuration');
}

// Messaging is only available in supported browsers
let messaging: ReturnType<typeof getMessaging> | null = null;

// Initialize messaging only if supported
export const initializeMessaging = async () => {
  try {
    if (!app) {
      console.error('[VibeBaze] Firebase app not initialized');
      return null;
    }
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      return messaging;
    }
    console.warn("Firebase Messaging is not supported in this browser");
    return null;
  } catch (error) {
    console.error("Error initializing Firebase Messaging:", error);
    return null;
  }
};

export const getMessagingInstance = () => messaging;

// Export Firebase config for service worker
export const getFirebaseConfig = () => firebaseConfig;

export { getToken, onMessage, app };
