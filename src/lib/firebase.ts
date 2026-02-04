import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBelWjvdwophP69GbZ9yHCWkPUfaZmrCFY",
  authDomain: "vibebaze-f08b2.firebaseapp.com",
  projectId: "vibebaze-f08b2",
  storageBucket: "vibebaze-f08b2.firebasestorage.app",
  messagingSenderId: "122281450366",
  appId: "1:122281450366:web:0158023505555e903fb12f",
  measurementId: "G-GDVVV4BY89"
};

const app = initializeApp(firebaseConfig);

// Messaging is only available in supported browsers
let messaging: ReturnType<typeof getMessaging> | null = null;

// Initialize messaging only if supported
export const initializeMessaging = async () => {
  try {
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

export { getToken, onMessage };
