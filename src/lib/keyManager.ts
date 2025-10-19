/**
 * Key Manager
 * 
 * Manages encryption keys in browser storage (IndexedDB)
 * Provides secure storage and retrieval of user keypairs and chat keys
 */

import { KeyPair, ChatKey } from './encryption';

const DB_NAME = 'ChatEncryptionDB';
const DB_VERSION = 1;
const USER_KEYS_STORE = 'userKeys';
const CHAT_KEYS_STORE = 'chatKeys';

/**
 * Initialize IndexedDB for key storage
 */
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create user keys store (for user's own keypair)
      if (!db.objectStoreNames.contains(USER_KEYS_STORE)) {
        db.createObjectStore(USER_KEYS_STORE, { keyPath: 'userId' });
      }

      // Create chat keys store (for symmetric chat keys)
      if (!db.objectStoreNames.contains(CHAT_KEYS_STORE)) {
        db.createObjectStore(CHAT_KEYS_STORE, { keyPath: 'chatId' });
      }
    };
  });
}

/**
 * Store user's keypair
 */
export async function storeUserKeys(userId: string, keyPair: KeyPair): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([USER_KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(USER_KEYS_STORE);
    const request = store.put({ userId, ...keyPair });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Retrieve user's keypair
 */
export async function getUserKeys(userId: string): Promise<KeyPair | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([USER_KEYS_STORE], 'readonly');
    const store = transaction.objectStore(USER_KEYS_STORE);
    const request = store.get(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        resolve({ publicKey: result.publicKey, privateKey: result.privateKey });
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Store a chat's symmetric key
 */
export async function storeChatKey(chatId: string, key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHAT_KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(CHAT_KEYS_STORE);
    const request = store.put({ chatId, key });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Retrieve a chat's symmetric key
 */
export async function getChatKey(chatId: string): Promise<string | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHAT_KEYS_STORE], 'readonly');
    const store = transaction.objectStore(CHAT_KEYS_STORE);
    const request = store.get(chatId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.key : null);
    };
  });
}

/**
 * Delete a chat's key (when leaving a chat)
 */
export async function deleteChatKey(chatId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHAT_KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(CHAT_KEYS_STORE);
    const request = store.delete(chatId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all stored chat keys
 */
export async function getAllChatKeys(): Promise<ChatKey[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHAT_KEYS_STORE], 'readonly');
    const store = transaction.objectStore(CHAT_KEYS_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear all encryption keys (for logout or security reset)
 */
export async function clearAllKeys(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([USER_KEYS_STORE, CHAT_KEYS_STORE], 'readwrite');
    
    const userKeysStore = transaction.objectStore(USER_KEYS_STORE);
    const chatKeysStore = transaction.objectStore(CHAT_KEYS_STORE);
    
    const clearUserKeys = userKeysStore.clear();
    const clearChatKeys = chatKeysStore.clear();

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

/**
 * Check if user has keys stored
 */
export async function hasUserKeys(userId: string): Promise<boolean> {
  const keys = await getUserKeys(userId);
  return keys !== null;
}

/**
 * Check if chat has a key stored
 */
export async function hasChatKey(chatId: string): Promise<boolean> {
  const key = await getChatKey(chatId);
  return key !== null;
}
