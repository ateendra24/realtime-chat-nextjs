import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages, users, messageReactions, messageAttachments, chatParticipants, chats, blockedUsers } from "@/db/schema";
import { eq, desc, sql, inArray, and, lt } from "drizzle-orm";
import { CHANNELS, EVENTS, broadcastWithTimeout } from "@/lib/ably";

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

        // Fetch messages with attachments (optimized with indexes)
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

        // Fetch user data and reactions in parallel (optimized with composite indexes)
        const [userData, reactions, userReactions] = await Promise.all([
            // Fetch users in batch (uses users_id index)
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
            // Fetch all reactions (uses message_reactions_message_emoji_idx)
            messageIds.length > 0 ? db
                .select({
                    messageId: messageReactions.messageId,
                    emoji: messageReactions.emoji,
                    count: sql<number>`count(*)::int`.as('count'),
                })
                .from(messageReactions)
                .where(inArray(messageReactions.messageId, messageIds))
                .groupBy(messageReactions.messageId, messageReactions.emoji)
                : Promise.resolve([]),

            // Fetch user's reactions (uses message_reactions_message_id_idx + filter)
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
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { chatId } = await params;
        const { content } = await req.json();

        if (!content || !content.trim()) {
            return NextResponse.json({ error: "Message content is required" }, { status: 400 });
        }

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
        }

        // Get user information and verify participant status in a single query

        const participantAndUser = await db
            .select({
                // Participant fields
                participantExists: chatParticipants.userId,
                // User fields
                fullName: users.fullName,
                username: users.username,
                avatarUrl: users.avatarUrl,
                // Chat fields
                chatType: chats.type,
            })
            .from(chatParticipants)
            .innerJoin(users, eq(users.id, chatParticipants.userId))
            .innerJoin(chats, eq(chats.id, chatParticipants.chatId))
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (participantAndUser.length === 0) {
            return NextResponse.json({ error: "Unauthorized - Not a participant of this chat" }, { status: 403 });
        }

        const userInfo = participantAndUser[0];

        // Block check for direct chats (Optimized: 1 query)
        // Checks if any OTHER participant in this chat has a block relationship with the sender
        if (userInfo.chatType === 'direct') {
            const hasBlock = await db.execute(sql`
                SELECT 1 
                FROM ${chatParticipants} cp
                JOIN ${blockedUsers} bu ON 
                    (bu.blocker_id = cp.user_id AND bu.blocked_id = ${userId})
                    OR 
                    (bu.blocker_id = ${userId} AND bu.blocked_id = cp.user_id)
                WHERE cp.chat_id = ${chatId}
                AND cp.user_id != ${userId}
                LIMIT 1
             `);

            // Handle postgres-js v3.4.x+ row format
            const rows = (Array.isArray(hasBlock) ? hasBlock : (hasBlock as any).rows);

            if (rows && rows.length > 0) {
                return NextResponse.json({ error: "Cannot send message: Blocked" }, { status: 403 });
            }
        }

        // Insert the new message
        const [newMessage] = await db.insert(messages)
            .values({
                chatId,
                userId,
                content: content.trim(),
                createdAt: new Date(),
            })
            .returning();

        // Update chat metadata with cached last message data
        await db.update(chats)
            .set({
                lastMessageId: newMessage.id,
                lastMessageAt: newMessage.createdAt,
                lastMessageContent: newMessage.content,
                lastMessageUserId: userId,
                lastMessageUserName: userInfo.fullName || userInfo.username || 'Unknown User',
                messageCount: sql`${chats.messageCount} + 1`,
                updatedAt: new Date(),
            })
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

        // Broadcast message using Ably - Fire and forget for speed (non-blocking)
        // Ably provides guaranteed delivery with automatic retries
        Promise.all([
            // Emit message to chat channel
            broadcastWithTimeout(CHANNELS.chat(chatId), EVENTS.message, messageData),

            // Emit global chat list update
            broadcastWithTimeout(CHANNELS.global, EVENTS.global_chat_list_update, {
                chatId,
                messageId: newMessage.id,
                message: newMessage.content,
                sender: userId,
            }),

            // Emit chat list update to chat participants
            broadcastWithTimeout(CHANNELS.chat(chatId), EVENTS.chat_list_update, {
                chatId,
                messageId: newMessage.id,
            })
        ]).catch(error => {
            // Log but don't fail the request
            console.error("Failed to emit Ably events:", error);
        });

        // Return response immediately without waiting for Ably
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
