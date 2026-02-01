/**
 * VibeBaze E2E Encryption Module
 * Provides end-to-end encryption for secure messaging
 */

// Generate a key pair for the user
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export public key to base64 string
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

// Export private key to base64 string (encrypted with user's password)
export async function exportPrivateKey(
  key: CryptoKey,
  password: string
): Promise<{ encryptedPrivateKey: string; salt: string }> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKeyFromPassword(password, salt);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    derivedKey,
    exported
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return {
    encryptedPrivateKey: arrayBufferToBase64(combined.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
  };
}

// Import public key from base64 string
export async function importPublicKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyData);
  return await window.crypto.subtle.importKey(
    "spki",
    keyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

// Import private key from encrypted base64 string
export async function importPrivateKey(
  encryptedKeyData: string,
  password: string,
  salt: string
): Promise<CryptoKey> {
  const combined = base64ToArrayBuffer(encryptedKeyData);
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const saltBuffer = base64ToArrayBuffer(salt);
  const derivedKey = await deriveKeyFromPassword(password, new Uint8Array(saltBuffer));
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) as BufferSource },
    derivedKey,
    encrypted
  );
  
  return await window.crypto.subtle.importKey(
    "pkcs8",
    decrypted,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

// Derive encryption key from password
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Generate a symmetric key for message encryption
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt message with symmetric key
export async function encryptMessage(
  message: string,
  symmetricKey: CryptoKey
): Promise<{ encrypted: string; nonce: string }> {
  const encoder = new TextEncoder();
  const nonceArray = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceArray as BufferSource },
    symmetricKey,
    encoder.encode(message)
  );
  
  return {
    encrypted: arrayBufferToBase64(encrypted),
    nonce: arrayBufferToBase64(nonceArray.buffer as ArrayBuffer),
  };
}

// Decrypt message with symmetric key
export async function decryptMessage(
  encryptedData: string,
  nonce: string,
  symmetricKey: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  const encrypted = base64ToArrayBuffer(encryptedData);
  const nonceBuffer = base64ToArrayBuffer(nonce);
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBuffer) as BufferSource },
    symmetricKey,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

// Encrypt symmetric key with recipient's public key
export async function encryptSymmetricKey(
  symmetricKey: CryptoKey,
  publicKey: CryptoKey
): Promise<string> {
  const exportedKey = await window.crypto.subtle.exportKey("raw", symmetricKey);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    exportedKey
  );
  return arrayBufferToBase64(encrypted);
}

// Decrypt symmetric key with private key
export async function decryptSymmetricKey(
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encrypted = base64ToArrayBuffer(encryptedKey);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encrypted
  );
  
  return await window.crypto.subtle.importKey(
    "raw",
    decrypted,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}
