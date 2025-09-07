import { useState, useEffect, useRef } from 'react';
import { useSocket } from "@/hooks/useSocket";
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
    const { socket } = useSocket();
    const { user, isSignedIn, isLoaded } = useUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [chatListRefresh, setChatListRefresh] = useState(0);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Function to scroll to bottom
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView();
        }
    };

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-scroll to bottom when chat changes
    useEffect(() => {
        if (selectedChat) {
            scrollToBottom(); // Remove setTimeout delay
        }
    }, [selectedChat]);

    // Socket message listener
    useEffect(() => {
        if (!socket) return;

        socket.on("message", (msg: Message) => {
            console.log("useChatLogic received message:", msg);
            console.log("Current user ID:", user?.id);
            console.log("Message sender ID:", msg.userId);
            console.log("Selected chat ID:", selectedChat?.id);
            console.log("Message chat ID:", msg.chatId);

            if (selectedChat && msg.chatId === selectedChat.id) {
                console.log("Adding message to current chat");
                setMessages((prev) => {
                    // Check if message already exists to prevent duplicates
                    const messageExists = prev.some(existingMsg => existingMsg.id === msg.id);
                    if (messageExists) {
                        console.log("Message already exists, skipping duplicate");
                        return prev;
                    }

                    console.log("Adding new message:", msg);
                    const newMessages = [...prev, msg];
                    scrollToBottom(); // Remove setTimeout delay for immediate scrolling
                    return newMessages;
                });

                // Mark the message as read since user is viewing this chat
                // Only mark as read if it's not from the current user (they sent it)
                if (user && msg.userId !== user.id) {
                    markLastMessageAsRead(selectedChat.id, msg.id);
                }
            } else {
                console.log("Message not for current chat or no chat selected");
            }
        });

        // Listen for real-time reaction updates
        socket.on("reaction_update", (data: {
            messageId: string;
            emoji: string;
            action: 'added' | 'removed';
            reaction: {
                id: string;
                emoji: string;
                count: number;
                userIds: string[];
                hasReacted: boolean;
            };
            chatId: string;
            userId: string;
        }) => {
            console.log('Received reaction update:', data);

            // Only update if it's for the current chat and not from the current user
            if (selectedChat && data.chatId === selectedChat.id && user && data.userId !== user.id) {
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
            socket.off("message");
            socket.off("reaction_update");
        };
    }, [socket, user, selectedChat]);

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

    // Join all user chats when socket connects
    useEffect(() => {
        const joinAllChats = async () => {
            if (!socket || !user) return;

            try {
                // Fetch user's chats to join all chat rooms
                const response = await fetch("/api/chats");
                if (response.ok) {
                    const data = await response.json();
                    const userChats = data.chats || [];

                    // Join all chat rooms
                    userChats.forEach((chat: Chat) => {
                        socket.emit("join_chat", chat.id);
                        console.log(`Requested to join chat room: ${chat.id}`);
                    });
                }
            } catch (error) {
                console.error("Error joining user chats:", error);
            }
        };

        joinAllChats();
    }, [socket, user]);

    // Manage chat room joining/leaving
    useEffect(() => {
        if (!socket || !selectedChat) return;

        console.log(`Requesting to join chat room: ${selectedChat.id}`);
        socket.emit("join_chat", selectedChat.id);

        return () => {
            console.log(`Requesting to leave chat room: ${selectedChat.id}`);
            socket.emit("leave_chat", selectedChat.id);
        };
    }, [socket, selectedChat]);

    const sendMessage = async () => {
        if (input.trim() && socket && user && !sendingMessage) {
            const chatId = selectedChat?.id;

            if (!chatId) {
                alert("Please select a chat or create a group to send messages");
                return;
            }

            setSendingMessage(true);

            const msg: Message = {
                id: Date.now().toString(),
                user: user.fullName || user.username || "Anonymous",
                userId: user.id,
                content: input,
                createdAt: new Date(),
                chatId: chatId,
                avatarUrl: user.imageUrl,
            };

            const messageContent = input;
            setInput("");

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

                    // Don't add the message to local state here since it will come via socket
                    // This prevents duplicate messages

                    // The server will broadcast the message to all participants including sender
                    // We'll receive it via the socket listener

                    // Emit chat list update event for all participants
                    socket.emit("chat_list_update", {
                        chatId: chatId,
                        lastMessage: {
                            content: messageContent,
                            createdAt: result.message.createdAt,
                            userName: user.fullName || user.username || "Anonymous",
                            userId: user.id
                        }
                    });

                    // Also emit a global chat list refresh event
                    socket.emit("global_chat_list_update", {
                        chatId: chatId,
                        triggerRefresh: true
                    });

                    // Mark the message as read for the sender
                    await markLastMessageAsRead(chatId, result.message.id);

                    setChatListRefresh(prev => prev + 1);
                } else {
                    const errorText = await response.text();
                    console.error('Error saving message to database:', response.status, errorText);
                    const fallbackMsg = { ...msg, content: messageContent };
                    socket.emit("message", fallbackMsg);
                    setMessages(prev => [...prev, fallbackMsg]);
                }
            } catch (error) {
                console.error("Error saving message:", error);
                const fallbackMsg = { ...msg, content: messageContent };
                socket.emit("message", fallbackMsg);
                setMessages(prev => [...prev, fallbackMsg]);
            } finally {
                setSendingMessage(false);
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
                const response = await fetch(`/api/chats/${chat.id}/messages`);
                if (response.ok) {
                    const chatMessages = await response.json();
                    setMessages(chatMessages);
                    setMessagesLoading(false);
                    scrollToBottom();

                    // Mark messages as read if there are messages
                    if (chatMessages.length > 0) {
                        const lastMessage = chatMessages[chatMessages.length - 1];
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

                // Emit reaction update via socket for real-time updates
                if (socket && selectedChat) {
                    socket.emit("reaction_update", {
                        messageId,
                        emoji,
                        action: updatedReaction.reaction === null ? 'removed' : 'added',
                        reaction: updatedReaction.reaction,
                        chatId: selectedChat.id,
                        userId: user?.id
                    });
                }

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

                // Emit socket event to leave the room
                if (socket) {
                    socket.emit("leave_chat", groupId);
                }
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

                // Emit socket event for real-time updates
                if (socket) {
                    socket.emit("group_updated", { groupId, updates: updatedGroup });
                }
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

                // Emit socket event for real-time updates
                if (socket) {
                    socket.emit("member_removed", { groupId, memberId });
                }
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
        sendingMessage,
        scrollAreaRef,
        messagesEndRef,
        user,
        isSignedIn,
        isLoaded,

        // Functions
        sendMessage,
        handleKeyPress,
        handleChatSelect,
        handleGroupCreated,
        handleDirectChat,
        handleLeaveGroup,
        handleUpdateGroup,
        handleRemoveMember,
        refreshMembers,
        handleReaction,
        handleEditMessage,
        handleDeleteMessage,
    };
}
