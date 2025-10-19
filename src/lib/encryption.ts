/**
 * End-to-End Encryption Utilities
 * 
 * This module provides secure encryption/decryption functionality for messages
 * using the Web Crypto API (AES-GCM for symmetric encryption, RSA-OAEP for key exchange)
 */

// Encryption algorithm configuration
const SYMMETRIC_ALGORITHM = 'AES-GCM';
const SYMMETRIC_KEY_LENGTH = 256;
const ASYMMETRIC_ALGORITHM = 'RSA-OAEP';
const ASYMMETRIC_KEY_LENGTH = 2048;
const HASH_ALGORITHM = 'SHA-256';

// Type definitions
export interface EncryptedData {
  encryptedContent: string; // Base64 encoded
  iv: string; // Base64 encoded initialization vector
  algorithm: string;
}

export interface KeyPair {
  publicKey: string; // Base64 encoded public key
  privateKey: string; // Base64 encoded private key
}

export interface ChatKey {
  key: string; // Base64 encoded symmetric key
  chatId: string;
}

/**
 * Generate a new RSA key pair for a user
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: ASYMMETRIC_ALGORITHM,
      modulusLength: ASYMMETRIC_KEY_LENGTH,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: HASH_ALGORITHM,
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKey),
    privateKey: arrayBufferToBase64(privateKey),
  };
}

/**
 * Generate a symmetric key for encrypting chat messages
 */
export async function generateChatKey(): Promise<string> {
  const key = await window.crypto.subtle.generateKey(
    {
      name: SYMMETRIC_ALGORITHM,
      length: SYMMETRIC_KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exportedKey);
}

/**
 * Encrypt a message using a symmetric key
 */
export async function encryptMessage(
  message: string,
  chatKeyBase64: string
): Promise<EncryptedData> {
  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Import the key
  const keyData = base64ToArrayBuffer(chatKeyBase64);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: SYMMETRIC_ALGORITHM },
    false,
    ['encrypt']
  );

  // Encrypt the message
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: SYMMETRIC_ALGORITHM,
      iv: iv,
    },
    key,
    encodedMessage
  );

  return {
    encryptedContent: arrayBufferToBase64(encryptedContent),
    iv: arrayBufferToBase64(iv),
    algorithm: SYMMETRIC_ALGORITHM,
  };
}

/**
 * Decrypt a message using a symmetric key
 */
export async function decryptMessage(
  encryptedData: EncryptedData,
  chatKeyBase64: string
): Promise<string> {
  // Import the key
  const keyData = base64ToArrayBuffer(chatKeyBase64);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: SYMMETRIC_ALGORITHM },
    false,
    ['decrypt']
  );

  // Decrypt the message
  const encryptedContent = base64ToArrayBuffer(encryptedData.encryptedContent);
  const iv = base64ToArrayBuffer(encryptedData.iv);
  
  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: SYMMETRIC_ALGORITHM,
      iv: iv,
    },
    key,
    encryptedContent
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedContent);
}

/**
 * Encrypt a file/image using a symmetric key
 */
export async function encryptFile(
  file: ArrayBuffer,
  chatKeyBase64: string
): Promise<EncryptedData> {
  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Import the key
  const keyData = base64ToArrayBuffer(chatKeyBase64);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: SYMMETRIC_ALGORITHM },
    false,
    ['encrypt']
  );

  // Encrypt the file
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: SYMMETRIC_ALGORITHM,
      iv: iv,
    },
    key,
    file
  );

  return {
    encryptedContent: arrayBufferToBase64(encryptedContent),
    iv: arrayBufferToBase64(iv),
    algorithm: SYMMETRIC_ALGORITHM,
  };
}

/**
 * Decrypt a file/image using a symmetric key
 */
export async function decryptFile(
  encryptedData: EncryptedData,
  chatKeyBase64: string
): Promise<ArrayBuffer> {
  // Import the key
  const keyData = base64ToArrayBuffer(chatKeyBase64);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: SYMMETRIC_ALGORITHM },
    false,
    ['decrypt']
  );

  // Decrypt the file
  const encryptedContent = base64ToArrayBuffer(encryptedData.encryptedContent);
  const iv = base64ToArrayBuffer(encryptedData.iv);
  
  return await window.crypto.subtle.decrypt(
    {
      name: SYMMETRIC_ALGORITHM,
      iv: iv,
    },
    key,
    encryptedContent
  );
}

/**
 * Encrypt a chat key with a user's public key (for key exchange)
 */
export async function encryptChatKey(
  chatKeyBase64: string,
  publicKeyBase64: string
): Promise<string> {
  // Import the public key
  const publicKeyData = base64ToArrayBuffer(publicKeyBase64);
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    publicKeyData,
    {
      name: ASYMMETRIC_ALGORITHM,
      hash: HASH_ALGORITHM,
    },
    false,
    ['encrypt']
  );

  // Encrypt the chat key
  const chatKeyData = base64ToArrayBuffer(chatKeyBase64);
  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: ASYMMETRIC_ALGORITHM,
    },
    publicKey,
    chatKeyData
  );

  return arrayBufferToBase64(encryptedKey);
}

/**
 * Decrypt a chat key with user's private key
 */
export async function decryptChatKey(
  encryptedKeyBase64: string,
  privateKeyBase64: string
): Promise<string> {
  // Import the private key
  const privateKeyData = base64ToArrayBuffer(privateKeyBase64);
  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    privateKeyData,
    {
      name: ASYMMETRIC_ALGORITHM,
      hash: HASH_ALGORITHM,
    },
    false,
    ['decrypt']
  );

  // Decrypt the chat key
  const encryptedKeyData = base64ToArrayBuffer(encryptedKeyBase64);
  const decryptedKey = await window.crypto.subtle.decrypt(
    {
      name: ASYMMETRIC_ALGORITHM,
    },
    privateKey,
    encryptedKeyData
  );

  return arrayBufferToBase64(decryptedKey);
}

/**
 * Helper: Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash a string using SHA-256 (useful for key derivation)
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hashBuffer);
}
