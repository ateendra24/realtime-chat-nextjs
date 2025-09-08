import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messageReactions, messages, chatParticipants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/messages/[messageId]/reactions - Add reaction to message
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId } = await params;
        const { emoji } = await request.json();

        if (!emoji) {
            return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
        }

        // Verify the message exists
        const message = await db
            .select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);

        if (message.length === 0) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        // Verify the user is a participant of the chat
        const participant = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, message[0].chatId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (participant.length === 0) {
            return NextResponse.json({ error: 'Unauthorized - Not a participant of this chat' }, { status: 403 });
        }

        // Check if reaction already exists
        const existingReaction = await db
            .select()
            .from(messageReactions)
            .where(and(
                eq(messageReactions.messageId, messageId),
                eq(messageReactions.userId, userId),
                eq(messageReactions.emoji, emoji)
            ))
            .limit(1);

        if (existingReaction.length > 0) {
            // Remove reaction if it already exists
            await db
                .delete(messageReactions)
                .where(and(
                    eq(messageReactions.messageId, messageId),
                    eq(messageReactions.userId, userId),
                    eq(messageReactions.emoji, emoji)
                ));

            // Get updated reaction count
            const remainingReactions = await db
                .select()
                .from(messageReactions)
                .where(and(
                    eq(messageReactions.messageId, messageId),
                    eq(messageReactions.emoji, emoji)
                ));

            if (remainingReactions.length === 0) {
                // No more reactions for this emoji, return null to remove it
                const responseData = {
                    message: 'Reaction removed',
                    action: 'removed',
                    reaction: null
                };

                // Emit real-time update to other users in the chat
                if (global.io) {
                    console.log(`Emitting reaction_update to room: chat_${message[0].chatId}`);
                    global.io.to(`chat_${message[0].chatId}`).emit("reaction_update", {
                        messageId,
                        emoji,
                        action: 'removed',
                        reaction: null,
                        chatId: message[0].chatId,
                        userId: userId
                    });
                } else {
                    console.log('global.io not available for reaction emission');
                }

                return NextResponse.json(responseData);
            } else {
                // Return updated count
                const reactionData = {
                    id: `${messageId}-${emoji}`,
                    emoji,
                    count: remainingReactions.length,
                    userIds: remainingReactions.map(r => r.userId),
                    hasReacted: false
                };

                const responseData = {
                    message: 'Reaction removed',
                    action: 'removed',
                    reaction: reactionData
                };

                // Emit real-time update to other users in the chat
                if (global.io) {
                    console.log(`Emitting reaction_update to room: chat_${message[0].chatId}`);
                    global.io.to(`chat_${message[0].chatId}`).emit("reaction_update", {
                        messageId,
                        emoji,
                        action: 'removed',
                        reaction: reactionData,
                        chatId: message[0].chatId,
                        userId: userId
                    });
                } else {
                    console.log('global.io not available for reaction emission');
                }

                return NextResponse.json(responseData);
            }
        } else {
            // Add new reaction
            await db
                .insert(messageReactions)
                .values({
                    messageId,
                    userId,
                    emoji,
                });

            // Get all reactions for this emoji to return count
            const allReactions = await db
                .select()
                .from(messageReactions)
                .where(and(
                    eq(messageReactions.messageId, messageId),
                    eq(messageReactions.emoji, emoji)
                ));

            const reactionData = {
                id: `${messageId}-${emoji}`,
                emoji,
                count: allReactions.length,
                userIds: allReactions.map(r => r.userId),
                hasReacted: true
            };

            const responseData = {
                message: 'Reaction added',
                action: 'added',
                reaction: reactionData
            };

            // Emit real-time update to other users in the chat
            if (global.io) {
                console.log(`Emitting reaction_update to room: chat_${message[0].chatId}`);
                global.io.to(`chat_${message[0].chatId}`).emit("reaction_update", {
                    messageId,
                    emoji,
                    action: 'added',
                    reaction: reactionData,
                    chatId: message[0].chatId,
                    userId: userId
                });
            } else {
                console.log('global.io not available for reaction emission');
            }

            return NextResponse.json(responseData);
        }

    } catch (error) {
        console.error('Error handling message reaction:', error);
        return NextResponse.json(
            { error: 'Failed to handle message reaction' },
            { status: 500 }
        );
    }
}

// GET /api/messages/[messageId]/reactions - Get reactions for message
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId } = await params;

        // Get all reactions for the message
        const reactions = await db
            .select({
                id: messageReactions.id,
                emoji: messageReactions.emoji,
                userId: messageReactions.userId,
                createdAt: messageReactions.createdAt,
            })
            .from(messageReactions)
            .where(eq(messageReactions.messageId, messageId));

        // Group reactions by emoji
        const groupedReactions = reactions.reduce((acc, reaction) => {
            if (!acc[reaction.emoji]) {
                acc[reaction.emoji] = {
                    emoji: reaction.emoji,
                    count: 0,
                    userIds: [],
                    userReacted: false
                };
            }
            acc[reaction.emoji].count++;
            acc[reaction.emoji].userIds.push(reaction.userId);
            if (reaction.userId === userId) {
                acc[reaction.emoji].userReacted = true;
            }
            return acc;
        }, {} as Record<string, {
            emoji: string;
            count: number;
            userIds: string[];
            userReacted: boolean;
        }>);

        return NextResponse.json({
            reactions: Object.values(groupedReactions)
        });

    } catch (error) {
        console.error('Error fetching message reactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch message reactions' },
            { status: 500 }
        );
    }
}
