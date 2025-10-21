import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages, users, messageReactions, messageAttachments, chatParticipants, chats } from "@/db/schema";
import { eq, desc, sql, inArray, and, lt } from "drizzle-orm";
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
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '30'); // Reduced from 50 to 30 for faster initial load
        const before = searchParams.get('before'); // Cursor for pagination (message ID or timestamp)

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
        }

        // Build the base condition for the query
        let whereCondition = eq(messages.chatId, chatId);

        // Add cursor condition if provided (for loading older messages)
        if (before) {
            whereCondition = and(
                whereCondition,
                lt(messages.createdAt, new Date(before))
            )!;
        }

        // Fetch messages first (fastest query - uses composite index)
        const chatMessages = await db
            .select({
                id: messages.id,
                content: messages.content,
                type: messages.type,
                createdAt: messages.createdAt,
                editedAt: messages.editedAt,
                userId: messages.userId,
                isDeleted: messages.isDeleted,
                attachmentId: messageAttachments.id,
                fileName: messageAttachments.fileName,
                fileSize: messageAttachments.fileSize,
                mimeType: messageAttachments.mimeType,
                thumbnailUrl: messageAttachments.thumbnailUrl,
                width: messageAttachments.width,
                height: messageAttachments.height,
            })
            .from(messages)
            .leftJoin(messageAttachments, eq(messages.id, messageAttachments.messageId))
            .where(whereCondition)
            .orderBy(desc(messages.createdAt))
            .limit(limit + 1); // Fetch one extra to check if there are more messages

        // Check if there are more messages
        const hasMoreMessages = chatMessages.length > limit;
        const messagesToReturn = hasMoreMessages ? chatMessages.slice(0, limit) : chatMessages;

        // Get unique user IDs for batch fetch
        const uniqueUserIds = [...new Set(messagesToReturn.map(msg => msg.userId))];
        const messageIds = messagesToReturn.map(msg => msg.id);

        // Fetch user data, reactions, and user reactions in parallel
        const [userData, reactions, userReactions] = await Promise.all([
            // Fetch users in batch (much faster than JOIN)
            uniqueUserIds.length > 0 ? db
                .select({
                    id: users.id,
                    fullName: users.fullName,
                    username: users.username,
                    avatarUrl: users.avatarUrl,
                })
                .from(users)
                .where(inArray(users.id, uniqueUserIds))
                : Promise.resolve([]),
            // Fetch all reactions
            messageIds.length > 0 ? db
                .select({
                    messageId: messageReactions.messageId,
                    emoji: messageReactions.emoji,
                    count: sql<number>`count(*)`.as('count'),
                })
                .from(messageReactions)
                .where(inArray(messageReactions.messageId, messageIds))
                .groupBy(messageReactions.messageId, messageReactions.emoji)
                : Promise.resolve([]),

            // Fetch user's reactions
            messageIds.length > 0 ? db
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
                )
                : Promise.resolve([])
        ]);

        // Create user lookup map for O(1) access
        const userMap = userData.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {} as Record<string, typeof userData[0]>);

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

        // Map user reactions
        const userReactionMap = userReactions.reduce((acc, reaction) => {
            if (!acc[reaction.messageId]) {
                acc[reaction.messageId] = new Set();
            }
            acc[reaction.messageId].add(reaction.emoji);
            return acc;
        }, {} as Record<string, Set<string>>);

        // Transform the messages to match the expected format (optimized)
        const formattedMessages = messagesToReturn.map(msg => {
            const user = userMap[msg.userId];
            const msgReactions = reactionsByMessage[msg.id];
            const userMsgReactions = userReactionMap[msg.id];

            // Build reactions array only if reactions exist
            const reactionsArray = msgReactions ? Object.values(msgReactions).map(reaction => ({
                id: `${msg.id}-${reaction.emoji}`,
                emoji: reaction.emoji,
                count: reaction.count,
                userIds: reaction.userIds,
                hasReacted: userMsgReactions?.has(reaction.emoji) || false,
            })) : [];

            // Build attachment object only if exists
            const attachment = msg.attachmentId ? {
                id: msg.attachmentId,
                fileName: msg.fileName!,
                fileSize: msg.fileSize!,
                mimeType: msg.mimeType!,
                thumbnailUrl: msg.thumbnailUrl,
                width: msg.width,
                height: msg.height,
            } : undefined;

            return {
                id: msg.id,
                user: user?.fullName || user?.username || 'Unknown User',
                userId: msg.userId,
                content: msg.content,
                type: msg.type || 'text',
                createdAt: msg.createdAt,
                updatedAt: msg.editedAt,
                avatarUrl: user?.avatarUrl,
                isEdited: !!msg.editedAt,
                isDeleted: msg.isDeleted || false,
                chatId: chatId,
                attachment,
                reactions: reactionsArray,
            };
        }).reverse(); // Reverse to show oldest first

        // Return messages with pagination info and caching headers
        return NextResponse.json({
            messages: formattedMessages,
            hasMoreMessages,
            nextCursor: hasMoreMessages ? messagesToReturn[messagesToReturn.length - 1]?.createdAt.toISOString() : null
        }, {
            headers: {
                'Cache-Control': 'private, no-cache, must-revalidate',
                'CDN-Cache-Control': 'no-store',
            }
        });
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

        const [newMessage] = await Promise.all([
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

        // Broadcast message using Pusher - MUST await in serverless to prevent dropped messages
        try {
            console.log("Emitting Pusher events for message in chat:", chatId);

            // Await Pusher broadcasts to ensure delivery before function terminates (critical for Vercel)
            // Use Promise.race with timeout to prevent hanging
            await Promise.race([
                Promise.all([
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
                ]),
                // Timeout after 3 seconds to prevent hanging (Pusher usually responds in < 500ms)
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Pusher broadcast timeout')), 3000)
                )
            ]);

            console.log("✅ Pusher events emitted successfully");
        } catch (pusherError) {
            console.error("❌ Error emitting Pusher events:", pusherError);
            // Don't fail the request if Pusher fails, but log for monitoring
        }

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
