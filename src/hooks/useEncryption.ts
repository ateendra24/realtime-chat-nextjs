/**
 * useEncryption Hook
 * 
 * React hook for managing end-to-end encryption in the chat application
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  generateKeyPair,
  generateChatKey,
  encryptMessage,
  decryptMessage,
  encryptChatKey,
  decryptChatKey,
  EncryptedData,
} from '@/lib/encryption';
import {
  storeUserKeys,
  getUserKeys,
  storeChatKey,
  getChatKey,
  hasUserKeys,
  hasChatKey,
} from '@/lib/keyManager';

export interface UseEncryptionReturn {
  isEncryptionReady: boolean;
  isInitializing: boolean;
  initializeEncryption: () => Promise<void>;
  encryptMessageContent: (message: string, chatId: string) => Promise<EncryptedData | null>;
  decryptMessageContent: (encryptedData: EncryptedData, chatId: string) => Promise<string | null>;
  setupChatEncryption: (chatId: string) => Promise<void>;
  exchangeChatKey: (chatId: string, recipientPublicKey: string) => Promise<string | null>;
  receiveChatKey: (chatId: string, encryptedKey: string) => Promise<void>;
  hasEncryptionKey: (chatId: string) => Promise<boolean>;
  error: string | null;
}

export function useEncryption(): UseEncryptionReturn {
  const { user } = useUser();
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize encryption for the current user
   * Generates and stores keypair if not already present
   */
  const initializeEncryption = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Check if user already has keys
      const existingKeys = await hasUserKeys(user.id);
      
      if (!existingKeys) {
        console.log('Generating new encryption keys for user...');
        const keyPair = await generateKeyPair();
        await storeUserKeys(user.id, keyPair);
        
        // Store public key on server for key exchange
        await fetch('/api/encryption/public-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: keyPair.publicKey }),
        });
        
        console.log('Encryption keys generated and stored');
      } else {
        console.log('Encryption keys already exist');
      }

      setIsEncryptionReady(true);
    } catch (err) {
      console.error('Error initializing encryption:', err);
      setError('Failed to initialize encryption');
      setIsEncryptionReady(false);
    } finally {
      setIsInitializing(false);
    }
  }, [user?.id]);

  /**
   * Initialize encryption on mount if user is authenticated
   */
  useEffect(() => {
    if (user?.id && !isEncryptionReady && !isInitializing) {
      initializeEncryption();
    }
  }, [user?.id, isEncryptionReady, isInitializing, initializeEncryption]);

  /**
   * Setup encryption for a new chat
   * Generates and stores a symmetric key for the chat
   */
  const setupChatEncryption = useCallback(async (chatId: string) => {
    try {
      const existingKey = await hasChatKey(chatId);
      
      if (!existingKey) {
        console.log('Generating chat encryption key for:', chatId);
        const chatKey = await generateChatKey();
        await storeChatKey(chatId, chatKey);
        console.log('Chat encryption key generated and stored');
      }
    } catch (err) {
      console.error('Error setting up chat encryption:', err);
      setError('Failed to setup chat encryption');
    }
  }, []);

  /**
   * Encrypt a message for a specific chat
   */
  const encryptMessageContent = useCallback(async (
    message: string,
    chatId: string
  ): Promise<EncryptedData | null> => {
    try {
      const chatKey = await getChatKey(chatId);
      
      if (!chatKey) {
        console.warn('No encryption key found for chat:', chatId);
        return null;
      }

      return await encryptMessage(message, chatKey);
    } catch (err) {
      console.error('Error encrypting message:', err);
      setError('Failed to encrypt message');
      return null;
    }
  }, []);

  /**
   * Decrypt a message from a specific chat
   */
  const decryptMessageContent = useCallback(async (
    encryptedData: EncryptedData,
    chatId: string
  ): Promise<string | null> => {
    try {
      const chatKey = await getChatKey(chatId);
      
      if (!chatKey) {
        console.warn('No encryption key found for chat:', chatId);
        return null;
      }

      return await decryptMessage(encryptedData, chatKey);
    } catch (err) {
      console.error('Error decrypting message:', err);
      setError('Failed to decrypt message');
      return null;
    }
  }, []);

  /**
   * Exchange chat key with another user
   * Encrypts the chat key with recipient's public key
   */
  const exchangeChatKey = useCallback(async (
    chatId: string,
    recipientPublicKey: string
  ): Promise<string | null> => {
    try {
      const chatKey = await getChatKey(chatId);
      
      if (!chatKey) {
        console.warn('No chat key found to exchange');
        return null;
      }

      return await encryptChatKey(chatKey, recipientPublicKey);
    } catch (err) {
      console.error('Error exchanging chat key:', err);
      setError('Failed to exchange chat key');
      return null;
    }
  }, []);

  /**
   * Receive and decrypt a chat key from another user
   */
  const receiveChatKey = useCallback(async (
    chatId: string,
    encryptedKey: string
  ): Promise<void> => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      const userKeys = await getUserKeys(user.id);
      
      if (!userKeys) {
        console.error('User keys not found');
        setError('Encryption keys not found');
        return;
      }

      const decryptedKey = await decryptChatKey(encryptedKey, userKeys.privateKey);
      await storeChatKey(chatId, decryptedKey);
      console.log('Chat key received and stored');
    } catch (err) {
      console.error('Error receiving chat key:', err);
      setError('Failed to receive chat key');
    }
  }, [user?.id]);

  /**
   * Check if encryption key exists for a chat
   */
  const hasEncryptionKey = useCallback(async (chatId: string): Promise<boolean> => {
    return await hasChatKey(chatId);
  }, []);

  return {
    isEncryptionReady,
    isInitializing,
    initializeEncryption,
    encryptMessageContent,
    decryptMessageContent,
    setupChatEncryption,
    exchangeChatKey,
    receiveChatKey,
    hasEncryptionKey,
    error,
  };
}
