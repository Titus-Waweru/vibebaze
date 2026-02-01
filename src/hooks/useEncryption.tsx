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

export const useEncryption = (userId: string | undefined) => {
  const [keys, setKeys] = useState<EncryptionKeys | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize or load encryption keys
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

      // Check if user has existing keys
      const { data: existingKeys, error: fetchError } = await supabase
        .from("user_encryption_keys")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingKeys) {
        // Load existing keys (use a derived password from session)
        const sessionPassword = await getSessionPassword(userId);
        const privateKey = await importPrivateKey(
          existingKeys.encrypted_private_key,
          sessionPassword,
          existingKeys.key_salt
        );
        const publicKey = await importPublicKey(existingKeys.public_key);
        setKeys({ publicKey, privateKey });
      } else {
        // Generate new key pair
        const keyPair = await generateKeyPair();
        const publicKeyStr = await exportPublicKey(keyPair.publicKey);
        const sessionPassword = await getSessionPassword(userId);
        const { encryptedPrivateKey, salt } = await exportPrivateKey(
          keyPair.privateKey,
          sessionPassword
        );

        // Store keys in database
        const { error: insertError } = await supabase
          .from("user_encryption_keys")
          .insert({
            user_id: userId,
            public_key: publicKeyStr,
            encrypted_private_key: encryptedPrivateKey,
            key_salt: salt,
          });

        if (insertError) throw insertError;

        setKeys({
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey,
        });
      }
    } catch (err) {
      console.error("Error initializing encryption keys:", err);
      setError("Failed to initialize encryption");
    } finally {
      setLoading(false);
    }
  };

  // Get session-based password for key encryption
  const getSessionPassword = async (userId: string): Promise<string> => {
    // Use a combination of user ID and session data
    const { data } = await supabase.auth.getSession();
    const sessionToken = data?.session?.access_token || "";
    return `${userId}-${sessionToken.slice(0, 32)}`;
  };

  // Encrypt a message for a recipient
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
        // Generate a symmetric key for this message
        const symmetricKey = await generateSymmetricKey();

        // Encrypt the message with the symmetric key
        const { encrypted, nonce } = await encryptMessage(message, symmetricKey);

        // Encrypt the symmetric key for both sender and recipient
        const recipientKey = await importPublicKey(recipientPublicKey);
        const encryptedKeyForReceiver = await encryptSymmetricKey(
          symmetricKey,
          recipientKey
        );
        const encryptedKeyForSender = await encryptSymmetricKey(
          symmetricKey,
          keys.publicKey
        );

        return {
          encryptedContent: encrypted,
          encryptedKeyForSender,
          encryptedKeyForReceiver,
          nonce,
        };
      } catch (err) {
        console.error("Error encrypting message:", err);
        return null;
      }
    },
    [keys]
  );

  // Decrypt a message using the sender's or receiver's encrypted key
  const decryptReceivedMessage = useCallback(
    async (
      encryptedContent: string,
      encryptedKey: string,
      nonce: string
    ): Promise<string | null> => {
      if (!keys) return null;

      try {
        // Decrypt the symmetric key with our private key
        const symmetricKey = await decryptSymmetricKey(
          encryptedKey,
          keys.privateKey
        );

        // Decrypt the message
        const decrypted = await decryptMessage(
          encryptedContent,
          nonce,
          symmetricKey
        );

        return decrypted;
      } catch (err) {
        console.error("Error decrypting message:", err);
        return null;
      }
    },
    [keys]
  );

  // Get recipient's public key
  const getRecipientPublicKey = async (
    recipientId: string
  ): Promise<string | null> => {
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
