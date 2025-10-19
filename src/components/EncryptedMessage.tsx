/**
 * Encrypted Message Wrapper
 * 
 * Wraps messages to handle automatic decryption
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useMessageEncryption } from '@/hooks/useMessageEncryption';
import { Loader2 } from 'lucide-react';

interface EncryptedMessageProps {
  content: string;
  chatId: string;
  isEncrypted?: boolean;
  encryptionIv?: string | null;
  children?: (decryptedContent: string) => React.ReactNode;
}

export function EncryptedMessage({
  content,
  chatId,
  isEncrypted = false,
  encryptionIv,
  children,
}: EncryptedMessageProps) {
  const { decryptAfterReceive } = useMessageEncryption();
  const [decryptedContent, setDecryptedContent] = useState<string>(content);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    const decrypt = async () => {
      if (isEncrypted && encryptionIv) {
        setIsDecrypting(true);
        const decrypted = await decryptAfterReceive(
          content,
          encryptionIv,
          chatId,
          isEncrypted
        );
        setDecryptedContent(decrypted);
        setIsDecrypting(false);
      } else {
        setDecryptedContent(content);
      }
    };

    decrypt();
  }, [content, chatId, isEncrypted, encryptionIv, decryptAfterReceive]);

  if (isDecrypting) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-sm">Decrypting...</span>
      </div>
    );
  }

  if (children) {
    return <>{children(decryptedContent)}</>;
  }

  return <>{decryptedContent}</>;
}
