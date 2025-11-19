import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messageReactions, messages, chatParticipants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ably, CHANNELS, EVENTS, broadcastWithTimeout } from '@/lib/ably';

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

        // Single query to verify message exists and user is participant, and get existing reaction
        const [verificationResult, existingReaction] = await Promise.all([
            db
                .select({
                    chatId: messages.chatId,
                    isParticipant: chatParticipants.userId
                })
                .from(messages)
                .leftJoin(chatParticipants, and(
                    eq(chatParticipants.chatId, messages.chatId),
                    eq(chatParticipants.userId, userId)
                ))
                .where(eq(messages.id, messageId))
                .limit(1),
            db
                .select()
                .from(messageReactions)
                .where(and(
                    eq(messageReactions.messageId, messageId),
                    eq(messageReactions.userId, userId),
                    eq(messageReactions.emoji, emoji)
                ))
                .limit(1)
        ]);

        if (verificationResult.length === 0) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        if (!verificationResult[0].isParticipant) {
            return NextResponse.json({ error: 'Unauthorized - Not a participant of this chat' }, { status: 403 });
        }

        const chatId = verificationResult[0].chatId;
        const isRemoving = existingReaction.length > 0;

        // Perform the action and get updated reactions in parallel
        if (isRemoving) {
            // Delete and get remaining reactions
            await db
                .delete(messageReactions)
                .where(and(
                    eq(messageReactions.messageId, messageId),
                    eq(messageReactions.userId, userId),
                    eq(messageReactions.emoji, emoji)
                ));
        } else {
            // Insert new reaction
            await db
                .insert(messageReactions)
                .values({
                    messageId,
                    userId,
                    emoji,
                });
        }

        // Get all reactions for this emoji after the action
        const allReactions = await db
            .select({ userId: messageReactions.userId })
            .from(messageReactions)
            .where(and(
                eq(messageReactions.messageId, messageId),
                eq(messageReactions.emoji, emoji)
            ));

        let reactionData = null;
        if (allReactions.length > 0) {
            reactionData = {
                id: `${messageId}-${emoji}`,
                emoji,
                count: allReactions.length,
                userIds: allReactions.map(r => r.userId),
                hasReacted: !isRemoving
            };
        }

        const responseData = {
            message: isRemoving ? 'Reaction removed' : 'Reaction added',
            action: isRemoving ? 'removed' : 'added',
            reaction: reactionData
        };

        // Emit real-time update (non-blocking)
        const reactionUpdateData = {
            messageId,
            emoji,
            action: isRemoving ? 'removed' : 'added',
            reaction: reactionData,
            chatId,
            userId
        };

        // Fire and forget Ably update with guaranteed delivery
        broadcastWithTimeout(CHANNELS.chat(chatId), EVENTS.reaction_update, reactionUpdateData)
            .catch(error => console.error('Error emitting Ably reaction update:', error));

        return NextResponse.json(responseData);

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
