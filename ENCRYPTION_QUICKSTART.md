# 🔐 End-to-End Encryption Quick Start

## What is End-to-End Encryption?

End-to-end encryption (E2E) means that your messages are encrypted on your device before being sent, and only decrypted on the recipient's device. The server never sees the unencrypted content of your messages.

## Features

✅ **Automatic Encryption** - Messages are automatically encrypted when sent
✅ **Zero-Knowledge Server** - Server cannot read your messages
✅ **Secure by Default** - All new messages are encrypted
✅ **Visual Indicators** - Lock icons show encryption status
✅ **No Setup Required** - Encryption is initialized automatically

## How to Use

### For Users

1. **Sign in** - Encryption is automatically set up when you sign in
2. **Send messages** - All new messages are encrypted automatically
3. **View encrypted messages** - Look for the 🔒 lock icon in the chat header
4. **No configuration needed** - Everything works automatically!

### For Developers

1. **Database Migration**:
   ```bash
   npm run db:push
   ```

2. **Add EncryptionProvider** to your app layout:
   ```tsx
   import { EncryptionProvider } from '@/components/EncryptionProvider';
   
   export default function Layout({ children }) {
     return (
       <EncryptionProvider>
         {children}
       </EncryptionProvider>
     );
   }
   ```

3. **Use encryption in components**:
   ```tsx
   import { EncryptedMessage } from '@/components/EncryptedMessage';
   
   <EncryptedMessage
     content={message.content}
     chatId={message.chatId}
     isEncrypted={message.isEncrypted}
     encryptionIv={message.encryptionIv}
   >
     {(decryptedContent) => <p>{decryptedContent}</p>}
   </EncryptedMessage>
   ```

## Status Indicators

- 🔒 **Green Lock** - Chat is end-to-end encrypted
- 🔓 **Gray Lock** - Chat is not encrypted
- 🛡️ **Shield Icon** - Individual encrypted message

## How It Works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Sender    │         │    Server    │         │  Recipient  │
│   Device    │         │ (Can't read) │         │   Device    │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │ 1. Encrypt message     │                        │
      │    with chat key       │                        │
      │─────────────────────────>                       │
      │                        │                        │
      │                 2. Store encrypted               │
      │                    (Base64 blob)                │
      │                        │                        │
      │                        │ 3. Broadcast           │
      │                        │    encrypted           │
      │                        │─────────────────────────>
      │                        │                        │
      │                        │                 4. Decrypt with
      │                        │                    chat key
      │                        │                        │
      │                        │                 5. Display
      │                        │                    plaintext
```

## Security

### What's Protected ✅

- Message content
- File attachments (coming soon)
- Only you and the recipient can read messages

### What's Not Protected ⚠️

- Metadata (who, when, how long)
- User profiles (names, avatars)
- Chat existence

## Common Questions

**Q: Can the server read my messages?**
A: No! Messages are encrypted on your device and the server only sees encrypted data.

**Q: What if I lose my device?**
A: Currently, keys are device-specific. You'll need to set up encryption again on a new device. Old messages from that device won't be accessible.

**Q: Can I disable encryption?**
A: Currently, encryption is enabled by default for all new messages. Old messages (sent before encryption was added) remain unencrypted.

**Q: Is this as secure as WhatsApp/Signal?**
A: This implementation uses similar encryption (AES-GCM), but doesn't include features like forward secrecy or key verification that those apps have.

## Technical Details

For detailed technical documentation, see [ENCRYPTION.md](./ENCRYPTION.md)

### Architecture

- **Encryption**: AES-GCM 256-bit
- **Key Exchange**: RSA-OAEP 2048-bit
- **Storage**: Browser IndexedDB
- **API**: Web Crypto API

### Database Schema

```sql
-- User public keys
CREATE TABLE user_encryption_keys (
  user_id TEXT UNIQUE,
  public_key TEXT NOT NULL
);

-- Message encryption
ALTER TABLE messages ADD COLUMN is_encrypted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN encryption_iv TEXT;

-- Chat encryption metadata
CREATE TABLE chat_encryption (
  chat_id UUID UNIQUE,
  is_encrypted BOOLEAN DEFAULT true
);
```

## Troubleshooting

### Messages show "[Encrypted message - key not available]"

**Solution**: The chat key is missing. This can happen if:
1. You're on a new device
2. The chat key wasn't properly shared
3. You need to rejoin the chat

### Encryption status shows unlocked icon

**Solution**: The chat may not have encryption set up yet. Send a message to initialize encryption.

### "Failed to decrypt message" error

**Solution**: Try:
1. Refresh the page
2. Check browser console for errors
3. Clear IndexedDB and re-initialize encryption

## Development

### Test Encryption

1. Open two browser windows (or use incognito)
2. Sign in as different users
3. Send messages between them
4. Check database to verify content is encrypted:

```sql
SELECT content, is_encrypted FROM messages LIMIT 5;
```

The `content` should be base64-encoded gibberish if encrypted.

## Support

For issues or questions:
1. Check [ENCRYPTION.md](./ENCRYPTION.md) for details
2. Open an issue on GitHub
3. Check browser console for error messages

---

**Last Updated**: 2025-10-19  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
