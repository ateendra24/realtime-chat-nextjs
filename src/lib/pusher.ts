import Pusher from 'pusher';

// Server-side Pusher instance with production-optimized settings
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Channel and event names
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
 * Broadcast Pusher event with timeout protection for serverless environments
 * Critical for Vercel to prevent dropped messages when function terminates
 */
export async function broadcastWithTimeout(
  channel: string | string[],
  event: string,
  data: unknown,
  timeoutMs: number = 3000
): Promise<void> {
  try {
    await Promise.race([
      pusher.trigger(channel, event, data),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Pusher broadcast timeout')), timeoutMs)
      ),
    ]);
  } catch (error) {
    console.error(`Failed to broadcast Pusher event '${event}':`, error);
    throw error; // Re-throw to let caller handle
  }
}

export default pusher;
