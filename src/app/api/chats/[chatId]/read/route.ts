import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { chatParticipants } from "@/db/schema";
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

        // Update the user's last read message for this chat
        await db
            .update(chatParticipants)
            .set({
                lastReadMessageId: messageId,
                lastReadAt: new Date(),
            })
            .where(and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId)
            ));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking message as read:", error);
        return NextResponse.json(
            { error: "Failed to mark message as read" },
            { status: 500 }
        );
    }
}
