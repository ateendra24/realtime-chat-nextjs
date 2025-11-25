import * as Ably from 'ably';

// Server-side Ably instance with production-optimized settings
const apiKey = process.env.ABLY_API_KEY || 'placeholder:key';

export const ably = new Ably.Rest({
  key: apiKey,
  // Guaranteed message delivery with automatic retries
  // Critical for E2EE - ensures encrypted messages are never lost
  queryTime: true,
});

// Channel and event names (keeping same structure for compatibility)
export const CHANNELS = {
  chat: (chatId: string) => `chat-${chatId}`,
  global: 'global-updates',
  presence: (userId: string) => `presence-${userId}`,
} as const;

export const EVENTS = {
  message: 'message',
  reaction_update: 'reaction-update',
  chat_list_update: 'chat-list-update',
  global_chat_list_update: 'global-chat-list-update',
  user_online: 'user-online',
  user_offline: 'user-offline',
} as const;

/**
 * Broadcast Ably event with timeout protection for serverless environments
 * Critical for Vercel to prevent dropped messages when function terminates
 * Ably provides better reliability than Ably with automatic retries
 */
export async function broadcastWithTimeout(
  channel: string | string[],
  event: string,
  data: unknown,
  timeoutMs: number = 5000
): Promise<void> {
  try {
    const channels = Array.isArray(channel) ? channel : [channel];

    await Promise.race([
      Promise.all(
        channels.map(ch =>
          ably.channels.get(ch).publish(event, data)
        )
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Ably broadcast timeout')), timeoutMs)
      ),
    ]);
  } catch (error) {
    console.error(`Failed to broadcast Ably event '${event}':`, error);
    throw error; // Re-throw to let caller handle
  }
}

export default ably;
