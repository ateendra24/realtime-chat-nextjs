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

    // Prevent user from creating a chat with themselves
    if (participantId === userId) {
      return NextResponse.json(
        { error: "Cannot create a chat with yourself" },
        { status: 400 }
      );
    }

    // OPTIMIZED: Check if a direct chat already exists with a single query
    // Find chats where both users are participants and it's a direct chat
    const existingChat = await db.execute(sql`
      SELECT DISTINCT 
        c.*,
        u.full_name as other_full_name,
        u.username as other_username,
        u.avatar_url as other_avatar_url,
        u.is_online as other_is_online
      FROM chats c
      INNER JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = ${userId}
      INNER JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = ${participantId}
      INNER JOIN users u ON u.id = ${participantId}
      WHERE c.type = 'direct'
        AND c.is_active = true
        AND (
          SELECT COUNT(*) 
          FROM chat_participants 
          WHERE chat_id = c.id
        ) = 2
      LIMIT 1
    `);

    if (existingChat && Array.isArray(existingChat) && existingChat.length > 0) {
      const chat = existingChat[0] as any;
      // Format the chat with proper display name for direct chats
      const formattedChat = {
        ...chat,
        displayName: chat.other_full_name || chat.other_username || 'Unknown User',
        username: chat.other_username,
        avatarUrl: chat.other_avatar_url,
        isOnline: chat.other_is_online || false,
      };
      return NextResponse.json({ chat: formattedChat });
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

    // Fetch the other user's details to include in the response
    const otherUserResult = await db.execute(sql`
      SELECT full_name, username, avatar_url, is_online
      FROM users
      WHERE id = ${participantId}
      LIMIT 1
    `);

    const otherUser = Array.isArray(otherUserResult) && otherUserResult.length > 0
      ? otherUserResult[0] as any
      : null;

    // Format the new chat with display name for direct chats
    const formattedNewChat = {
      ...newChat,
      displayName: otherUser?.full_name || otherUser?.username || 'Unknown User',
      username: otherUser?.username,
      avatarUrl: otherUser?.avatar_url,
      isOnline: otherUser?.is_online || false,
    };

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

    return NextResponse.json({ chat: formattedNewChat });
  } catch (error) {
    console.error("Error creating direct chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
