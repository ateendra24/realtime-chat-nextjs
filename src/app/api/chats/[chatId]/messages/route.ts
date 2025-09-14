import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages, users, messageReactions, chatParticipants, chats } from "@/db/schema";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { pusher, CHANNELS, EVENTS } from "@/lib/pusher";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { chatId } = await params;

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
        }

        // Fetch messages for the chat with user information
        const chatMessages = await db
            .select({
                id: messages.id,
                content: messages.content,
                createdAt: messages.createdAt,
                editedAt: messages.editedAt,
                userId: messages.userId,
                user: users.fullName,
                username: users.username,
                avatarUrl: users.avatarUrl,
                isDeleted: messages.isDeleted,
            })
            .from(messages)
            .innerJoin(users, eq(messages.userId, users.id))
            .where(eq(messages.chatId, chatId))
            .orderBy(desc(messages.createdAt))
            .limit(100); // Limit to last 100 messages

        // Fetch reactions for all messages
        const messageIds = chatMessages.map(msg => msg.id);
        const reactions = messageIds.length > 0 ? await db
            .select({
                messageId: messageReactions.messageId,
                emoji: messageReactions.emoji,
                count: sql<number>`count(*)`.as('count'),
            })
            .from(messageReactions)
            .where(inArray(messageReactions.messageId, messageIds))
            .groupBy(messageReactions.messageId, messageReactions.emoji) : [];

        // Group reactions by message ID and emoji
        const reactionsByMessage = reactions.reduce((acc, reaction) => {
            if (!acc[reaction.messageId]) {
                acc[reaction.messageId] = {};
            }
            if (!acc[reaction.messageId][reaction.emoji]) {
                acc[reaction.messageId][reaction.emoji] = {
                    emoji: reaction.emoji,
                    count: 0,
                    userIds: [],
                };
            }
            acc[reaction.messageId][reaction.emoji].count = reaction.count;
            return acc;
        }, {} as Record<string, Record<string, { emoji: string; count: number; userIds: string[] }>>);

        // Get user's reactions to determine hasReacted
        const userReactions = messageIds.length > 0 ? await db
            .select({
                messageId: messageReactions.messageId,
                emoji: messageReactions.emoji,
            })
            .from(messageReactions)
            .where(
                and(
                    inArray(messageReactions.messageId, messageIds),
                    eq(messageReactions.userId, userId)
                )
            ) : [];

        const userReactionMap = userReactions.reduce((acc, reaction) => {
            if (!acc[reaction.messageId]) {
                acc[reaction.messageId] = new Set();
            }
            acc[reaction.messageId].add(reaction.emoji);
            return acc;
        }, {} as Record<string, Set<string>>);

        // Transform the messages to match the expected format
        const formattedMessages = chatMessages.map(msg => {
            const msgReactions = reactionsByMessage[msg.id] || {};
            const userMsgReactions = userReactionMap[msg.id] || new Set();

            const reactionsArray = Object.values(msgReactions).map(reaction => ({
                id: `${msg.id}-${reaction.emoji}`,
                emoji: reaction.emoji,
                count: reaction.count,
                userIds: reaction.userIds,
                hasReacted: userMsgReactions.has(reaction.emoji),
            }));

            return {
                id: msg.id,
                user: msg.user || msg.username || 'Unknown User',
                userId: msg.userId,
                content: msg.content,
                createdAt: msg.createdAt,
                updatedAt: msg.editedAt,
                avatarUrl: msg.avatarUrl,
                isEdited: !!msg.editedAt,
                isDeleted: msg.isDeleted || false,
                chatId: chatId,
                reactions: reactionsArray,
            };
        }).reverse(); // Reverse to show oldest first

        return NextResponse.json(formattedMessages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 }
        );
    }
}

// POST /api/chats/[chatId]/messages - Create a new message
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        console.log('POST /api/chats/[chatId]/messages - Starting');

        const { userId } = await auth();
        if (!userId) {
            console.log('Unauthorized - no userId');
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { chatId } = await params;
        const { content } = await req.json();

        // console.log('Message creation request:', { userId, chatId, content });

        if (!content || !content.trim()) {
            console.log('Error: Message content is required');
            return NextResponse.json({ error: "Message content is required" }, { status: 400 });
        }

        if (!chatId) {
            console.log('Error: Chat ID is required');
            return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
        }

        // Get user information and verify participant status in a single query
        console.log('Verifying user is participant and getting user info:', { chatId, userId });

        const participantAndUser = await db
            .select({
                // Participant fields
                participantExists: chatParticipants.userId,
                // User fields
                fullName: users.fullName,
                username: users.username,
                avatarUrl: users.avatarUrl,
            })
            .from(chatParticipants)
            .innerJoin(users, eq(users.id, chatParticipants.userId))
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (participantAndUser.length === 0) {
            console.log('Error: User is not a participant of this chat or user not found');
            return NextResponse.json({ error: "Unauthorized - Not a participant of this chat" }, { status: 403 });
        }

        const userInfo = participantAndUser[0];
        console.log('User verified as participant:', userInfo);

        // Insert the new message and update chat in parallel for better performance
        console.log('Inserting new message into database');

        const [newMessage, _] = await Promise.all([
            // Insert message
            db.insert(messages)
                .values({
                    chatId,
                    userId,
                    content: content.trim(),
                    createdAt: new Date(),
                })
                .returning()
                .then(result => result[0]),

            // Update chat metadata in parallel
            db.update(chats)
                .set({
                    lastMessageAt: new Date(),
                    messageCount: sql`${chats.messageCount} + 1`,
                    updatedAt: new Date(),
                })
                .where(eq(chats.id, chatId))
        ]);

        console.log('Message inserted and chat updated:', newMessage);

        // We'll update the lastMessageId separately after we have the message ID
        await db
            .update(chats)
            .set({ lastMessageId: newMessage.id })
            .where(eq(chats.id, chatId));

        const responseMessage = {
            id: newMessage.id,
            user: userInfo.fullName || userInfo.username || 'Unknown User',
            userId: newMessage.userId,
            content: newMessage.content,
            createdAt: newMessage.createdAt,
            updatedAt: newMessage.editedAt,
            avatarUrl: userInfo.avatarUrl,
            isEdited: false,
            isDeleted: false,
            chatId: newMessage.chatId,
            reactions: [],
        };

        // Emit real-time events
        const messageData = {
            id: newMessage.id,
            user: userInfo.fullName || userInfo.username || 'Unknown User',
            userId: newMessage.userId,
            content: newMessage.content,
            createdAt: newMessage.createdAt,
            updatedAt: newMessage.editedAt,
            avatarUrl: userInfo.avatarUrl,
            isEdited: false,
            isDeleted: false,
            chatId: newMessage.chatId,
            reactions: [],
        };

        // Broadcast message using Pusher (run in background for faster response)
        const pusherBroadcast = async () => {
            try {
                console.log("Emitting Pusher events for message in chat:", chatId);

                // Run all Pusher events in parallel for maximum speed
                await Promise.all([
                    // Emit message to chat channel
                    pusher.trigger(CHANNELS.chat(chatId), EVENTS.message, messageData),

                    // Emit global chat list update
                    pusher.trigger(CHANNELS.global, EVENTS.global_chat_list_update, {
                        chatId,
                        messageId: newMessage.id,
                        message: newMessage.content,
                        sender: userId,
                    }),

                    // Emit chat list update to chat participants
                    pusher.trigger(CHANNELS.chat(chatId), EVENTS.chat_list_update, {
                        chatId,
                        messageId: newMessage.id,
                    })
                ]);

                console.log("✅ Pusher events emitted successfully");
            } catch (pusherError) {
                console.error("❌ Error emitting Pusher events:", pusherError);
                // Don't fail the request if Pusher fails
            }
        };

        // Start Pusher broadcast but don't wait for it (fire and forget for speed)
        pusherBroadcast();

        // Return response immediately without waiting for Pusher
        return NextResponse.json({
            message: responseMessage,
            success: true
        });

    } catch (error) {
        console.error("Error creating message:", error);
        return NextResponse.json(
            { error: "Failed to create message" },
            { status: 500 }
        );
    }
}
