import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT /api/messages/[messageId] - Edit message
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId } = await params;
        const { content } = await request.json();

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
        }

        // Verify the message exists and user is the author
        const message = await db
            .select()
            .from(messages)
            .where(and(
                eq(messages.id, messageId),
                eq(messages.userId, userId)
            ))
            .limit(1);

        if (message.length === 0) {
            return NextResponse.json({ error: 'Message not found or unauthorized' }, { status: 404 });
        }

        // Update the message
        await db
            .update(messages)
            .set({
                content: content.trim(),
                editedAt: new Date()
            })
            .where(eq(messages.id, messageId));

        return NextResponse.json({ message: 'Message updated successfully' });

    } catch (error) {
        console.error('Error editing message:', error);
        return NextResponse.json(
            { error: 'Failed to edit message' },
            { status: 500 }
        );
    }
}

// DELETE /api/messages/[messageId] - Delete message (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId } = await params;

        // Verify the message exists and user is the author
        const message = await db
            .select()
            .from(messages)
            .where(and(
                eq(messages.id, messageId),
                eq(messages.userId, userId)
            ))
            .limit(1);

        if (message.length === 0) {
            return NextResponse.json({ error: 'Message not found or unauthorized' }, { status: 404 });
        }

        // Soft delete the message
        await db
            .update(messages)
            .set({
                isDeleted: true,
                content: 'This message has been deleted'
            })
            .where(eq(messages.id, messageId));

        return NextResponse.json({ message: 'Message deleted successfully' });

    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json(
            { error: 'Failed to delete message' },
            { status: 500 }
        );
    }
}
