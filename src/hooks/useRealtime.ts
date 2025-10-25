"use client";
import PusherJS, { Channel } from 'pusher-js';
import { useEffect, useState } from "react";
import type {
  RealtimeClient,
  Message,
  ReactionUpdateData,
  TypingData,
  ChatListUpdateData,
  GlobalChatListUpdateData,
  UserPresenceData
} from '@/types/global';

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
        this.isConnected = true;

        // Rejoin current chat if we were in one (handles reconnections)
        if (this.currentChatId) {
          this.joinChat(this.currentChatId);
        }
      });

      this.pusher.connection.bind('disconnected', () => {
        this.isConnected = false;
      });

      this.pusher.connection.bind('unavailable', () => {
        this.isConnected = false;
      });

      this.pusher.connection.bind('failed', () => {
        this.isConnected = false;
      });

      this.pusher.connection.bind('error', (error: Error) => {
        console.error('Pusher connection error:', error);
        this.isConnected = false;
      });

      this.pusher.connection.bind('state_change', (states: { previous: string; current: string }) => {
        // Handle reconnection scenarios silently
      });

    } catch (error) {
      console.error("Failed to initialize Pusher:", error);
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
        this.pusher.unsubscribe(`chat-${this.currentChatId}`);
        this.channels.delete(`chat-${this.currentChatId}`);
      }

      // Join new chat channel
      const channel = this.pusher.subscribe(`chat-${chatId}`);

      channel.bind('pusher:subscription_error', (error: Error) => {
        console.error(`Failed to subscribe to channel: chat-${chatId}`, error);
      });

      // Set up listeners for this channel
      if (this.messageCallback) {
        channel.bind('message', (data: Message) => {
          this.messageCallback!(data);
        });
      }

      if (this.reactionCallback) {
        channel.bind('reaction-update', (data: ReactionUpdateData) => {
          this.reactionCallback!(data);
        });
      }

      if (this.chatListUpdateCallback) {
        channel.bind('chat-list-update', (data: ChatListUpdateData) => {
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
    }
  }

  onMessage(callback: (data: Message) => void) {
    this.messageCallback = callback;

    // Apply to existing chat channels
    this.channels.forEach((channel, channelName) => {
      if (channelName.startsWith('chat-')) {
        channel.bind('message', (data: Message) => {
          callback(data);
        });
      }
    });
  }

  onReactionUpdate(callback: (data: ReactionUpdateData) => void) {
    this.reactionCallback = callback;

    // Apply to existing chat channels
    this.channels.forEach((channel, channelName) => {
      if (channelName.startsWith('chat-')) {
        channel.bind('reaction-update', (data: ReactionUpdateData) => {
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
    this.chatListUpdateCallback = callback;

    // Apply to existing chat channels
    this.channels.forEach((channel, channelName) => {
      if (channelName.startsWith('chat-')) {
        channel.bind('chat-list-update', (data: ChatListUpdateData) => {
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
  }

  emitGlobalChatListUpdate(data: GlobalChatListUpdateData) {
    // These are handled server-side when messages are sent
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
