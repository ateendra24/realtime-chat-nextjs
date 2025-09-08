import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { chatParticipants, messages } from '@/db/schema';
import { eq, and, gt, count } from 'drizzle-orm';

// POST /api/chats/[chatId]/read - Mark messages as read
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { chatId } = await params;
        const { messageId } = await request.json();

        // Verify user is a participant
        const participant = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (participant.length === 0) {
            return NextResponse.json({ error: 'Unauthorized - Not a participant' }, { status: 403 });
        }

        // Update last read message
        await db
            .update(chatParticipants)
            .set({
                lastReadMessageId: messageId,
                lastReadAt: new Date()
            })
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ));

        return NextResponse.json({ message: 'Messages marked as read' });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json(
            { error: 'Failed to mark messages as read' },
            { status: 500 }
        );
    }
}

// GET /api/chats/[chatId]/unread - Get unread message count
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { chatId } = await params;

        // Get participant's last read info
        const participant = await db
            .select({
                lastReadMessageId: chatParticipants.lastReadMessageId,
                lastReadAt: chatParticipants.lastReadAt
            })
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (participant.length === 0) {
            return NextResponse.json({ error: 'Unauthorized - Not a participant' }, { status: 403 });
        }

        let unreadCount = 0;

        if (participant[0].lastReadAt) {
            // Count messages after last read time
            const result = await db
                .select({ count: count() })
                .from(messages)
                .where(and(
                    eq(messages.chatId, chatId),
                    gt(messages.createdAt, participant[0].lastReadAt),
                    eq(messages.isDeleted, false)
                ));

            unreadCount = result[0]?.count || 0;
        } else {
            // Count all messages if never read
            const result = await db
                .select({ count: count() })
                .from(messages)
                .where(and(
                    eq(messages.chatId, chatId),
                    eq(messages.isDeleted, false)
                ));

            unreadCount = result[0]?.count || 0;
        }

        return NextResponse.json({
            unreadCount,
            lastReadAt: participant[0].lastReadAt?.toISOString()
        });

    } catch (error) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json(
            { error: 'Failed to fetch unread count' },
            { status: 500 }
        );
    }
}
