import { db } from '@/db';
import { messages, chats } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { CHANNELS, EVENTS, broadcastWithTimeout } from '@/lib/ably';

/**
 * Creates and broadcasts a system message in a chat.
 * System messages describe group events (member joined, left, removed, group renamed, etc.)
 * They use the 'system' message type and are displayed as a centered pill in the UI.
 *
 * @param chatId  - The chat (group) to post the system message in
 * @param content - The human-readable message e.g. "Alice left the group"
 * @param actorUserId - The userId of the person who triggered the event (needed for FK constraint)
 */
export async function sendSystemMessage(
    chatId: string,
    content: string,
    actorUserId: string
): Promise<void> {
    try {
        const [newMessage] = await db
            .insert(messages)
            .values({
                chatId,
                userId: actorUserId, // satisfies the NOT NULL FK constraint
                content,
                type: 'system',
                createdAt: new Date(),
            })
            .returning();

        // Update chat last-message cache so the sidebar reflects the system event
        await db
            .update(chats)
            .set({
                lastMessageId: newMessage.id,
                lastMessageAt: newMessage.createdAt,
                lastMessageContent: content,
                lastMessageUserId: actorUserId,
                lastMessageUserName: 'System',
                messageCount: sql`${chats.messageCount} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(chats.id, chatId));

        const messageData = {
            id: newMessage.id,
            user: 'System',
            userId: actorUserId,
            content,
            type: 'system' as const,
            createdAt: newMessage.createdAt,
            isEdited: false,
            isDeleted: false,
            chatId,
            reactions: [],
        };

        // Broadcast to the chat channel (real-time delivery to all open tabs)
        await Promise.all([
            broadcastWithTimeout(CHANNELS.chat(chatId), EVENTS.message, messageData),
            broadcastWithTimeout(CHANNELS.global, EVENTS.global_chat_list_update, {
                chatId,
                messageId: newMessage.id,
                message: content,
                sender: actorUserId,
            }),
            broadcastWithTimeout(CHANNELS.chat(chatId), EVENTS.chat_list_update, {
                chatId,
                messageId: newMessage.id,
            }),
        ]);
    } catch (error) {
        // System messages are non-critical; log but don't crash the caller
        console.error('[sendSystemMessage] Failed to send system message:', error);
    }
}
