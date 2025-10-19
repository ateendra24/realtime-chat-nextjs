/**
 * Encryption Context Provider
 * 
 * Provides encryption state and functions to the entire application
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useEncryption, UseEncryptionReturn } from '@/hooks/useEncryption';

const EncryptionContext = createContext<UseEncryptionReturn | undefined>(undefined);

interface EncryptionProviderProps {
  children: ReactNode;
}

export function EncryptionProvider({ children }: EncryptionProviderProps) {
  const encryption = useEncryption();

  return (
    <EncryptionContext.Provider value={encryption}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryptionContext() {
  const context = useContext(EncryptionContext);
  if (context === undefined) {
    throw new Error('useEncryptionContext must be used within an EncryptionProvider');
  }
  return context;
}
