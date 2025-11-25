import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { chatParticipants, messages, messageAttachments, users, chats } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { CHANNELS, EVENTS, broadcastWithTimeout } from '@/lib/ably';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const chatId = formData.get('chatId') as string;
        const messageContent = formData.get('content') as string || '';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!chatId) {
            return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
        }

        // Verify user is a participant in the chat
        const participant = await db.select()
            .from(chatParticipants)
            .where(
                and(
                    eq(chatParticipants.chatId, chatId),
                    eq(chatParticipants.userId, userId),
                    isNull(chatParticipants.leftAt)
                )
            )
            .limit(1);

        if (participant.length === 0) {
            return NextResponse.json({ error: 'Not authorized to upload to this chat' }, { status: 403 });
        }

        // Generate unique filename
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueFileName = `${nanoid()}.${fileExtension}`;
        const blobPath = `chat-images/${chatId}/${uniqueFileName}`;

        // Upload to Vercel Blob
        const blob = await put(blobPath, file, {
            access: 'public',
            addRandomSuffix: false,
        });

        // Create message in database
        const [newMessage] = await db.insert(messages).values({
            chatId,
            userId,
            content: messageContent,
            type: 'image',
        }).returning();

        // Create attachment record
        const [attachment] = await db.insert(messageAttachments).values({
            messageId: newMessage.id,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            blobUrl: blob.url,
        }).returning();

        // Get user info for broadcasting
        const [userInfo] = await db.select({
            fullName: users.fullName,
            username: users.username,
            avatarUrl: users.avatarUrl,
        }).from(users).where(eq(users.id, userId)).limit(1);

        // Update chat metadata with last message info
        const lastMessageText = messageContent.trim() || 'Image';
        await db.update(chats)
            .set({
                lastMessageId: newMessage.id,
                lastMessageAt: newMessage.createdAt,
                lastMessageContent: lastMessageText,
                lastMessageUserId: userId,
                lastMessageUserName: userInfo?.fullName || userInfo?.username || 'Unknown User',
                messageCount: sql`${chats.messageCount} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(chats.id, chatId));

        // Broadcast the message
        const messageToSend = {
            id: newMessage.id,
            user: userInfo?.fullName || userInfo?.username || 'Unknown User',
            username: userInfo?.username,
            userId: newMessage.userId,
            content: newMessage.content,
            type: newMessage.type,
            createdAt: newMessage.createdAt,
            chatId: newMessage.chatId,
            avatarUrl: userInfo?.avatarUrl,
            attachment: {
                id: attachment.id,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                blobUrl: blob.url,
            }
        };

        try {
            // Use Ably's guaranteed delivery with built-in timeout
            await Promise.all([
                // Emit message to chat channel
                broadcastWithTimeout(CHANNELS.chat(chatId), EVENTS.message, messageToSend),

                // Emit global chat list update
                broadcastWithTimeout(CHANNELS.global, EVENTS.global_chat_list_update, {
                    chatId,
                    messageId: newMessage.id,
                    message: lastMessageText,
                    sender: userId,
                }),

                // Emit chat list update to chat participants
                broadcastWithTimeout(CHANNELS.chat(chatId), EVENTS.chat_list_update, {
                    chatId,
                    messageId: newMessage.id,
                })
            ]);
        } catch (ablyError) {
            console.error('Failed to broadcast message via Ably:', ablyError);
            // Don't fail the request if Ably broadcast fails
        }

        // Return the message with attachment info
        return NextResponse.json({
            success: true,
            message: messageToSend
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}