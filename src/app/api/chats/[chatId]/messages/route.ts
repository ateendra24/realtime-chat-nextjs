import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages, users, messageReactions, chatParticipants, chats } from "@/db/schema";
import { eq, desc, sql, inArray, and } from "drizzle-orm";

export async function GET(
    req: NextRequest,
    { params }: { params: { chatId: string } }
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
    { params }: { params: { chatId: string } }
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

        // Verify the user is a participant of the chat
        console.log('Checking if user is participant of chat:', { chatId, userId });

        const participant = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        console.log('Participant check result:', participant.length > 0 ? 'Found' : 'Not found');

        if (participant.length === 0) {
            console.log('Error: User is not a participant of this chat');
            return NextResponse.json({ error: "Unauthorized - Not a participant of this chat" }, { status: 403 });
        }

        // Insert the new message
        console.log('Inserting new message into database');

        const [newMessage] = await db
            .insert(messages)
            .values({
                chatId,
                userId,
                content: content.trim(),
                createdAt: new Date(),
            })
            .returning();

        console.log('Message inserted successfully:', newMessage);

        // Update chat with last message info and increment message count
        console.log('Updating chat with last message info');

        await db
            .update(chats)
            .set({
                lastMessageId: newMessage.id,
                lastMessageAt: newMessage.createdAt,
                messageCount: sql`${chats.messageCount} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(chats.id, chatId));

        console.log('Chat updated with last message info');

        // Get user information for the response
        const user = await db
            .select({
                fullName: users.fullName,
                username: users.username,
                avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        const userInfo = user[0] || { fullName: 'Unknown User', username: 'unknown', avatarUrl: null };

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

        // Emit socket events to all participants
        if (global.io) {
            console.log("Emitting socket events for message in chat:", chatId);

            // Emit global chat list update (to all connected users)
            console.log("Emitting global_chat_list_update");
            global.io.emit("global_chat_list_update", {
                chatId,
                messageId: newMessage.id,
                message: newMessage.content,
                sender: userId,
            });

            // Emit to specific chat room
            console.log("Emitting to chat room:", `chat_${chatId}`);
            global.io.to(`chat_${chatId}`).emit("message", {
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
            });

            // Emit chat list update to all participants
            console.log("Emitting chat_list_update to all participants");
            global.io.emit("chat_list_update", {
                chatId,
                messageId: newMessage.id,
            });
        } else {
            console.log("No socket server available");
        }

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
