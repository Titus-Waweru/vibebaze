import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPrivateKey,
  importPublicKey,
  generateSymmetricKey,
  encryptMessage,
  encryptSymmetricKey,
  decryptMessage,
  decryptSymmetricKey,
} from "@/lib/encryption";

interface EncryptionKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

const STORAGE_KEY_PREFIX = "vb_enc_";

export const useEncryption = (userId: string | undefined) => {
  const [keys, setKeys] = useState<EncryptionKeys | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    initializeKeys();
  }, [userId]);

  const initializeKeys = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Check if user has existing keys in the database
      const { data: existingKeys, error: fetchError } = await supabase
        .from("user_encryption_keys")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingKeys) {
        // Try to load the private key from localStorage first (fast path)
        const cachedPrivateKey = await loadCachedPrivateKey(userId);
        if (cachedPrivateKey) {
          const publicKey = await importPublicKey(existingKeys.public_key);
          setKeys({ publicKey, privateKey: cachedPrivateKey });
          return;
        }

        // Fallback: decrypt from database using deterministic password
        try {
          const password = await getDeterministicPassword(userId);
          const privateKey = await importPrivateKey(
            existingKeys.encrypted_private_key,
            password,
            existingKeys.key_salt
          );
          const publicKey = await importPublicKey(existingKeys.public_key);

          // Cache the private key locally for faster future loads
          await cachePrivateKey(userId, privateKey);

          setKeys({ publicKey, privateKey });
        } catch (decryptErr) {
          console.warn("Failed to decrypt existing keys, regenerating...", decryptErr);
          // Keys are corrupted or password changed — regenerate
          await regenerateKeys(userId);
        }
      } else {
        // No keys exist yet — generate fresh ones
        await regenerateKeys(userId);
      }
    } catch (err) {
      console.error("Error initializing encryption keys:", err);
      setError("Failed to initialize encryption");
    } finally {
      setLoading(false);
    }
  };

  const regenerateKeys = async (uid: string) => {
    const keyPair = await generateKeyPair();
    const publicKeyStr = await exportPublicKey(keyPair.publicKey);
    const password = await getDeterministicPassword(uid);
    const { encryptedPrivateKey, salt } = await exportPrivateKey(
      keyPair.privateKey,
      password
    );

    // Upsert keys in database (handles both insert and update)
    const { error: upsertError } = await supabase
      .from("user_encryption_keys")
      .upsert(
        {
          user_id: uid,
          public_key: publicKeyStr,
          encrypted_private_key: encryptedPrivateKey,
          key_salt: salt,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) throw upsertError;

    // Cache locally
    await cachePrivateKey(uid, keyPair.privateKey);

    setKeys({
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    });
  };

  // Deterministic password derived from user ID (no session dependency)
  const getDeterministicPassword = async (uid: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(`vibebaze-e2e-${uid}`);
    const hash = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Cache private key in IndexedDB-backed localStorage
  const cachePrivateKey = async (uid: string, key: CryptoKey) => {
    try {
      const exported = await window.crypto.subtle.exportKey("jwk", key);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(exported));
    } catch {
      // Non-critical — will re-decrypt from DB next time
    }
  };

  const loadCachedPrivateKey = async (uid: string): Promise<CryptoKey | null> => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
      if (!stored) return null;
      const jwk = JSON.parse(stored);
      return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
      );
    } catch {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${uid}`);
      return null;
    }
  };

  const encryptForRecipient = useCallback(
    async (
      message: string,
      recipientPublicKey: string
    ): Promise<{
      encryptedContent: string;
      encryptedKeyForSender: string;
      encryptedKeyForReceiver: string;
      nonce: string;
    } | null> => {
      if (!keys) return null;

      try {
        const symmetricKey = await generateSymmetricKey();
        const { encrypted, nonce } = await encryptMessage(message, symmetricKey);

        const recipientKey = await importPublicKey(recipientPublicKey);
        const encryptedKeyForReceiver = await encryptSymmetricKey(symmetricKey, recipientKey);
        const encryptedKeyForSender = await encryptSymmetricKey(symmetricKey, keys.publicKey);

        return { encryptedContent: encrypted, encryptedKeyForSender, encryptedKeyForReceiver, nonce };
      } catch (err) {
        console.error("Error encrypting message:", err);
        return null;
      }
    },
    [keys]
  );

  const decryptReceivedMessage = useCallback(
    async (
      encryptedContent: string,
      encryptedKey: string,
      nonce: string
    ): Promise<string | null> => {
      if (!keys) return null;

      try {
        const symmetricKey = await decryptSymmetricKey(encryptedKey, keys.privateKey);
        return await decryptMessage(encryptedContent, nonce, symmetricKey);
      } catch (err) {
        console.error("Error decrypting message:", err);
        return null;
      }
    },
    [keys]
  );

  const getRecipientPublicKey = async (recipientId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("user_encryption_keys")
      .select("public_key")
      .eq("user_id", recipientId)
      .maybeSingle();

    if (error || !data) return null;
    return data.public_key;
  };

  return {
    keys,
    loading,
    error,
    encryptForRecipient,
    decryptReceivedMessage,
    getRecipientPublicKey,
    isReady: !!keys && !loading,
  };
};
