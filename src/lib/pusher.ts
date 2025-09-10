import Pusher from 'pusher';

// Server-side Pusher instance
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
  typing_start: 'typing-start',
  typing_stop: 'typing-stop',
  chat_list_update: 'chat-list-update',
  global_chat_list_update: 'global-chat-list-update',
  user_online: 'user-online',
  user_offline: 'user-offline',
} as const;

export default pusher;
