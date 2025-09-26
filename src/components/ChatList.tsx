"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Search, X, UserPlus, Sun, Moon } from "lucide-react";
import { useRealtime } from "@/hooks/useRealtime";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import moment from 'moment';
import { useTheme } from "next-themes";
import { AnimatedListItem } from "./magicui/animated-list";

interface Chat {
  id: string;
  name?: string;
  description?: string;
  type: 'direct' | 'group';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isAdmin?: boolean;
  role?: 'owner' | 'admin' | 'member';
  isOwner?: boolean;
  displayName?: string;
  username?: string;
  unreadCount?: number;
  lastMessage?: {
    content: string;
    createdAt: Date;
    userName: string;
  };
}

interface ChatListProps {
  onChatSelect?: (chat: Chat) => void;
  onCreateGroup?: () => void;
  onSearchUsers?: () => void;
  selectedChatId?: string;
  refreshTrigger?: number;
}

export function ChatList({ onChatSelect, onCreateGroup, onSearchUsers, selectedChatId, refreshTrigger }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { client: realtimeClient } = useRealtime();
  const { setTheme, theme } = useTheme();

  // Debounce search query to reduce filtering operations
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchChats(false); // Don't show loading when refreshing
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Throttle real-time updates to prevent excessive API calls
  const lastFetchRef = useRef<number>(0);
  const pendingRefreshRef = useRef<boolean>(false);

  const throttledRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;

    if (timeSinceLastFetch >= 2000) { // Minimum 2 seconds between fetches
      lastFetchRef.current = now;
      pendingRefreshRef.current = false;
      fetchChats(false);
    } else if (!pendingRefreshRef.current) {
      pendingRefreshRef.current = true;
      setTimeout(() => {
        if (pendingRefreshRef.current) {
          lastFetchRef.current = Date.now();
          pendingRefreshRef.current = false;
          fetchChats(false);
        }
      }, 2000 - timeSinceLastFetch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for real-time updates using Pusher
  useEffect(() => {
    if (!realtimeClient) return;

    const handleNewMessage = (message: unknown) => {
      console.log("ChatList received new message:", message);
      throttledRefresh();
    };

    const handleChatListUpdate = (data: unknown) => {
      console.log("ChatList received chat list update:", data);
      throttledRefresh();
    };

    const handleGlobalChatListUpdate = (data: unknown) => {
      console.log("ChatList received global chat list update:", data);
      throttledRefresh();
    };

    console.log("ChatList: Setting up real-time listeners");

    realtimeClient.onMessage(handleNewMessage);
    realtimeClient.onChatListUpdate(handleChatListUpdate);
    realtimeClient.onGlobalChatListUpdate(handleGlobalChatListUpdate);

    return () => {
      console.log("ChatList: Cleaning up real-time listeners");
      realtimeClient.cleanup();
    };
  }, [realtimeClient, throttledRefresh]);

  const fetchChats = useCallback(async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }

      // Use cache-control headers to reduce server load
      const response = await fetch("/api/chats", {
        headers: {
          'Cache-Control': 'max-age=30', // Cache for 30 seconds
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Only update state if data has actually changed
      setChats(prevChats => {
        const newChats = data.chats || [];
        if (JSON.stringify(prevChats) !== JSON.stringify(newChats)) {
          return newChats;
        }
        return prevChats;
      });
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  }, []);

  const getChatDisplayName = useCallback((chat: Chat) => {
    if (chat.type === 'direct') {
      // For direct chats, prioritize username, then displayName
      return chat.username || chat.displayName || 'Unknown User';
    }

    if (chat.type === 'group') {
      return chat.name || 'Unnamed Group';
    }

    // Fallback
    return chat.displayName || chat.name || 'Direct Chat';
  }, []);

  const getChatAvatar = useCallback((chat: Chat) => {
    // For both direct and group chats, use the avatarUrl if available
    return chat.avatarUrl || undefined;
  }, []);

  const getLastMessagePreview = useCallback((chat: Chat) => {
    if (chat.lastMessage) {
      return `${chat.lastMessage.userName}: ${chat.lastMessage.content}`;
    }
    return chat.description || (chat.type === 'group' ? 'Group chat' : 'No messages yet');
  }, []);

  const getChatIcon = useCallback((chat: Chat) => {
    if (chat.type === 'group') {
      return <Users className="h-4 w-4" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  }, []);

  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </span>
      ) : part
    );
  }, []);

  // Memoize filtered and sorted chats to prevent unnecessary recalculations
  const filteredAndSortedChats = useMemo(() => {
    const filtered = chats.filter(chat => {
      // First filter by type
      if (filter !== 'all' && chat.type !== filter) {
        return false;
      }

      // Then filter by search query (use debounced query)
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        const displayName = getChatDisplayName(chat).toLowerCase();
        const lastMessageContent = chat.lastMessage?.content?.toLowerCase() || '';
        const lastMessageUser = chat.lastMessage?.userName?.toLowerCase() || '';

        return displayName.includes(query) ||
          lastMessageContent.includes(query) ||
          lastMessageUser.includes(query);
      }

      return true;
    });

    // Sort by last message time
    return filtered.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, filter, debouncedSearchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex space-x-2">
            {theme === "light" ? (
              <Button size="sm" onClick={() => setTheme("dark")} className='cursor-pointer rounded-full'>
                <Sun className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setTheme("light")} className='cursor-pointer rounded-full'>
                <Moon className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onSearchUsers}
              className="cursor-pointer rounded-full"
            >
              <UserPlus className="h-4 w-4" />
              {/* <span>Search Users</span> */}
            </Button>
            <Button
              size="sm"
              onClick={onCreateGroup}
              className="cursor-pointer rounded-full"
            >
              <Users className="h-4 w-4" />
              {/* <span>New Group</span> */}
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-secondary rounded-full p-1">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1 rounded-full"
          >
            All
          </Button>
          <Button
            variant={filter === 'direct' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('direct')}
            className="flex-1 rounded-full"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Direct
          </Button>
          <Button
            variant={filter === 'group' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('group')}
            className="flex-1 rounded-full"
          >
            <Users className="h-3 w-3 mr-1" />
            Groups
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative px-4 pt-3 pb-2">
        <Search className="absolute w-4 h-4 left-7 top-5.5 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-9 rounded-full"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-6 top-5 h-6 w-6 p-0"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-4 text-center text-muted-foreground space-y-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4 animate-pulse">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1">
          {filteredAndSortedChats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground ">
              <div className="mb-2">
                {debouncedSearchQuery.trim() ? (
                  <Search className="h-8 w-8 mx-auto mb-2" />
                ) : filter === 'group' ? (
                  <Users className="h-8 w-8 mx-auto mb-2" />
                ) : (
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                )}
              </div>
              <p>
                {debouncedSearchQuery.trim()
                  ? `No chats found for "${debouncedSearchQuery}"`
                  : `No ${filter === 'all' ? 'chats' : filter === 'group' ? 'groups' : 'direct chats'} yet`
                }
              </p>
              {!debouncedSearchQuery.trim() && filter === 'group' && (
                <Button
                  variant="link"
                  onClick={onCreateGroup}
                  className="mt-2"
                >
                  Create your first group
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Chat List */}
              <div className="p-2 space-y-1 overflow-y-auto h-[66vh] scrollbar-thin">
                {filteredAndSortedChats.map((chat) => (
                  <AnimatedListItem key={chat.id}>
                    <div
                      key={chat.id}
                      onClick={() => onChatSelect?.(chat)}
                      className={`flex items-center space-x-3 p-3 border border-transparent rounded-2xl cursor-pointer hover:bg-muted transition-colors ${selectedChatId === chat.id
                        ? '!bg-border'
                        : chat.unreadCount && chat.unreadCount > 0 && selectedChatId !== chat.id
                          ? 'bg-primary/10 border border-primary/30! hover:bg-primary/20'
                          : ''
                        }`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={getChatAvatar(chat)} alt={getChatDisplayName(chat)} />
                        <AvatarFallback>
                          {getChatIcon(chat)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm truncate text-accent-foreground">
                            {debouncedSearchQuery ? highlightText(getChatDisplayName(chat), debouncedSearchQuery) : getChatDisplayName(chat)}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {/* {getLastMessageTime(chat)} */}
                            {chat.lastMessage?.createdAt ?
                              moment(chat.lastMessage?.createdAt).format('l') === moment().format('l') ?
                                (moment(chat?.lastMessage?.createdAt).format('LT')) :
                                moment(chat?.lastMessage?.createdAt).format('l') : moment(chat?.createdAt).format('l')}

                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground truncate">
                            {debouncedSearchQuery ? highlightText(getLastMessagePreview(chat), debouncedSearchQuery) : getLastMessagePreview(chat)}
                          </p>
                          <div className="flex items-center space-x-1">
                            {/* Unread message count - hide for currently selected chat to prevent flicker */}
                            {chat.unreadCount && chat.unreadCount > 0 && selectedChatId !== chat.id && (
                              <Badge variant="destructive" className="text-xs min-w-[20px] rounded-full px-1.5">
                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                              </Badge>
                            )}
                            {/* Role badge for group chats */}
                            {chat.type === 'group' && (chat.role === 'owner' || chat.isOwner) && (
                              <Badge className="text-xs rounded-full">
                                Owner
                              </Badge>
                            )}
                            {chat.type === 'group' && chat.role === 'admin' && (
                              <Badge className="text-xs rounded-full">
                                Admin
                              </Badge>
                            )}
                            {chat.type === 'group' && chat.isAdmin && !chat.role && (
                              <Badge className="text-xs rounded-full">
                                Admin
                              </Badge>
                            )}
                            {/* {getChatIcon(chat)} */}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AnimatedListItem>
                ))}
              </div>
            </>
          )}
        </div>
      )}


    </div>
  );
}
