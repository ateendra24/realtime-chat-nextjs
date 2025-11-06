import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { chats, chatParticipants } from "@/db/schema";
import { sql } from "drizzle-orm";
import { pusher } from "@/lib/pusher";

interface ChatRow {
  id: string;
  [key: string]: unknown;
}

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

    // OPTIMIZED: Check if a direct chat already exists with a single query
    // Use a subquery to find chats with exactly these two participants
    const existingChat = await db.execute(sql`
      SELECT c.* 
      FROM chats c
      WHERE c.type = 'direct'
        AND c.id IN (
          SELECT cp1.chat_id
          FROM chat_participants cp1
          INNER JOIN chat_participants cp2 
            ON cp1.chat_id = cp2.chat_id
          WHERE cp1.user_id = ${userId}
            AND cp2.user_id = ${participantId}
          GROUP BY cp1.chat_id
          HAVING COUNT(DISTINCT cp1.user_id) = 2
        )
      LIMIT 1
    `);

    if (existingChat && Array.isArray(existingChat) && existingChat.length > 0) {
      return NextResponse.json({ chat: existingChat[0] as ChatRow });
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

    // Broadcast new chat creation to all connected users via Pusher
    try {
      await pusher.trigger(['user-' + userId, 'user-' + participantId], 'new-chat', {
        type: "direct",
        chatId: newChat.id,
        participants: [userId, participantId]
      });
    } catch (pusherError) {
      console.error("Failed to broadcast new chat via Pusher:", pusherError);
      // Don't fail the request if Pusher broadcast fails
    }

    return NextResponse.json({ chat: newChat });
  } catch (error) {
    console.error("Error creating direct chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
