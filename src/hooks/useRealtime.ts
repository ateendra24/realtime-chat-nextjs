"use client";
import * as Ably from 'ably';
import { useEffect, useState, useRef } from "react";
import type {
  RealtimeClient,
  Message,
  ReactionUpdateData,
  ChatListUpdateData,
  GlobalChatListUpdateData,
  UserPresenceData
} from '@/types/global';

// Ably implementation for real-time functionality with E2EE support
class AblyRealtimeClient implements RealtimeClient {
  private ably: Ably.Realtime | null = null;
  private channels: Map<string, Ably.RealtimeChannel> = new Map();
  public isConnected: boolean = false;
  private currentChatId: string | null = null;
  private messageCallback: ((data: Message) => void) | null = null;
  private reactionCallback: ((data: ReactionUpdateData) => void) | null = null;
  private chatListUpdateCallback: ((data: ChatListUpdateData) => void) | null = null;
  private isDisconnecting: boolean = false;

  async connect() {
    try {
      // Fetch Ably token from server
      const tokenResponse = await fetch('/api/ably/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to fetch Ably token');
      }
      const tokenRequest = await tokenResponse.json();

      // Initialize Ably with token authentication
      this.ably = new Ably.Realtime({
        authCallback: async (data, callback) => {
          try {
            const response = await fetch('/api/ably/token');
            const token = await response.json();
            callback(null, token);
          } catch (error) {
            callback((error as Error).message, null);
          }
        },
        // Production-optimized settings
        disconnectedRetryTimeout: 5000, // Retry after 5s if disconnected
        suspendedRetryTimeout: 10000, // Retry after 10s if suspended
        // Ably's automatic connection recovery ensures no message loss
        recover: (lastConnectionDetails, cb) => {
          cb(true); // Always try to recover connection state
        },
      });

      this.ably.connection.on('connected', () => {
        this.isConnected = true;
        console.log('✅ Ably connected');

        // Rejoin current chat if we were in one (handles reconnections)
        if (this.currentChatId) {
          this.joinChat(this.currentChatId);
        }
      });

      this.ably.connection.on('disconnected', () => {
        this.isConnected = false;
        console.warn('⚠️ Ably disconnected');
      });

      this.ably.connection.on('suspended', () => {
        this.isConnected = false;
        console.warn('⚠️ Ably connection suspended');
      });

      this.ably.connection.on('failed', () => {
        this.isConnected = false;
        console.error('❌ Ably connection failed');
      });

    } catch (error) {
      console.error("Failed to initialize Ably:", error);
    }
  }

  disconnect() {
    // Prevent multiple disconnect attempts
    if (this.isDisconnecting || !this.ably) {
      return;
    }

    this.isDisconnecting = true;

    try {
      // First unsubscribe from all channels to prevent new events
      this.channels.forEach((channel) => {
        try {
          channel.unsubscribe();
        } catch (error) {
          // Ignore unsubscribe errors during cleanup
        }
      });
      this.channels.clear();

      // Then close the connection if it exists and is in a closeable state
      if (this.ably.connection) {
        try {
          const state = this.ably.connection.state;
          // Only attempt to close if connection is in an active state
          if (state === 'connected' || state === 'connecting') {
            this.ably.close();
          }
        } catch (closeError) {
          // Silently ignore all close errors - connection may already be closed
        }
      }
    } catch (error) {
      // Silently ignore all disconnect errors
    } finally {
      this.ably = null;
      this.isConnected = false;
      this.isDisconnecting = false;
    }
  }

  joinChat(chatId: string) {
    if (this.ably) {
      // Leave previous chat channel gracefully
      if (this.currentChatId && this.channels.has(`chat-${this.currentChatId}`)) {
        const oldChannel = this.channels.get(`chat-${this.currentChatId}`);
        try {
          oldChannel?.unsubscribe();
          // Ably handles detach automatically when unsubscribing
        } catch (error) {
          console.debug('Error unsubscribing from old channel:', error);
        }
        this.channels.delete(`chat-${this.currentChatId}`);
      }

      // Join new chat channel with message history
      const channel = this.ably.channels.get(`chat-${chatId}`, {
        params: { rewind: '1' }, // Get last message on join
      });

      // Set up listeners for this channel
      if (this.messageCallback) {
        channel.subscribe('message', (message) => {
          this.messageCallback!(message.data as Message);
        });
      }

      if (this.reactionCallback) {
        channel.subscribe('reaction-update', (message) => {
          this.reactionCallback!(message.data as ReactionUpdateData);
        });
      }

      if (this.chatListUpdateCallback) {
        channel.subscribe('chat-list-update', (message) => {
          this.chatListUpdateCallback!(message.data as ChatListUpdateData);
        });
      }

      // Attach to channel and handle errors
      channel.attach().then(() => {
        console.debug(`✅ Attached to channel: chat-${chatId}`);
      }).catch((err) => {
        console.error(`Failed to attach to channel: chat-${chatId}`, err);
      });

      this.channels.set(`chat-${chatId}`, channel);
      this.currentChatId = chatId;
    }
  }

  leaveChat(chatId: string) {
    if (this.ably && this.channels.has(`chat-${chatId}`)) {
      const channel = this.channels.get(`chat-${chatId}`);
      try {
        channel?.unsubscribe();
        // No need to explicitly detach - Ably handles this automatically
      } catch (error) {
        console.debug('Error leaving chat:', error);
      }
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
        channel.subscribe('message', (message) => {
          callback(message.data as Message);
        });
      }
    });
  }

  onReactionUpdate(callback: (data: ReactionUpdateData) => void) {
    this.reactionCallback = callback;

    // Apply to existing chat channels
    this.channels.forEach((channel, channelName) => {
      if (channelName.startsWith('chat-')) {
        channel.subscribe('reaction-update', (message) => {
          callback(message.data as ReactionUpdateData);
        });
      }
    });
  }

  onChatListUpdate(callback: (data: ChatListUpdateData) => void) {
    this.chatListUpdateCallback = callback;

    // Apply to existing chat channels
    this.channels.forEach((channel, channelName) => {
      if (channelName.startsWith('chat-')) {
        channel.subscribe('chat-list-update', (message) => {
          callback(message.data as ChatListUpdateData);
        });
      }
    });
  }

  onGlobalChatListUpdate(callback: (data: GlobalChatListUpdateData) => void) {
    if (!this.channels.has('global-updates')) {
      const channel = this.ably?.channels.get('global-updates');
      if (channel) {
        this.channels.set('global-updates', channel);
        // Subscribe automatically attaches
      }
    }
    const channel = this.channels.get('global-updates');
    channel?.subscribe('global-chat-list-update', (message) => {
      callback(message.data as GlobalChatListUpdateData);
    });
  }

  onUserOnline(callback: (data: UserPresenceData) => void) {
    if (!this.channels.has('global-updates')) {
      const channel = this.ably?.channels.get('global-updates');
      if (channel) {
        this.channels.set('global-updates', channel);
        // Subscribe automatically attaches
      }
    }
    const channel = this.channels.get('global-updates');
    channel?.subscribe('user-online', (message) => {
      callback(message.data as UserPresenceData);
    });
  }

  onUserOffline(callback: (data: UserPresenceData) => void) {
    if (!this.channels.has('global-updates')) {
      const channel = this.ably?.channels.get('global-updates');
      if (channel) {
        this.channels.set('global-updates', channel);
        // Subscribe automatically attaches
      }
    }
    const channel = this.channels.get('global-updates');
    channel?.subscribe('user-offline', (message) => {
      callback(message.data as UserPresenceData);
    });
  }

  emitChatListUpdate(data: ChatListUpdateData) {
    // These are handled server-side when messages are sent
  }

  emitGlobalChatListUpdate(data: GlobalChatListUpdateData) {
    // These are handled server-side when messages are sent
  }

  cleanup() {
    // Unsubscribe from all channels (detach is automatic in Ably)
    this.channels.forEach((channel) => {
      try {
        channel.unsubscribe();
      } catch (error) {
        // Ignore errors during cleanup
        console.debug('Channel cleanup error:', error);
      }
    });
    this.channels.clear();
  }
}

export function useRealtime() {
  const [client, setClient] = useState<RealtimeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React strict mode
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    const initClient = async () => {
      // Use Ably for real-time with E2EE support
      const realtimeClient = new AblyRealtimeClient();

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

    return () => {
      isInitializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (client) {
        try {
          client.cleanup();
          client.disconnect();
        } catch (error) {
          console.debug('Error during cleanup:', error);
        }
      }
    };
  }, [client]);

  return { client, isConnected };
}
