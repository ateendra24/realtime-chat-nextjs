import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { chats, chatParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    // Check if a direct chat already exists between these two users
    const existingChats = await db
      .select({
        chatId: chats.id,
      })
      .from(chats)
      .innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
      .where(
        and(
          eq(chats.type, 'direct'),
          eq(chatParticipants.userId, userId)
        )
      );

    // For each chat, check if the other participant is also in it
    for (const chat of existingChats) {
      const participants = await db
        .select({ userId: chatParticipants.userId })
        .from(chatParticipants)
        .where(eq(chatParticipants.chatId, chat.chatId));

      const participantIds = participants.map(p => p.userId);

      if (participantIds.length === 2 &&
        participantIds.includes(userId) &&
        participantIds.includes(participantId)) {
        // Direct chat already exists
        const existingChat = await db
          .select()
          .from(chats)
          .where(eq(chats.id, chat.chatId))
          .limit(1);

        return NextResponse.json({ chat: existingChat[0] });
      }
    }

    // Create new direct chat
    const [newChat] = await db
      .insert(chats)
      .values({
        type: 'direct',
        createdBy: userId,
      })
      .returning();

    // Add both participants
    await db.insert(chatParticipants).values({
      chatId: newChat.id,
      userId: userId,
    });
    await db.insert(chatParticipants).values({
      chatId: newChat.id,
      userId: participantId,
    });

    // Broadcast new chat creation to all connected users
    if (global.io) {
      global.io.emit("new_chat", {
        type: "direct",
        chatId: newChat.id,
        participants: [userId, participantId]
      });
    }

    return NextResponse.json({ chat: newChat });
  } catch (error) {
    console.error("Error creating direct chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
