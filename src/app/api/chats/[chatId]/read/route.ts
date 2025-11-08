import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { chatParticipants, messages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
        const { messageId } = await req.json();

        if (!chatId || !messageId) {
            return NextResponse.json({ error: "Chat ID and Message ID are required" }, { status: 400 });
        }

        // Verify user is a participant of this chat
        const participant = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (participant.length === 0) {
            return NextResponse.json({ error: "Not a participant of this chat" }, { status: 403 });
        }

        // Verify the message exists and belongs to this chat (optional but safer)
        const message = await db
            .select({ id: messages.id })
            .from(messages)
            .where(and(
                eq(messages.id, messageId),
                eq(messages.chatId, chatId)
            ))
            .limit(1);

        if (message.length === 0) {
            return NextResponse.json({ error: "Message not found in this chat" }, { status: 404 });
        }

        // Update the user's last read message for this chat
        const result = await db
            .update(chatParticipants)
            .set({
                lastReadMessageId: messageId,
                lastReadAt: new Date(),
            })
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ))
            .returning({ id: chatParticipants.id });

        if (result.length === 0) {
            return NextResponse.json({ error: "Failed to update read status" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            chatId,
            messageId,
            lastReadAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error marking message as read:", error);
        return NextResponse.json(
            { error: "Failed to mark message as read" },
            { status: 500 }
        );
    }
}
