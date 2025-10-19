/**
 * Encryption Status Indicator
 * 
 * Shows the encryption status of a chat in the header
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Lock, LockOpen, Shield } from 'lucide-react';
import { useEncryptionContext } from './EncryptionProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EncryptionStatusProps {
  chatId: string;
}

export function EncryptionStatus({ chatId }: EncryptionStatusProps) {
  const { hasEncryptionKey, isEncryptionReady } = useEncryptionContext();
  const [hasKey, setHasKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (chatId && isEncryptionReady) {
        setIsChecking(true);
        const keyExists = await hasEncryptionKey(chatId);
        setHasKey(keyExists);
        setIsChecking(false);
      }
    };

    checkKey();
  }, [chatId, hasEncryptionKey, isEncryptionReady]);

  if (isChecking || !isEncryptionReady) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            {hasKey ? (
              <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <LockOpen className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {hasKey
              ? '🔒 End-to-end encrypted'
              : 'Not encrypted'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Message Encryption Indicator
 * 
 * Shows a small lock icon next to encrypted messages
 */

interface MessageEncryptionIndicatorProps {
  isEncrypted: boolean;
}

export function MessageEncryptionIndicator({ isEncrypted }: MessageEncryptionIndicatorProps) {
  if (!isEncrypted) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Shield className="h-3 w-3 text-green-600 dark:text-green-400 inline-block ml-1" />
        </TooltipTrigger>
        <TooltipContent>
          <p>End-to-end encrypted</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
