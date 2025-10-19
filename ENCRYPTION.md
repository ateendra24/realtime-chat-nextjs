# End-to-End Encryption (E2E) Documentation

## Overview

This application now supports **end-to-end encryption (E2E)** for all chat messages. This means that messages are encrypted on the sender's device before being sent to the server, and only decrypted on the recipient's device. The server never has access to unencrypted message content.

## Architecture

### Encryption Algorithm

- **Symmetric Encryption**: AES-GCM with 256-bit keys for message content
- **Asymmetric Encryption**: RSA-OAEP with 2048-bit keys for key exchange
- **Hash Algorithm**: SHA-256 for key derivation

### Key Management

1. **User Keypair**: Each user has an RSA keypair (public/private)
   - Generated when user first accesses the app
   - Private key stored securely in browser's IndexedDB
   - Public key stored on server for key exchange

2. **Chat Keys**: Each chat has a symmetric AES key
   - Generated when the first message is sent
   - Stored in browser's IndexedDB
   - Never sent to the server in unencrypted form

3. **Key Exchange**:
   - When starting a new chat, the initiator generates a chat key
   - The chat key is encrypted with each participant's public key
   - Each participant decrypts the chat key with their private key
   - For group chats, keys are exchanged with all participants

### Data Flow

#### Sending a Message

```
1. User types message
2. Message is encrypted with chat's symmetric key
3. Encrypted message + IV sent to server
4. Server stores encrypted message
5. Server broadcasts encrypted message via Pusher
6. Recipients receive and decrypt message
```

#### Receiving a Message

```
1. Encrypted message received from Pusher
2. Message fetched from server (if needed)
3. Client looks up chat key in IndexedDB
4. Message decrypted using chat key and IV
5. Decrypted message displayed to user
```

## Database Schema

### New Tables

#### `user_encryption_keys`
Stores users' public keys for key exchange.

```sql
CREATE TABLE user_encryption_keys (
  id UUID PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id),
  public_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `chat_encryption`
Tracks encryption status for chats.

```sql
CREATE TABLE chat_encryption (
  id UUID PRIMARY KEY,
  chat_id UUID UNIQUE REFERENCES chats(id),
  is_encrypted BOOLEAN DEFAULT true,
  encryption_enabled BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Updated Tables

#### `messages`
Added fields for encrypted content:

```sql
ALTER TABLE messages ADD COLUMN is_encrypted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN encryption_iv TEXT;
```

## API Endpoints

### `/api/encryption/public-key`

**GET**: Retrieve a user's public key
- Query params: `userId` (string)
- Returns: `{ publicKey: string }`

**POST**: Store/update user's public key
- Body: `{ publicKey: string }`
- Returns: `{ success: boolean }`

### `/api/encryption/exchange-key`

**GET**: Get public keys for all participants in a chat
- Query params: `chatId` (string)
- Returns: `{ publicKeys: { [userId]: publicKey } }`

**POST**: Exchange encrypted chat keys
- Body: `{ chatId: string, encryptedKeys: { [userId]: encryptedKey } }`
- Returns: `{ success: boolean }`

## Client-Side Libraries

### `src/lib/encryption.ts`
Core encryption utilities using Web Crypto API:
- `generateKeyPair()` - Generate RSA keypair
- `generateChatKey()` - Generate AES chat key
- `encryptMessage()` - Encrypt message content
- `decryptMessage()` - Decrypt message content
- `encryptFile()` - Encrypt file/image
- `decryptFile()` - Decrypt file/image
- `encryptChatKey()` - Encrypt chat key for exchange
- `decryptChatKey()` - Decrypt received chat key

### `src/lib/keyManager.ts`
Secure key storage in IndexedDB:
- `storeUserKeys()` - Store user's keypair
- `getUserKeys()` - Retrieve user's keypair
- `storeChatKey()` - Store chat's symmetric key
- `getChatKey()` - Retrieve chat's symmetric key
- `clearAllKeys()` - Clear all keys (logout/reset)

### `src/hooks/useEncryption.ts`
React hook for encryption operations:
- `initializeEncryption()` - Initialize user's encryption
- `encryptMessageContent()` - Encrypt a message
- `decryptMessageContent()` - Decrypt a message
- `setupChatEncryption()` - Setup encryption for a chat
- `exchangeChatKey()` - Exchange keys with participants
- `receiveChatKey()` - Receive and store exchanged key

### `src/hooks/useMessageEncryption.ts`
Helper hook for message encryption/decryption:
- `encryptBeforeSend()` - Encrypt message before sending
- `decryptAfterReceive()` - Decrypt message after receiving

## React Components

### `EncryptionProvider`
Context provider for encryption state across the app.

### `EncryptionStatus`
Shows encryption status in chat header (lock icon).

### `MessageEncryptionIndicator`
Shows lock icon next to encrypted messages.

### `EncryptedMessage`
Wrapper component that automatically decrypts messages.

## Usage

### Initialization

Encryption is automatically initialized when a user signs in. The `useEncryption` hook handles:
1. Checking if user has existing keys
2. Generating new keypair if needed
3. Storing keys in IndexedDB
4. Uploading public key to server

### Sending Encrypted Messages

Messages are automatically encrypted when sent:

```typescript
const { encryptBeforeSend } = useMessageEncryption();

// Encrypt message
const encrypted = await encryptBeforeSend(messageContent, chatId);

// Send to server
await fetch(`/api/chats/${chatId}/messages`, {
  method: 'POST',
  body: JSON.stringify({
    content: encrypted.encryptedContent,
    isEncrypted: true,
    encryptionIv: encrypted.iv,
  }),
});
```

### Receiving Encrypted Messages

Messages are automatically decrypted using the `EncryptedMessage` component:

```tsx
<EncryptedMessage
  content={message.content}
  chatId={message.chatId}
  isEncrypted={message.isEncrypted}
  encryptionIv={message.encryptionIv}
>
  {(decryptedContent) => (
    <p>{decryptedContent}</p>
  )}
</EncryptedMessage>
```

## Security Considerations

### What's Protected

✅ **Message content** - Encrypted end-to-end
✅ **File attachments** - Encrypted before upload
✅ **Private keys** - Never leave the user's device
✅ **Chat keys** - Never stored unencrypted on server

### What's Not Protected

⚠️ **Metadata** - Server can see:
- Who is messaging whom
- When messages are sent
- Message length (approximate)
- File sizes

⚠️ **User information** - Public data like:
- Usernames
- Display names
- Avatar URLs
- Online status

### Best Practices

1. **Key Backup**: Users should be aware that keys are device-specific. Logging in on a new device will generate new keys.

2. **Key Rotation**: Currently not implemented. Consider adding key rotation for enhanced security.

3. **Forward Secrecy**: Not currently implemented. Messages encrypted with the same key can be decrypted if the key is compromised.

4. **Device Verification**: Not currently implemented. Users cannot verify if they're communicating with the correct person.

## Limitations

1. **Device-Specific Keys**: Keys are stored per device. Users cannot access encrypted messages from old chats on new devices.

2. **No Key Backup**: If a user loses access to their device/browser, they lose access to all encryption keys.

3. **Group Chat Key Distribution**: In large groups, key distribution can be slow.

4. **No Message Verification**: No way to verify message authenticity beyond encryption.

## Future Enhancements

### Planned Features

- [ ] **Key Backup/Recovery**: Allow users to backup keys securely
- [ ] **Device Management**: See and manage devices with encryption keys
- [ ] **Key Verification**: Verify encryption keys with safety numbers
- [ ] **Forward Secrecy**: Implement Double Ratchet or similar protocol
- [ ] **Key Rotation**: Periodic rotation of chat keys
- [ ] **Encrypted Voice/Video**: Extend encryption to real-time media
- [ ] **Encrypted File Storage**: Encrypt files at rest on server
- [ ] **Message Verification**: Digital signatures for message authenticity

### Technical Improvements

- [ ] **WebWorker**: Move encryption to background thread
- [ ] **Optimized Key Exchange**: Batch key exchanges for groups
- [ ] **Key Caching**: Cache decrypted keys in memory
- [ ] **Progressive Decryption**: Decrypt messages as they're scrolled into view
- [ ] **Encrypted Search**: Search encrypted messages without decrypting all

## Troubleshooting

### "Encryption not initialized"

**Cause**: User's keypair not generated yet
**Solution**: Wait for `isEncryptionReady` to be true

### "[Encrypted message - key not available]"

**Cause**: Chat key not found in IndexedDB
**Solution**: 
1. Check if user is a participant of the chat
2. Re-request key from chat participants
3. Ask admin to re-send chat key

### "Failed to decrypt message"

**Cause**: Corrupted data or wrong key
**Solution**:
1. Verify IV is correct
2. Check if chat key matches
3. Re-sync encryption keys

## Testing

### Manual Testing

1. **Basic Encryption**:
   - Send a message in a chat
   - Verify message is stored encrypted in database
   - Verify message displays decrypted in UI

2. **Key Exchange**:
   - Create a new group
   - Add multiple participants
   - Verify all participants can read messages

3. **Multi-Device**:
   - Login on two different browsers
   - Send message from device A
   - Verify cannot read on device B (different keys)

### Database Verification

Check that messages are encrypted:

```sql
SELECT content, is_encrypted, encryption_iv 
FROM messages 
WHERE is_encrypted = true 
LIMIT 10;
```

The `content` field should contain base64-encoded encrypted data, not plaintext.

## Migration Guide

### For Existing Users

When E2E encryption is enabled for an existing chat:

1. Old messages remain unencrypted
2. New messages are automatically encrypted
3. Users will see mixed encrypted/unencrypted messages
4. Consider showing a notice: "E2E encryption enabled from [date]"

### For New Users

1. Encryption automatically initialized on first login
2. All new chats are encrypted by default
3. No action required from user

## Performance Impact

### Encryption Overhead

- **Message Encryption**: ~1-5ms per message
- **Message Decryption**: ~1-5ms per message
- **Key Generation**: ~100-500ms (one-time)
- **Key Exchange**: ~50-200ms per participant

### Storage Impact

- **IndexedDB**: ~10KB per user (keypair + chat keys)
- **Database**: ~30% increase in message size (base64 encoding)

### Network Impact

- **Message Size**: ~33% larger (base64 encoding)
- **Key Exchange**: Additional API calls for new chats

## Support

For issues or questions about encryption:

1. Check console logs for encryption errors
2. Verify encryption status in chat header
3. Clear IndexedDB and re-initialize encryption
4. Report issues with encryption details (no private keys!)

---

**Last Updated**: 2025-10-19
**Version**: 1.0.0
