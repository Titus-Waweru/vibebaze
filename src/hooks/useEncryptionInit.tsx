import { useEffect } from "react";
import { useEncryption } from "./useEncryption";

/**
 * Lightweight hook that initializes encryption keys on login.
 * This ensures every user has keys ready before anyone tries to message them.
 * Call this once in a top-level authenticated component.
 */
export const useEncryptionInit = (userId: string | undefined) => {
  const { isReady, error } = useEncryption(userId);

  useEffect(() => {
    if (isReady) {
      console.log("[Encryption] Keys initialized for user");
    }
    if (error) {
      console.warn("[Encryption] Key init failed:", error);
    }
  }, [isReady, error]);

  return { isReady };
};
