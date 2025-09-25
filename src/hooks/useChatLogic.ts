import { useState, useEffect, useRef } from 'react';
import { useRealtime } from "@/hooks/useRealtime";
import { useUser } from "@clerk/nextjs";

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
    isOptimistic?: boolean; // For optimistic UI updates
    reactions?: Array<{
        id: string;
        emoji: string;
        count: number;
        userIds: string[];
        hasReacted: boolean;
    }>;
}

interface GroupMember {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    isAdmin?: boolean;
    role?: 'owner' | 'admin' | 'member';
    isOwner?: boolean;
    isOnline?: boolean;
    joinedAt?: string;
}

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
    isOnline?: boolean;
    unreadCount?: number;
    members?: GroupMember[];
    memberCount?: number;
}

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
    const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef<number>(0);
    const isUpdatingReactionsRef = useRef(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(0);

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

    // Function to scroll to bottom
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView();
        }
    };

    // Auto-scroll to bottom when NEW messages are added (not when loading older ones or updating reactions)
    useEffect(() => {
        if (!isLoadingOlderMessages && !isUpdatingReactionsRef.current) {
            // Small delay to ensure DOM is updated
            setTimeout(scrollToBottom, 10);
        }
        // Reset the reaction flag after processing
        isUpdatingReactionsRef.current = false;
    }, [messages]);

    // Separate effect for chat changes (always scroll to bottom)
    useEffect(() => {
        if (selectedChat && !isLoadingOlderMessages) {
            setTimeout(scrollToBottom, 50);
        }
    }, [selectedChat]);

    // Real-time message listener
    useEffect(() => {
        if (!realtimeClient) return;

        realtimeClient.onMessage((msg: Message) => {
            console.log("useChatLogic received message:", msg);
            console.log("Current user ID:", user?.id);
            console.log("Message sender ID:", msg.userId);
            console.log("Selected chat ID:", selectedChat?.id);
            console.log("Message chat ID:", msg.chatId);

            // Only show messages from other users (not the current user)
            // The current user's messages are already added optimistically when sending
            if (selectedChat && msg.chatId === selectedChat.id && user && msg.userId !== user.id) {
                console.log("Adding message from other user to current chat");
                setMessages((prev) => {
                    // Check if message already exists to prevent duplicates
                    const messageExists = prev.some(existingMsg => existingMsg.id === msg.id);
                    if (messageExists) {
                        console.log("Message already exists, skipping duplicate");
                        return prev;
                    }

                    console.log("Adding new message from other user:", msg);
                    const newMessages = [...prev, msg];
                    scrollToBottom(); // Remove setTimeout delay for immediate scrolling
                    return newMessages;
                });

                // Mark the message as read since user is viewing this chat
                markLastMessageAsRead(selectedChat.id, msg.id);
            } else {
                console.log("Message not for current chat, from current user, or no chat selected");
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
            console.log('Received reaction update:', data);

            // Only update if it's for the current chat and not from the current user
            if (selectedChat && data.chatId === selectedChat.id && user && data.userId !== user.id) {
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

        return () => {
            realtimeClient.cleanup();
        };
    }, [realtimeClient, user, selectedChat]);

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
                        console.log(`Requested to join chat room: ${chat.id}`);
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

        console.log(`Requesting to join chat room: ${selectedChat.id}`);
        realtimeClient.joinChat(selectedChat.id);

        return () => {
            console.log(`Requesting to leave chat room: ${selectedChat.id}`);
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
            setMessages((prev) => [...prev, optimisticMessage]);

            // Scroll to bottom immediately for the sender's message
            setTimeout(scrollToBottom, 0);

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
                    console.log('Message saved successfully:', result);

                    // Replace optimistic message with real message
                    setMessages((prev) => prev.map(prevMsg =>
                        prevMsg.id === tempId
                            ? {
                                ...prevMsg,
                                id: result.message.id, // Use real ID from server
                                createdAt: new Date(result.message.createdAt),
                                isOptimistic: false, // Remove optimistic flag
                            }
                            : prevMsg
                    ));

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
        setMessages([]);
        setShowCreateGroup(false);
        setMessagesLoading(true);
        // Reset pagination state
        setHasMoreMessages(false);
        setNextCursor(null);
        setLoadingMoreMessages(false);
        setIsLoadingOlderMessages(false);

        // For group chats, fetch members data first
        let chatWithMembers = chat;
        if (chat.type === 'group' && chat.id) {
            try {
                console.log('Fetching members for group:', chat.id);
                const membersResponse = await fetch(`/api/groups/${chat.id}/members`);
                if (membersResponse.ok) {
                    const membersData = await membersResponse.json();
                    console.log('Members data received:', membersData);
                    chatWithMembers = {
                        ...chat,
                        members: membersData.members,
                        memberCount: membersData.members?.length || membersData.memberCount
                    };
                } else {
                    console.error("Failed to load group members:", membersResponse.statusText);
                }
            } catch (membersError) {
                console.error("Error loading group members:", membersError);
            }
        }

        // Set the chat with members data
        setSelectedChat(chatWithMembers);

        if (chat.id) {
            try {
                // Fetch messages
                const response = await fetch(`/api/chats/${chat.id}/messages?limit=50`);
                if (response.ok) {
                    const result = await response.json();
                    // Handle both old format (array) and new format (object with pagination)
                    if (Array.isArray(result)) {
                        setMessages(result);
                        setHasMoreMessages(false);
                        setNextCursor(null);
                    } else {
                        setMessages(result.messages || []);
                        setHasMoreMessages(result.hasMoreMessages || false);
                        setNextCursor(result.nextCursor || null);
                    }
                    setMessagesLoading(false);
                    scrollToBottom();

                    // Mark messages as read if there are messages
                    const messageArray = Array.isArray(result) ? result : result.messages || [];
                    if (messageArray.length > 0) {
                        const lastMessage = messageArray[messageArray.length - 1];
                        await markLastMessageAsRead(chat.id, lastMessage.id);
                    }
                } else {
                    console.error("Failed to load messages:", response.statusText);
                    setMessagesLoading(false);
                }
            } catch (error) {
                console.error("Error loading messages:", error);
                setMessagesLoading(false);
            }
        } else {
            setMessagesLoading(false);
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

        console.log('Loading more messages...');
        setLoadingMoreMessages(true);
        setIsLoadingOlderMessages(true);

        // Get the scroll container (it might be a child of scrollAreaRef)
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current;

        if (!scrollContainer) {
            console.warn('Scroll container not found');
            setLoadingMoreMessages(false);
            setIsLoadingOlderMessages(false);
            return;
        }

        // Store current scroll info
        const beforeScrollHeight = scrollContainer.scrollHeight;
        const beforeScrollTop = scrollContainer.scrollTop;

        console.log('Before load - ScrollTop:', beforeScrollTop, 'ScrollHeight:', beforeScrollHeight);

        try {
            const response = await fetch(`/api/chats/${selectedChat.id}/messages?limit=50&before=${nextCursor}`);
            if (response.ok) {
                const result = await response.json();

                if (Array.isArray(result)) {
                    setMessages(prev => [...result, ...prev]);
                    setHasMoreMessages(false);
                    setNextCursor(null);
                } else {
                    const newMessages = result.messages || [];
                    console.log('Loaded', newMessages.length, 'older messages');
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

                        console.log('After load - ScrollHeight:', afterScrollHeight, 'HeightDiff:', heightDifference, 'NewScrollTop:', newScrollTop);

                        scrollContainer.scrollTop = newScrollTop;

                        // Verify the scroll position was set correctly
                        setTimeout(() => {
                            console.log('Final ScrollTop:', scrollContainer.scrollTop);
                            setIsLoadingOlderMessages(false);
                        }, 100);
                    });
                });

            } else {
                console.error("Failed to load more messages:", response.statusText);
                setIsLoadingOlderMessages(false);
            }
        } catch (error) {
            console.error("Error loading more messages:", error);
            setIsLoadingOlderMessages(false);
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
                setSelectedChat(data.chat);
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
                console.log('Updated reaction response:', updatedReaction); // Debug log

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
        // For now, just log that editing was requested
        // In a full implementation, you'd open an edit modal or inline editor
        console.log('Edit message:', messageId);
        // This would typically open an edit dialog or enable inline editing
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
                setMessages(prev => prev.map(msg =>
                    msg.id === messageId
                        ? { ...msg, isDeleted: true, content: 'This message was deleted' }
                        : msg
                ));
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
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
            console.log('Refreshing members for group:', selectedChat.id);
            const membersResponse = await fetch(`/api/groups/${selectedChat.id}/members`);
            if (membersResponse.ok) {
                const membersData = await membersResponse.json();
                console.log('Refreshed members data:', membersData);

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
        // Search
        searchQuery,
        setSearchQuery,
        searchResults,
        currentSearchResultIndex,
        handleNextSearchResult,
        handlePrevSearchResult,
    };
}
