import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messages, messageAttachments, chats, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { del } from '@vercel/blob';

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

        // Check if this is the last message and update chat cache
        const chatId = message[0].chatId;
        const chat = await db
            .select({ lastMessageId: chats.lastMessageId })
            .from(chats)
            .where(eq(chats.id, chatId))
            .limit(1);

        // If the edited message is the last message, update the cache
        if (chat.length > 0 && chat[0].lastMessageId === messageId) {
            await db
                .update(chats)
                .set({
                    lastMessageContent: content.trim(),
                    updatedAt: new Date(),
                })
                .where(eq(chats.id, chatId));
        }

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

        // Check if message has image attachments and delete them from Vercel Blob
        const attachments = await db
            .select()
            .from(messageAttachments)
            .where(eq(messageAttachments.messageId, messageId));

        // Delete images from Vercel Blob
        if (attachments.length > 0) {
            const deletePromises = attachments.map(attachment =>
                del(attachment.blobUrl).catch(error => {
                    console.error(`Failed to delete blob ${attachment.blobUrl}:`, error);
                    // Continue even if blob deletion fails
                })
            );

            await Promise.all(deletePromises);
        }

        // Soft delete the message
        await db
            .update(messages)
            .set({
                isDeleted: true,
                content: 'This message has been deleted'
            })
            .where(eq(messages.id, messageId));

        // Check if this was the last message and update chat cache
        const chatId = message[0].chatId;
        const chat = await db
            .select({ lastMessageId: chats.lastMessageId })
            .from(chats)
            .where(eq(chats.id, chatId))
            .limit(1);

        // If the deleted message was the last message, find the new last message
        if (chat.length > 0 && chat[0].lastMessageId === messageId) {
            const newLastMessage = await db
                .select({
                    id: messages.id,
                    content: messages.content,
                    createdAt: messages.createdAt,
                    userId: messages.userId,
                    userName: users.username,
                    userFullName: users.fullName,
                })
                .from(messages)
                .innerJoin(users, eq(messages.userId, users.id))
                .where(and(
                    eq(messages.chatId, chatId),
                    eq(messages.isDeleted, false)
                ))
                .orderBy(desc(messages.createdAt))
                .limit(1);

            if (newLastMessage.length > 0) {
                // Update with new last message
                const lastMsg = newLastMessage[0];
                await db
                    .update(chats)
                    .set({
                        lastMessageId: lastMsg.id,
                        lastMessageAt: lastMsg.createdAt,
                        lastMessageContent: lastMsg.content,
                        lastMessageUserId: lastMsg.userId,
                        lastMessageUserName: lastMsg.userFullName || lastMsg.userName || 'Unknown User',
                        updatedAt: new Date(),
                    })
                    .where(eq(chats.id, chatId));
            } else {
                // No more messages, clear the last message cache
                await db
                    .update(chats)
                    .set({
                        lastMessageId: null,
                        lastMessageAt: null,
                        lastMessageContent: null,
                        lastMessageUserId: null,
                        lastMessageUserName: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(chats.id, chatId));
            }
        }

        return NextResponse.json({ message: 'Message deleted successfully' });

    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json(
            { error: 'Failed to delete message' },
            { status: 500 }
        );
    }
}
