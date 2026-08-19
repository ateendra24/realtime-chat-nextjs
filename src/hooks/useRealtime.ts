"use client";
import * as Ably from 'ably';
import { useEffect, useState, useRef } from "react";
import type {
  RealtimeClient,
  Message,
  ReactionUpdateData,
  ChatListUpdateData,
  GlobalChatListUpdateData,
  UserPresenceData,
  TypingEvent,
  BlockEvent
} from '@/types/global';

// Ably implementation for real-time functionality with E2EE support
class AblyRealtimeClient implements RealtimeClient {
  private ably: Ably.Realtime | null = null;
  private channels: Map<string, Ably.RealtimeChannel> = new Map();
  public isConnected: boolean = false;
  private currentChatId: string | null = null;
  private messageCallbacks: Set<(data: Message) => void> = new Set();
  private reactionCallbacks: Set<(data: ReactionUpdateData) => void> = new Set();
  private typingCallbacks: Set<(data: TypingEvent) => void> = new Set();
  private chatListUpdateCallbacks: Set<(data: ChatListUpdateData) => void> = new Set();
  private globalChatListUpdateCallbacks: Set<(data: GlobalChatListUpdateData) => void> = new Set();
  private userOnlineCallbacks: Set<(data: UserPresenceData) => void> = new Set();
  private userOfflineCallbacks: Set<(data: UserPresenceData) => void> = new Set();
  private userBlockedCallbacks: Set<(data: BlockEvent) => void> = new Set();
  private userUnblockedCallbacks: Set<(data: BlockEvent) => void> = new Set();
  private joinedChatIds: Set<string> = new Set();
  private isDisconnecting: boolean = false;

  async connect() {
    try {
      // Fetch Ably token from server
      const tokenResponse = await fetch('/api/ably/token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to fetch Ably token');
      }
      await tokenResponse.json();

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

        // Rejoin all chats that were requested
        this.joinedChatIds.forEach(chatId => {
          this.subscribeToChatChannel(chatId);
        });
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
          // Ignore errors during disconnect
          console.debug('Error unsubscribing channel during disconnect:', error);
        }
      });

      // Clear the channels map
      this.channels.clear();

      // Close the Ably connection
      this.ably.close();
      this.isConnected = false;
      this.ably = null;
      console.log('🔌 Ably disconnected cleanly');
    } catch (error) {
      console.debug('Error during disconnect:', error);
    } finally {
      this.isDisconnecting = false;
    }
  }

  private subscribeToChatChannel(chatId: string) {
    if (!this.ably || this.channels.has(`chat-${chatId}`)) {
      return;
    }

    const channel = this.ably.channels.get(`chat-${chatId}`, {
      params: { rewind: '1' }, // Get last message on join
    });

    channel.subscribe('message', (message) => {
      this.messageCallbacks.forEach(cb => cb(message.data as Message));
    });

    channel.subscribe('reaction-update', (message) => {
      this.reactionCallbacks.forEach(cb => cb(message.data as ReactionUpdateData));
    });

    channel.subscribe('typing', (message) => {
      this.typingCallbacks.forEach(cb => cb(message.data as TypingEvent));
    });

    channel.subscribe('chat-list-update', (message) => {
      this.chatListUpdateCallbacks.forEach(cb => cb(message.data as ChatListUpdateData));
    });

    channel.attach().then(() => {
      console.debug(`✅ Attached to channel: chat-${chatId}`);
    }).catch((err) => {
      console.error(`Failed to attach to channel: chat-${chatId}`, err);
    });

    this.channels.set(`chat-${chatId}`, channel);
  }

  joinChat(chatId: string) {
    this.joinedChatIds.add(chatId);
    this.currentChatId = chatId;
    if (this.ably && this.isConnected) {
      this.subscribeToChatChannel(chatId);
    }
  }

  leaveChat(chatId: string) {
    this.joinedChatIds.delete(chatId);
    if (this.ably && this.channels.has(`chat-${chatId}`)) {
      const channel = this.channels.get(`chat-${chatId}`);
      try {
        channel?.unsubscribe();
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
    this.messageCallbacks.add(callback);
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  onReactionUpdate(callback: (data: ReactionUpdateData) => void) {
    this.reactionCallbacks.add(callback);
    return () => {
      this.reactionCallbacks.delete(callback);
    };
  }

  onTyping(callback: (data: TypingEvent) => void) {
    this.typingCallbacks.add(callback);
    return () => {
      this.typingCallbacks.delete(callback);
    };
  }

  sendTyping(chatId: string, userId: string, isTyping: boolean, userName?: string) {
    if (this.ably) {
      const channel = this.ably.channels.get(`chat-${chatId}`);
      channel.publish('typing', { chatId, userId, isTyping, userName });
    }
  }

  onChatListUpdate(callback: (data: ChatListUpdateData) => void) {
    this.chatListUpdateCallbacks.add(callback);
    return () => {
      this.chatListUpdateCallbacks.delete(callback);
    };
  }

  onGlobalChatListUpdate(callback: (data: GlobalChatListUpdateData) => void) {
    this.globalChatListUpdateCallbacks.add(callback);
    if (!this.channels.has('global-updates')) {
      const channel = this.ably?.channels.get('global-updates');
      if (channel) {
        this.channels.set('global-updates', channel);
        channel.subscribe('global-chat-list-update', (message) => {
          this.globalChatListUpdateCallbacks.forEach(cb => cb(message.data as GlobalChatListUpdateData));
        });
      }
    }
    return () => {
      this.globalChatListUpdateCallbacks.delete(callback);
    };
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

  joinPresence(userId: string) {
    // Join user's personal channel to receive specific events like blocks
    if (this.ably) {
      const channelName = `presence-${userId}`;
      const channel = this.ably.channels.get(channelName);

      // Listen for blocked/unblocked events on this channel
      channel.subscribe('user-blocked', (message) => {
        this.userBlockedCallbacks.forEach(cb => cb(message.data as BlockEvent));
      });

      channel.subscribe('user-unblocked', (message) => {
        this.userUnblockedCallbacks.forEach(cb => cb(message.data as BlockEvent));
      });

      this.channels.set(channelName, channel);
    }
  }

  leavePresence(userId: string) {
    if (this.ably) {
      const channelName = `presence-${userId}`;
      if (this.channels.has(channelName)) {
        this.channels.get(channelName)?.unsubscribe();
        this.channels.delete(channelName);
      }
    }
  }

  onUserBlocked(callback: (data: BlockEvent) => void) {
    this.userBlockedCallbacks.add(callback);
    return () => {
      this.userBlockedCallbacks.delete(callback);
    };
  }

  onUserUnblocked(callback: (data: BlockEvent) => void) {
    this.userUnblockedCallbacks.add(callback);
    return () => {
      this.userUnblockedCallbacks.delete(callback);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emitChatListUpdate(_data: ChatListUpdateData) {
    // These are handled server-side when messages are sent
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emitGlobalChatListUpdate(_data: GlobalChatListUpdateData) {
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

let sharedRealtimeClient: AblyRealtimeClient | null = null;
let sharedRealtimePromise: Promise<AblyRealtimeClient> | null = null;

export function useRealtime() {
  const [client, setClient] = useState<RealtimeClient | null>(sharedRealtimeClient);
  const [isConnected, setIsConnected] = useState(sharedRealtimeClient?.isConnected || false);

  useEffect(() => {
    let isMounted = true;

    if (!sharedRealtimeClient) {
      if (!sharedRealtimePromise) {
        sharedRealtimePromise = (async () => {
          const realtimeClient = new AblyRealtimeClient();
          await realtimeClient.connect();
          sharedRealtimeClient = realtimeClient;
          return realtimeClient;
        })();
      }

      sharedRealtimePromise.then((realtimeClient) => {
        if (isMounted) {
          setClient(realtimeClient);
          setIsConnected(realtimeClient.isConnected);
        }
      });
    } else {
      setClient(sharedRealtimeClient);
      setIsConnected(sharedRealtimeClient.isConnected);
    }

    const checkConnection = setInterval(() => {
      if (sharedRealtimeClient) {
        setIsConnected(sharedRealtimeClient.isConnected);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(checkConnection);
    };
  }, []);

  return { client, isConnected };
}
