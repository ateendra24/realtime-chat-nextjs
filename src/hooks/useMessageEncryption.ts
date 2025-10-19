/**
 * useMessageEncryption Hook
 * 
 * Helper hook to handle message encryption/decryption with proper error handling
 */

import { useCallback } from 'react';
import { useEncryptionContext } from '@/components/EncryptionProvider';
import { EncryptedData } from '@/lib/encryption';
import { toast } from 'sonner';

export function useMessageEncryption() {
  const {
    encryptMessageContent,
    decryptMessageContent,
    setupChatEncryption,
    hasEncryptionKey,
    isEncryptionReady,
  } = useEncryptionContext();

  /**
   * Encrypt a message before sending
   * Returns the encrypted content and IV, or null if encryption fails
   */
  const encryptBeforeSend = useCallback(async (
    content: string,
    chatId: string
  ): Promise<{ encryptedContent: string; iv: string } | null> => {
    try {
      // Check if encryption is ready
      if (!isEncryptionReady) {
        console.log('Encryption not ready, sending unencrypted');
        return null;
      }

      // Check if chat has encryption key
      const hasKey = await hasEncryptionKey(chatId);
      
      if (!hasKey) {
        // Setup encryption for this chat
        console.log('Setting up encryption for chat:', chatId);
        await setupChatEncryption(chatId);
      }

      // Encrypt the message
      const encrypted = await encryptMessageContent(content, chatId);
      
      if (!encrypted) {
        console.warn('Failed to encrypt message, sending unencrypted');
        return null;
      }

      return {
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      toast.error('Failed to encrypt message');
      return null;
    }
  }, [encryptMessageContent, setupChatEncryption, hasEncryptionKey, isEncryptionReady]);

  /**
   * Decrypt a message after receiving
   * Returns the decrypted content, or the original encrypted content if decryption fails
   */
  const decryptAfterReceive = useCallback(async (
    encryptedContent: string,
    iv: string,
    chatId: string,
    isEncrypted: boolean
  ): Promise<string> => {
    // If not encrypted, return as is
    if (!isEncrypted || !iv) {
      return encryptedContent;
    }

    try {
      // Check if encryption is ready
      if (!isEncryptionReady) {
        console.log('Encryption not ready, showing encrypted content');
        return '[Encrypted message - encryption not initialized]';
      }

      // Check if we have the key
      const hasKey = await hasEncryptionKey(chatId);
      
      if (!hasKey) {
        console.warn('No encryption key for chat:', chatId);
        return '[Encrypted message - key not available]';
      }

      // Decrypt the message
      const encryptedData: EncryptedData = {
        encryptedContent,
        iv,
        algorithm: 'AES-GCM',
      };

      const decrypted = await decryptMessageContent(encryptedData, chatId);
      
      if (!decrypted) {
        console.warn('Failed to decrypt message');
        return '[Failed to decrypt message]';
      }

      return decrypted;
    } catch (error) {
      console.error('Error decrypting message:', error);
      return '[Error decrypting message]';
    }
  }, [decryptMessageContent, hasEncryptionKey, isEncryptionReady]);

  return {
    encryptBeforeSend,
    decryptAfterReceive,
    isEncryptionReady,
  };
}
