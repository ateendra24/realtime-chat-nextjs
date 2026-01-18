import { useState, useEffect, useRef } from 'react';
import { useRealtime } from "@/hooks/useRealtime";
import { useUser } from "@clerk/nextjs";
import type { Message, Chat, TypingEvent } from '@/types/global';
import { toast } from 'sonner';

export function useChatLogic() {
    const { client: realtimeClient } = useRealtime();
    const { user, isSignedIn, isLoaded } = useUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [chatListRefresh, setChatListRefresh] = useState(0);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    // const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isUpdatingReactionsRef = useRef(false);

    // Typing state
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Message cache: Map<chatId, {messages, cursor, hasMore, timestamp}>
    const messagesCacheRef = useRef<Map<string, {
        messages: Message[];
        nextCursor: string | null;
        hasMoreMessages: boolean;
        timestamp: number;
    }>>(new Map());

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(0);

    // Edit message state
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);

    // --- Web Notifications Support ---
    useEffect(() => {
        // Request permission on mount if default
        if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(console.error);
        }
    }, []);

    const showMessageNotification = (msg: Message) => {
        if (typeof window === 'undefined' || !("Notification" in window)) return;
        if (msg.userId === user?.id) return; // Don't notify own messages

        const triggerNotification = () => {
            try {
                const body = msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
                const title = `New message from ${msg.user}`;

                const notification = new Notification(title, {
                    body: body,
                    icon: msg.avatarUrl || '/logo.png',
                    tag: `msg-${msg.id}`,
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            } catch (error) {
                console.error("Error showing notification:", error);
            }
        };

        const isChatOpen = selectedChatRef.current?.id === msg.chatId;
        const isFocused = document.visibilityState === 'visible' && document.hasFocus();

        if (Notification.permission === "granted") {
            if (isChatOpen && isFocused) {
                return;
            }
            triggerNotification();
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    triggerNotification();
                }
            });
        }
    };
    // ---------------------------------

    // Perform local search when query or messages change
    useEffect(() => {
        if (searchQuery) {
            const results = messages.filter(
                (message) =>
                    !message.isDeleted &&
                    message.content.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(results);
            setCurrentSearchResultIndex(0);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, messages]);

    const handleNextSearchResult = () => {
        if (searchResults.length > 0) {
            setCurrentSearchResultIndex((prevIndex) => (prevIndex + 1) % searchResults.length);
        }
    };

    const handlePrevSearchResult = () => {
        if (searchResults.length > 0) {
            setCurrentSearchResultIndex((prevIndex) => (prevIndex - 1 + searchResults.length) % searchResults.length);
        }
    };

    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Function to scroll to bottom with optional smooth behavior
    const scrollToBottom = (smooth = false) => {
        if (messagesEndRef.current) {
            const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current;
            if (scrollContainer) {
                // Directly scroll to max height for consistent behavior
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }
        }
    };

    // Track previous messages and chat to detect changes
    const prevChatIdRef = useRef<string | null>(null);

    // Separate effect for chat changes (instant scroll to bottom, no animation)
    useEffect(() => {
        if (selectedChat) {
            const chatChanged = prevChatIdRef.current !== selectedChat.id;
            if (chatChanged) {
                prevChatIdRef.current = selectedChat.id;
                setIsInitialLoad(true); // Set initial load flag for new chat

                // Clear typing state
                setTypingUsers(new Set());
                typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
                typingTimeoutsRef.current.clear();
            }
        }
    }, [selectedChat]);

    // Track selected chat for callbacks to avoid stale closures
    const selectedChatRef = useRef<Chat | null>(null);
    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    // Real-time message listener
    useEffect(() => {
        if (!realtimeClient) return;

        realtimeClient.onMessage((msg: Message) => {
            const currentChat = selectedChatRef.current;

            // Handle message deletion (should update for everyone, including the author)
            if (msg.isDeleted) {
                // Update for currently selected chat
                if (currentChat && msg.chatId === currentChat.id) {
                    setMessages((prev) => {
                        const updatedMessages = prev.map(existingMsg =>
                            existingMsg.id === msg.id
                                ? { ...existingMsg, isDeleted: true, content: msg.content, reactions: [] }
                                : existingMsg
                        );

                        // Update cache
                        const cached = messagesCacheRef.current.get(currentChat.id);
                        if (cached) {
                            messagesCacheRef.current.set(currentChat.id, {
                                ...cached,
                                messages: updatedMessages,
                                timestamp: Date.now()
                            });
                        }

                        return updatedMessages;
                    });
                }
                // Update cache for other chats
                else if (msg.chatId) {
                    const cached = messagesCacheRef.current.get(msg.chatId);
                    if (cached) {
                        const updatedMessages = cached.messages.map(existingMsg =>
                            existingMsg.id === msg.id
                                ? { ...existingMsg, isDeleted: true, content: msg.content, reactions: [] }
                                : existingMsg
                        );
                        messagesCacheRef.current.set(msg.chatId, {
                            ...cached,
                            messages: updatedMessages,
                            timestamp: Date.now()
                        });
                    }
                }
                return; // Don't process as new message
            }

            // Handle message EDIT (should update for everyone, including the author)
            if (msg.isEdited && !msg.isDeleted) {
                // Update for currently selected chat
                if (currentChat && msg.chatId === currentChat.id) {
                    setMessages((prev) => {
                        // Check if message exists in current state
                        const messageExists = prev.some(existingMsg => existingMsg.id === msg.id);
                        if (!messageExists) return prev;

                        const updatedMessages = prev.map(existingMsg =>
                            existingMsg.id === msg.id
                                ? { ...existingMsg, content: msg.content, isEdited: true }
                                : existingMsg
                        );

                        // Update cache
                        const cached = messagesCacheRef.current.get(currentChat.id);
                        if (cached) {
                            messagesCacheRef.current.set(currentChat.id, {
                                ...cached,
                                messages: updatedMessages,
                                timestamp: Date.now()
                            });
                        }

                        return updatedMessages;
                    });
                }
                // Update cache for other chats
                else if (msg.chatId) {
                    const cached = messagesCacheRef.current.get(msg.chatId);
                    if (cached) {
                        const messageExists = cached.messages.some(existingMsg => existingMsg.id === msg.id);
                        if (messageExists) {
                            const updatedMessages = cached.messages.map(existingMsg =>
                                existingMsg.id === msg.id
                                    ? { ...existingMsg, content: msg.content, isEdited: true }
                                    : existingMsg
                            );
                            messagesCacheRef.current.set(msg.chatId, {
                                ...cached,
                                messages: updatedMessages,
                                timestamp: Date.now()
                            });
                        }
                    }
                }
                return; // Don't process as new message
            }

            // Handle NEW messages for the currently selected chat (from other users only)
            if (currentChat && msg.chatId === currentChat.id && user && msg.userId !== user.id) {
                showMessageNotification(msg); // Show notification
                setMessages((prev) => {
                    // Check if message already exists to prevent duplicates
                    const messageExists = prev.some(existingMsg => existingMsg.id === msg.id);
                    if (messageExists) {
                        return prev;
                    }
                    const updatedMessages = [...prev, msg];

                    // Update cache with new message
                    const cached = messagesCacheRef.current.get(currentChat.id);
                    if (cached) {
                        messagesCacheRef.current.set(currentChat.id, {
                            ...cached,
                            messages: updatedMessages,
                            timestamp: Date.now()
                        });
                    }

                    return updatedMessages;
                });

                // Smooth scroll for incoming messages from others with proper delay
                setTimeout(() => scrollToBottom(true), 100);

                // Mark the message as read since user is viewing this chat
                markLastMessageAsRead(currentChat.id, msg.id);
            }
            // Handle messages for OTHER chats (not currently selected) - update their cache
            else if (msg.chatId && msg.chatId !== currentChat?.id) {
                // Show notification for other chats if it's not from current user
                if (user && msg.userId !== user.id) {
                    showMessageNotification(msg);
                }

                const cached = messagesCacheRef.current.get(msg.chatId);
                if (cached) {
                    // Check if message already exists in cache
                    const messageExists = cached.messages.some(existingMsg => existingMsg.id === msg.id);
                    if (!messageExists) {
                        // Add new message to cached messages
                        const updatedMessages = [...cached.messages, msg];
                        messagesCacheRef.current.set(msg.chatId, {
                            ...cached,
                            messages: updatedMessages,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        });

        // Listen for real-time reaction updates
        realtimeClient.onReactionUpdate((data: {
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
        }) => {
            const currentChat = selectedChatRef.current;

            // Only update if it's for the current chat and not from the current user
            if (currentChat && data.chatId === currentChat.id && user && data.userId !== user.id) {
                isUpdatingReactionsRef.current = true;
                setMessages(prev => prev.map(msg => {
                    if (msg.id === data.messageId) {
                        const existingReactions = msg.reactions || [];
                        const reactionIndex = existingReactions.findIndex(r => r && r.emoji === data.emoji);

                        if (data.reaction === null) {
                            // Remove reaction completely
                            const updatedReactions = existingReactions.filter(r => r && r.emoji !== data.emoji);
                            return { ...msg, reactions: updatedReactions };
                        } else if (reactionIndex >= 0) {
                            // Update existing reaction
                            const updatedReactions = [...existingReactions];
                            if (data.reaction) {
                                // Update hasReacted based on current user
                                const hasReacted = data.reaction.userIds?.includes(user.id) || false;
                                updatedReactions[reactionIndex] = { ...data.reaction, hasReacted };
                            }
                            return { ...msg, reactions: updatedReactions };
                        } else {
                            // Add new reaction
                            if (data.reaction) {
                                const hasReacted = data.reaction.userIds?.includes(user.id) || false;
                                return {
                                    ...msg,
                                    reactions: [...existingReactions, { ...data.reaction, hasReacted }]
                                };
                            }
                        }
                    }
                    return msg;
                }));
            }
        });

        // Listen for typing events
        realtimeClient.onTyping((data: TypingEvent) => {
            const currentChat = selectedChatRef.current;
            if (currentChat && data.chatId === currentChat.id && user && data.userId !== user.id) {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    if (data.isTyping) {
                        newSet.add(data.userId);

                        // Clear existing timeout
                        if (typingTimeoutsRef.current.has(data.userId)) {
                            clearTimeout(typingTimeoutsRef.current.get(data.userId)!);
                        }

                        // Set new timeout to clear typing status
                        const timeout = setTimeout(() => {
                            setTypingUsers(current => {
                                const updated = new Set(current);
                                updated.delete(data.userId);
                                return updated;
                            });
                            typingTimeoutsRef.current.delete(data.userId);
                        }, 3000); // 3 seconds grace period

                        typingTimeoutsRef.current.set(data.userId, timeout);
                    } else {
                        newSet.delete(data.userId);
                        if (typingTimeoutsRef.current.has(data.userId)) {
                            clearTimeout(typingTimeoutsRef.current.get(data.userId)!);
                            typingTimeoutsRef.current.delete(data.userId);
                        }
                    }
                    return newSet;
                });
            }
        });

        return () => {
            realtimeClient.cleanup();
        };
    }, [realtimeClient, user]); // Removed selectedChat dependency

    // Sync user data to database when signing in
    useEffect(() => {
        const syncUser = async () => {
            if (user && isSignedIn) {
                try {
                    await fetch("/api/users/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            id: user.id,
                            username: user.username || user.fullName?.replace(/\s+/g, '').toLowerCase() || 'user',
                            email: user.emailAddresses[0]?.emailAddress,
                            fullName: user.fullName,
                            avatarUrl: user.imageUrl,
                        }),
                    });
                } catch (error) {
                    console.error("Error syncing user:", error);
                }
            }
        };

        syncUser();
    }, [user, isSignedIn]);

    // Join all user chats when real-time client connects
    useEffect(() => {
        const joinAllChats = async () => {
            if (!realtimeClient || !user) return;

            try {
                // Fetch user's chats to join all chat rooms
                const response = await fetch("/api/chats");
                if (response.ok) {
                    const data = await response.json();
                    const userChats = data.chats || [];

                    // Join all chat rooms
                    userChats.forEach((chat: Chat) => {
                        realtimeClient.joinChat(chat.id);
                    });
                }
            } catch (error) {
                console.error("Error joining user chats:", error);
            }
        };

        joinAllChats();
    }, [realtimeClient, user]);

    // Manage chat room joining/leaving
    useEffect(() => {
        if (!realtimeClient || !selectedChat) return;

        realtimeClient.joinChat(selectedChat.id);

        return () => {
            realtimeClient.leaveChat(selectedChat.id);
        };
    }, [realtimeClient, selectedChat]);

    const sendMessage = async () => {
        if (input.trim() && user) {
            const chatId = selectedChat?.id;

            if (!chatId) {
                alert("Please select a chat or create a group to send messages");
                return;
            }

            const messageContent = input.trim();
            const tempId = `temp_${Date.now()}_${Math.random()}`;

            // Create optimistic message to show immediately
            const optimisticMessage: Message = {
                id: tempId,
                user: user.fullName || user.username || "Anonymous",
                userId: user.id,
                content: messageContent,
                createdAt: new Date(),
                chatId: chatId,
                avatarUrl: user.imageUrl,
                isOptimistic: true, // Flag to identify optimistic messages
            };

            // Clear input and show message immediately
            setInput("");
            setMessages((prev) => {
                const updatedMessages = [...prev, optimisticMessage];

                // Update cache with optimistic message
                const cached = messagesCacheRef.current.get(chatId);
                if (cached) {
                    messagesCacheRef.current.set(chatId, {
                        ...cached,
                        messages: updatedMessages,
                        timestamp: Date.now()
                    });
                }

                return updatedMessages;
            });

            // Scroll to bottom smoothly for the sender's message
            setTimeout(() => scrollToBottom(true));

            try {
                const response = await fetch(`/api/chats/${chatId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content: messageContent,
                    }),
                });

                if (response.ok) {
                    const result = await response.json();

                    // Replace optimistic message with real message
                    setMessages((prev) => {
                        const updatedMessages = prev.map(prevMsg =>
                            prevMsg.id === tempId
                                ? {
                                    ...prevMsg,
                                    id: result.message.id, // Use real ID from server
                                    createdAt: new Date(result.message.createdAt),
                                    isOptimistic: false, // Remove optimistic flag
                                }
                                : prevMsg
                        );

                        // Update cache with confirmed message
                        const cached = messagesCacheRef.current.get(chatId);
                        if (cached) {
                            messagesCacheRef.current.set(chatId, {
                                ...cached,
                                messages: updatedMessages,
                                timestamp: Date.now()
                            });
                        }

                        return updatedMessages;
                    });

                    // Mark the message as read for the sender (don't await to keep it fast)
                    markLastMessageAsRead(chatId, result.message.id).catch(console.error);

                    // Trigger chat list refresh (don't await to keep it fast)
                    setChatListRefresh(prev => prev + 1);
                } else {
                    const errorText = await response.text();
                    console.error('Error saving message to database:', response.status, errorText);

                    // Replace optimistic message with error state
                    setMessages((prev) => prev.map(prevMsg =>
                        prevMsg.id === tempId
                            ? { ...prevMsg, isOptimistic: false, content: `❌ ${messageContent}` }
                            : prevMsg
                    ));
                }
            } catch (error) {
                console.error("Error saving message:", error);

                // Replace optimistic message with error state
                setMessages((prev) => prev.map(prevMsg =>
                    prevMsg.id === tempId
                        ? { ...prevMsg, isOptimistic: false, content: `❌ ${messageContent}` }
                        : prevMsg
                ));
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    };

    const handleChatSelect = async (chat: Chat) => {
        // Early UI update for instant feedback
        setShowCreateGroup(false);
        setSelectedChat(chat);

        // Check if we have cached messages for this chat
        const cached = messagesCacheRef.current.get(chat.id);
        // const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
        // const isCacheValid = cached && (Date.now() - cached.timestamp) < CACHE_DURATION;

        // STALE-WHILE-REVALIDATE: Show cached messages immediately if available
        if (cached) {
            // Always show cached data immediately (even if it might be slightly stale)
            setMessages(cached.messages);
            setHasMoreMessages(cached.hasMoreMessages);
            setNextCursor(cached.nextCursor);
            setMessagesLoading(false);

            // Scroll to bottom immediately with cached data
            requestAnimationFrame(() => {
                scrollToBottom(false);
                setIsInitialLoad(false);
            });

            // Mark last message as read (non-blocking)
            if (cached.messages.length > 0) {
                const lastMessage = cached.messages[cached.messages.length - 1];
                markLastMessageAsRead(chat.id, lastMessage.id).catch(console.error);
            }
        } else {
            // No cache - show loading state
            setMessages([]);
            setMessagesLoading(true);
        }

        // Reset pagination state
        setHasMoreMessages(false);
        setNextCursor(null);
        setLoadingMoreMessages(false);
        // setIsLoadingOlderMessages(false);

        if (chat.id) {
            try {
                // Fetch fresh data in background (always, even if cache exists)
                const fetchPromises = [
                    fetch(`/api/chats/${chat.id}/messages?limit=30`, {
                        signal: AbortSignal.timeout(10000), // 10 second timeout
                    })
                ];

                // Add members fetch for group chats
                let membersPromise: Promise<Response> | null = null;
                if (chat.type === 'group') {
                    membersPromise = fetch(`/api/groups/${chat.id}/members`);
                    fetchPromises.push(membersPromise);
                }

                // Execute all fetches in parallel
                const results = await Promise.all(fetchPromises);
                const response = results[0];

                // Handle members data if it's a group chat
                if (chat.type === 'group' && results[1]) {
                    const membersResponse = results[1];
                    if (membersResponse.ok) {
                        const membersData = await membersResponse.json();
                        setSelectedChat({
                            ...chat,
                            members: membersData.members,
                            memberCount: membersData.members?.length || membersData.memberCount
                        });
                    }
                }

                if (response.ok) {
                    const result = await response.json();
                    let freshMessages: Message[] = [];
                    let freshHasMore = false;
                    let freshCursor: string | null = null;

                    // Handle both old format (array) and new format (object with pagination)
                    if (Array.isArray(result)) {
                        freshMessages = result;
                        freshHasMore = false;
                        freshCursor = null;
                    } else {
                        freshMessages = result.messages || [];
                        freshHasMore = result.hasMoreMessages || false;
                        freshCursor = result.nextCursor || null;
                    }

                    // If we showed cached data, merge it intelligently with fresh data
                    let finalMessages = freshMessages;
                    if (cached && cached.messages.length > 0) {
                        // Check if cached data has newer messages than server response
                        const cachedNewestMsg = cached.messages[cached.messages.length - 1];
                        const freshNewestMsg = freshMessages[freshMessages.length - 1];

                        if (cachedNewestMsg && freshNewestMsg) {
                            const cachedTime = new Date(cachedNewestMsg.createdAt).getTime();
                            const freshTime = new Date(freshNewestMsg.createdAt).getTime();

                            // If cache has newer messages (from real-time), append them to fresh data
                            if (cachedTime > freshTime) {
                                // Find messages in cache that are newer than the freshest server message
                                const newerMessages = cached.messages.filter(msg => {
                                    const msgTime = new Date(msg.createdAt).getTime();
                                    return msgTime > freshTime && !freshMessages.some(fm => fm.id === msg.id);
                                });

                                if (newerMessages.length > 0) {
                                    finalMessages = [...freshMessages, ...newerMessages];
                                }
                            }
                        }
                    }

                    // Update cache with merged data
                    messagesCacheRef.current.set(chat.id, {
                        messages: finalMessages,
                        nextCursor: freshCursor,
                        hasMoreMessages: freshHasMore,
                        timestamp: Date.now()
                    });

                    // Update state with final merged data
                    setMessages(finalMessages);
                    setHasMoreMessages(freshHasMore);
                    setNextCursor(freshCursor);

                    // Only scroll and mark as read if we didn't show cached data
                    if (!cached) {
                        requestAnimationFrame(() => {
                            scrollToBottom(false);
                            setIsInitialLoad(false);
                        });

                        // Mark messages as read if there are messages (non-blocking)
                        if (finalMessages.length > 0) {
                            const lastMessage = finalMessages[finalMessages.length - 1];
                            markLastMessageAsRead(chat.id, lastMessage.id).catch(console.error);
                        }
                    } else {
                        // If cache was shown, check if we have new messages to mark as read
                        if (finalMessages.length > 0) {
                            const lastMessage = finalMessages[finalMessages.length - 1];
                            const cachedLastMessage = cached.messages[cached.messages.length - 1];
                            if (!cachedLastMessage || lastMessage.id !== cachedLastMessage.id) {
                                // New messages arrived, mark as read
                                markLastMessageAsRead(chat.id, lastMessage.id).catch(console.error);
                            }
                        }
                    }
                } else {
                    console.error("Failed to load messages:", response.statusText);
                }
            } catch (error) {
                console.error("Error loading messages:", error);
            } finally {
                // Only set loading to false if we didn't show cached data
                if (!cached) {
                    setMessagesLoading(false);
                }
            }
        } else {
            setMessagesLoading(false);
            setIsInitialLoad(false);
        }
    };

    const markLastMessageAsRead = async (chatId: string, messageId: string) => {
        try {
            await fetch(`/api/chats/${chatId}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId }),
            });
            // Refresh chat list to update unread counts
            setChatListRefresh(prev => prev + 1);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const loadMoreMessages = async () => {
        if (!selectedChat?.id || !nextCursor || loadingMoreMessages) {
            return;
        }

        setLoadingMoreMessages(true);
        // setIsLoadingOlderMessages(true);

        // Get the scroll container (it might be a child of scrollAreaRef)
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current;

        if (!scrollContainer) {
            setLoadingMoreMessages(false);
            // setIsLoadingOlderMessages(false);
            return;
        }

        // Store current scroll info
        const beforeScrollHeight = scrollContainer.scrollHeight;
        const beforeScrollTop = scrollContainer.scrollTop;

        try {
            const response = await fetch(`/api/chats/${selectedChat.id}/messages?limit=30&before=${nextCursor}`, {
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });
            if (response.ok) {
                const result = await response.json();

                if (Array.isArray(result)) {
                    setMessages(prev => [...result, ...prev]);
                    setHasMoreMessages(false);
                    setNextCursor(null);
                } else {
                    const newMessages = result.messages || [];
                    setMessages(prev => [...newMessages, ...prev]);
                    setHasMoreMessages(result.hasMoreMessages || false);
                    setNextCursor(result.nextCursor || null);
                }

                // Use multiple animation frames to ensure DOM is fully updated
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const afterScrollHeight = scrollContainer.scrollHeight;
                        const heightDifference = afterScrollHeight - beforeScrollHeight;
                        const newScrollTop = beforeScrollTop + heightDifference;

                        scrollContainer.scrollTop = newScrollTop;

                        // Verify the scroll position was set correctly
                        setTimeout(() => {
                            // setIsLoadingOlderMessages(false);
                        }, 100);
                    });
                });

            } else {
                console.error("Failed to load more messages:", response.statusText);
                // setIsLoadingOlderMessages(false);
            }
        } catch (error) {
            console.error("Error loading more messages:", error);
            // setIsLoadingOlderMessages(false);
        } finally {
            setLoadingMoreMessages(false);
        }
    };

    const handleGroupCreated = (group: Chat) => {
        setSelectedChat(group);
        setChatListRefresh(prev => prev + 1);
    };

    const handleDirectChat = async (user: {
        id: string;
        username: string;
        fullName?: string;
        email: string;
        avatarUrl?: string;
    }) => {
        try {
            const response = await fetch("/api/chats/direct", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ participantId: user.id }),
            });

            if (response.ok) {
                const data = await response.json();
                // Use handleChatSelect to properly load messages and set up the chat
                await handleChatSelect(data.chat);
                setChatListRefresh(prev => prev + 1);
            }
        } catch (error) {
            console.error("Error creating direct chat:", error);
        }
    };

    // New feature handlers
    const handleReaction = async (messageId: string, emoji: string) => {
        try {
            const response = await fetch(`/api/messages/${messageId}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji }),
            });

            if (response.ok) {
                // Update the message with new reaction data
                const updatedReaction = await response.json();

                // Real-time updates are handled by the API route
                // No need to emit here as the API already does it

                isUpdatingReactionsRef.current = true;
                setMessages(prev => prev.map(msg => {
                    if (msg.id === messageId) {
                        const existingReactions = msg.reactions || [];
                        const reactionIndex = existingReactions.findIndex(r => r && r.emoji === emoji);

                        if (updatedReaction.reaction === null) {
                            // Remove reaction completely
                            const updatedReactions = existingReactions.filter(r => r && r.emoji !== emoji);
                            return { ...msg, reactions: updatedReactions };
                        } else if (reactionIndex >= 0) {
                            // Update existing reaction
                            const updatedReactions = [...existingReactions];
                            if (updatedReaction.reaction) {
                                updatedReactions[reactionIndex] = updatedReaction.reaction;
                            }
                            return { ...msg, reactions: updatedReactions };
                        } else {
                            // Add new reaction
                            if (updatedReaction.reaction) {
                                return { ...msg, reactions: [...existingReactions, updatedReaction.reaction] };
                            }
                        }
                    }
                    return msg;
                }));
            }
        } catch (error) {
            console.error('Error adding reaction:', error);
        }
    };

    const handleEditMessage = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        // Check if message is within 30 minutes of sending
        const thirtyMinutesInMs = 30 * 60 * 1000;
        const messageAge = Date.now() - new Date(message.createdAt).getTime();

        if (messageAge > thirtyMinutesInMs) {
            toast.error('Cannot edit messages older than 30 minutes');
            return;
        }

        // Check if user owns the message
        if (message.userId !== user?.id) {
            toast.error('You can only edit your own messages');
            return;
        }

        setEditingMessage(message);
        setInput(message.content);
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Update the message to show as deleted
                setMessages(prev => {
                    const updatedMessages = prev.map(msg =>
                        msg.id === messageId
                            ? { ...msg, isDeleted: true, content: 'This message was deleted' }
                            : msg
                    );

                    // Update cache with deleted message
                    if (selectedChat?.id) {
                        const cached = messagesCacheRef.current.get(selectedChat.id);
                        if (cached) {
                            messagesCacheRef.current.set(selectedChat.id, {
                                ...cached,
                                messages: updatedMessages,
                                timestamp: Date.now()
                            });
                        }
                    }

                    return updatedMessages;
                });
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingMessage || !input.trim()) return;

        try {
            const updatedContent = input.trim();
            const messageId = editingMessage.id;

            // Optimistically update UI
            setMessages(prev => {
                const updatedMessages = prev.map(msg =>
                    msg.id === messageId
                        ? { ...msg, content: updatedContent, isEdited: true }
                        : msg
                );

                // Update cache with edited message
                if (selectedChat?.id) {
                    const cached = messagesCacheRef.current.get(selectedChat.id);
                    if (cached) {
                        messagesCacheRef.current.set(selectedChat.id, {
                            ...cached,
                            messages: updatedMessages,
                            timestamp: Date.now()
                        });
                    }
                }

                return updatedMessages;
            });

            const res = await fetch(`/api/messages/${messageId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: updatedContent }),
            });

            if (!res.ok) {
                throw new Error('Failed to edit message');
            }

            // Clear editing state
            setEditingMessage(null);
            setInput('');

            // Update chat list
            setChatListRefresh(prev => prev + 1);
        } catch (error) {
            console.error('Error editing message:', error);
            // Revert optimistic update
            if (editingMessage) {
                setMessages(prev => prev.map(msg =>
                    msg.id === editingMessage.id ? editingMessage : msg
                ));
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setInput('');
    };

    // Group management functions
    const handleLeaveGroup = async (groupId: string) => {
        try {
            const response = await fetch(`/api/groups/${groupId}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Clear selected chat if leaving current chat
                if (selectedChat?.id === groupId) {
                    setSelectedChat(null);
                    setMessages([]);
                }
                // Refresh chat list
                setChatListRefresh(prev => prev + 1);

                // Real-time updates are handled by the API route
                // No need to emit here
            } else {
                console.error("Failed to leave group:", response.statusText);
            }
        } catch (error) {
            console.error("Error leaving group:", error);
        }
    };

    const handleUpdateGroup = async (groupId: string, updates: { name?: string; description?: string; avatarUrl?: string | null }) => {
        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (response.ok) {
                const updatedGroup = await response.json();

                // Update selected chat if it's the current chat
                if (selectedChat?.id === groupId) {
                    setSelectedChat(updatedGroup);
                }

                // Refresh chat list
                setChatListRefresh(prev => prev + 1);

                // Real-time updates are handled by the API route
                // No need to emit here
            } else {
                console.error("Failed to update group:", response.statusText);
            }
        } catch (error) {
            console.error("Error updating group:", error);
        }
    };

    const handleRemoveMember = async (groupId: string, memberId: string) => {
        try {
            const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Refresh chat list and current chat if needed
                setChatListRefresh(prev => prev + 1);

                // Real-time updates are handled by the API route
                // No need to emit here
            } else {
                console.error("Failed to remove member:", response.statusText);
            }
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    const refreshMembers = async () => {
        if (!selectedChat || selectedChat.type !== 'group' || !selectedChat.id) {
            return;
        }

        try {
            const membersResponse = await fetch(`/api/groups/${selectedChat.id}/members`);
            if (membersResponse.ok) {
                const membersData = await membersResponse.json();

                // Update the selected chat with new members data
                setSelectedChat(prev => prev ? {
                    ...prev,
                    members: membersData.members,
                    memberCount: membersData.members?.length || membersData.memberCount
                } : null);
            } else {
                console.error("Failed to refresh group members:", membersResponse.statusText);
            }
        } catch (error) {
            console.error("Error refreshing group members:", error);
        }
    };

    const addImageMessage = (imageMessage: Message) => {
        // Add the image message to local state for optimistic update
        setMessages((prev) => {
            const updatedMessages = [...prev, imageMessage];

            // Update cache with image message
            if (selectedChat?.id) {
                const cached = messagesCacheRef.current.get(selectedChat.id);
                if (cached) {
                    messagesCacheRef.current.set(selectedChat.id, {
                        ...cached,
                        messages: updatedMessages,
                        timestamp: Date.now()
                    });
                }
            }

            return updatedMessages;
        });

        // Scroll to bottom
        setTimeout(() => {
            scrollToBottom();
        }, 100);

        // Update chat list to show new message
        setChatListRefresh(prev => prev + 1);
    };

    // Function to send typing status
    const handleTyping = (isTyping: boolean) => {
        if (selectedChat && user && realtimeClient) {
            realtimeClient.sendTyping(selectedChat.id, user.id, isTyping);
        }
    };

    return {
        // State
        messages,
        input,
        setInput,
        selectedChat,
        setSelectedChat,
        showCreateGroup,
        setShowCreateGroup,
        showUserSearch,
        setShowUserSearch,
        chatListRefresh,
        messagesLoading,
        hasMoreMessages,
        loadingMoreMessages,
        scrollAreaRef,
        messagesEndRef,
        user,
        isSignedIn,
        isLoaded,
        isInitialLoad,
        typingUsers,
        editingMessage,

        // Functions
        sendMessage,
        handleKeyPress,
        handleChatSelect,
        loadMoreMessages,
        handleGroupCreated,
        handleDirectChat,
        handleLeaveGroup,
        handleUpdateGroup,
        handleRemoveMember,
        refreshMembers,
        handleReaction,
        handleEditMessage,
        handleDeleteMessage,
        handleSaveEdit,
        handleCancelEdit,
        addImageMessage,
        handleTyping,
        // Search
        searchQuery,
        setSearchQuery,
        searchResults,
        currentSearchResultIndex,
        handleNextSearchResult,
        handlePrevSearchResult,
    };
}
