"use client";
import PusherJS, { Channel } from 'pusher-js';
import { useEffect, useState } from "react";

// Unified interface for Pusher
export interface RealtimeClient {
  connect: () => void;
  disconnect: () => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  onMessage: (callback: (data: Message) => void) => void;
  onReactionUpdate: (callback: (data: ReactionUpdateData) => void) => void;
  onTypingStart: (callback: (data: TypingData) => void) => void;
  onTypingStop: (callback: (data: TypingData) => void) => void;
  onChatListUpdate: (callback: (data: ChatListUpdateData) => void) => void;
  onGlobalChatListUpdate: (callback: (data: GlobalChatListUpdateData) => void) => void;
  onUserOnline: (callback: (data: UserPresenceData) => void) => void;
  onUserOffline: (callback: (data: UserPresenceData) => void) => void;
  emitTypingStart: (data: TypingData) => void;
  emitTypingStop: (data: TypingData) => void;
  emitChatListUpdate: (data: ChatListUpdateData) => void;
  emitGlobalChatListUpdate: (data: GlobalChatListUpdateData) => void;
  cleanup: () => void;
  isConnected: boolean;
}

// Type definitions for real-time events
interface Message {
  id: string;
  user: string;
  userId?: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  chatId?: string;
  avatarUrl?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions?: Array<{
    id: string;
    emoji: string;
    count: number;
    userIds: string[];
    hasReacted: boolean;
  }>;
}

interface ReactionUpdateData {
  messageId: string;
  emoji: string;
  action: 'added' | 'removed';
  reaction: {
    id: string;
    emoji: string;
    count: number;
    userIds: string[];
    hasReacted: boolean;
  } | null;
  chatId: string;
  userId: string;
}

interface TypingData {
  userId: string;
  chatId: string;
  userName?: string;
}

interface ChatListUpdateData {
  chatId: string;
  lastMessage: {
    content: string;
    createdAt: string;
    userName: string;
    userId: string;
  };
}

interface GlobalChatListUpdateData {
  chatId: string;
  triggerRefresh: boolean;
}

interface UserPresenceData {
  userId: string;
  userName?: string;
}

// Pusher implementation for real-time functionality
class PusherRealtimeClient implements RealtimeClient {
  private pusher: PusherJS | null = null;
  private channels: Map<string, Channel> = new Map();
  public isConnected: boolean = false;
  private currentChatId: string | null = null;
  private messageCallback: ((data: Message) => void) | null = null;
  private reactionCallback: ((data: ReactionUpdateData) => void) | null = null;
  private chatListUpdateCallback: ((data: ChatListUpdateData) => void) | null = null;

  async connect() {
    try {
      console.log('Initializing Pusher with:', {
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
      });

      this.pusher = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
        // Production-optimized settings for Vercel
        activityTimeout: 30000, // Detect dead connections after 30s
        pongTimeout: 10000, // Wait 10s for pong response
        unavailableTimeout: 5000, // Try reconnecting after 5s if unavailable
        // Enable automatic reconnection with exponential backoff
        disableStats: false, // Keep stats for debugging
      });

      this.pusher.connection.bind('connected', () => {
        console.log('✅ Connected to Pusher successfully');
        this.isConnected = true;

        // Rejoin current chat if we were in one (handles reconnections)
        if (this.currentChatId) {
          console.log('🔄 Rejoining chat after reconnection:', this.currentChatId);
          this.joinChat(this.currentChatId);
        }
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('❌ Disconnected from Pusher');
        this.isConnected = false;
      });

      this.pusher.connection.bind('unavailable', () => {
        console.warn('⚠️ Pusher connection unavailable, will retry...');
        this.isConnected = false;
      });

      this.pusher.connection.bind('failed', () => {
        console.error('❌ Pusher connection failed permanently');
        this.isConnected = false;
      });

      this.pusher.connection.bind('error', (error: Error) => {
        console.error('❌ Pusher connection error:', error);
        this.isConnected = false;
      });

      this.pusher.connection.bind('state_change', (states: { previous: string; current: string }) => {
        console.log('🔄 Pusher state change:', states.previous, '->', states.current);

        // Handle reconnection scenarios
        if (states.current === 'connected' && states.previous === 'unavailable') {
          console.log('✅ Reconnected to Pusher after being unavailable');
        }
      });

    } catch (error) {
      console.error("❌ Failed to initialize Pusher:", error);
    }
  }

  disconnect() {
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
      this.isConnected = false;
      this.channels.clear();
    }
  }

  joinChat(chatId: string) {
    if (this.pusher) {
      // Leave previous chat channel
      if (this.currentChatId && this.channels.has(`chat-${this.currentChatId}`)) {
        console.log(`🚪 Leaving previous Pusher channel: chat-${this.currentChatId}`);
        this.pusher.unsubscribe(`chat-${this.currentChatId}`);
        this.channels.delete(`chat-${this.currentChatId}`);
      }

      // Join new chat channel
      console.log(`🚪 Joining Pusher channel: chat-${chatId}`);
      const channel = this.pusher.subscribe(`chat-${chatId}`);

      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`✅ Successfully subscribed to channel: chat-${chatId}`);
      });

      channel.bind('pusher:subscription_error', (error: Error) => {
        console.error(`❌ Failed to subscribe to channel: chat-${chatId}`, error);
      });

      // Set up listeners for this channel
      if (this.messageCallback) {
        console.log(`📨 Setting up message listener for channel: chat-${chatId}`);
        channel.bind('message', (data: Message) => {
          console.log(`📨 Received message on channel chat-${chatId}:`, data);
          this.messageCallback!(data);
        });
      }

      if (this.reactionCallback) {
        console.log(`⚡ Setting up reaction listener for channel: chat-${chatId}`);
        channel.bind('reaction-update', (data: ReactionUpdateData) => {
          console.log(`⚡ Received reaction update on channel chat-${chatId}:`, data);
          this.reactionCallback!(data);
        });
      }

      if (this.chatListUpdateCallback) {
        console.log(`📋 Setting up chat list listener for channel: chat-${chatId}`);
        channel.bind('chat-list-update', (data: ChatListUpdateData) => {
          console.log(`📋 Received chat list update on channel chat-${chatId}:`, data);
          this.chatListUpdateCallback!(data);
        });
      }

      this.channels.set(`chat-${chatId}`, channel);
      this.currentChatId = chatId;
    }
  }

  leaveChat(chatId: string) {
    if (this.pusher && this.channels.has(`chat-${chatId}`)) {
      this.pusher.unsubscribe(`chat-${chatId}`);
      this.channels.delete(`chat-${chatId}`);
      if (this.currentChatId === chatId) {
        this.currentChatId = null;
      }
      console.log(`Left Pusher channel: chat-${chatId}`);
    }
  }

  onMessage(callback: (data: Message) => void) {
    console.log('📨 Storing message callback');
    this.messageCallback = callback;

    // Apply to existing chat channels
    this.channels.forEach((channel, channelName) => {
      if (channelName.startsWith('chat-')) {
        console.log(`📨 Applying message listener to existing channel: ${channelName}`);
        channel.bind('message', (data: Message) => {
          console.log(`📨 Received message on channel ${channelName}:`, data);
          callback(data);
        });
      }
    });
  }

  onReactionUpdate(callback: (data: ReactionUpdateData) => void) {
    console.log('⚡ Storing reaction callback');
    this.reactionCallback = callback;

    // Apply to existing chat channels
    this.channels.forEach((channel, channelName) => {
      if (channelName.startsWith('chat-')) {
        console.log(`⚡ Applying reaction listener to existing channel: ${channelName}`);
        channel.bind('reaction-update', (data: ReactionUpdateData) => {
          console.log(`⚡ Received reaction update on channel ${channelName}:`, data);
          callback(data);
        });
      }
    });
  }

  onTypingStart(callback: (data: TypingData) => void) {
    if (this.currentChatId) {
      const channel = this.channels.get(`chat-${this.currentChatId}`);
      channel?.bind('typing-start', callback);
    }
  }

  onTypingStop(callback: (data: TypingData) => void) {
    if (this.currentChatId) {
      const channel = this.channels.get(`chat-${this.currentChatId}`);
      channel?.bind('typing-stop', callback);
    }
  }

  onChatListUpdate(callback: (data: ChatListUpdateData) => void) {
    console.log('📋 Storing chat list update callback');
    this.chatListUpdateCallback = callback;

    // Apply to existing chat channels
    this.channels.forEach((channel, channelName) => {
      if (channelName.startsWith('chat-')) {
        console.log(`📋 Applying chat list listener to existing channel: ${channelName}`);
        channel.bind('chat-list-update', (data: ChatListUpdateData) => {
          console.log(`📋 Received chat list update on channel ${channelName}:`, data);
          callback(data);
        });
      }
    });
  }

  onGlobalChatListUpdate(callback: (data: GlobalChatListUpdateData) => void) {
    if (!this.channels.has('global-updates')) {
      const channel = this.pusher?.subscribe('global-updates');
      if (channel) {
        this.channels.set('global-updates', channel);
      }
    }
    const channel = this.channels.get('global-updates');
    channel?.bind('global-chat-list-update', callback);
  }

  onUserOnline(callback: (data: UserPresenceData) => void) {
    if (!this.channels.has('global-updates')) {
      const channel = this.pusher?.subscribe('global-updates');
      if (channel) {
        this.channels.set('global-updates', channel);
      }
    }
    const channel = this.channels.get('global-updates');
    channel?.bind('user-online', callback);
  }

  onUserOffline(callback: (data: UserPresenceData) => void) {
    if (!this.channels.has('global-updates')) {
      const channel = this.pusher?.subscribe('global-updates');
      if (channel) {
        this.channels.set('global-updates', channel);
      }
    }
    const channel = this.channels.get('global-updates');
    channel?.bind('user-offline', callback);
  }

  // For Pusher, these are HTTP requests to trigger events
  emitTypingStart(data: TypingData) {
    fetch('/api/pusher/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', ...data })
    });
  }

  emitTypingStop(data: TypingData) {
    fetch('/api/pusher/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', ...data })
    });
  }

  emitChatListUpdate(data: ChatListUpdateData) {
    // These are handled server-side when messages are sent
    console.log('Chat list update will be handled server-side:', data);
  }

  emitGlobalChatListUpdate(data: GlobalChatListUpdateData) {
    // These are handled server-side when messages are sent
    console.log('Global chat list update will be handled server-side:', data);
  }

  cleanup() {
    // Pusher channels automatically clean up when unsubscribed
  }
}

export function useRealtime() {
  const [client, setClient] = useState<RealtimeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initClient = async () => {
      // Use Pusher for both development and production
      const realtimeClient = new PusherRealtimeClient();

      await realtimeClient.connect();
      setClient(realtimeClient);
      setIsConnected(realtimeClient.isConnected);

      // Monitor connection status
      const checkConnection = setInterval(() => {
        setIsConnected(realtimeClient.isConnected);
      }, 1000);

      return () => {
        clearInterval(checkConnection);
      };
    };

    initClient();
  }, []);

  useEffect(() => {
    return () => {
      if (client) {
        client.cleanup();
        client.disconnect();
      }
    };
  }, [client]);

  return { client, isConnected };
}
