import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { chats, chatParticipants } from "@/db/schema";
import { sql } from "drizzle-orm";

interface ChatRow {
  id: string;
  name: string | null;
  description: string | null;
  type: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date | null;
  last_message_content: string | null;
  last_message_user_id: string | null;
  last_message_user_name: string | null;
  message_count: number;
  is_active: boolean;
  role: string;
  last_read_message_id: string | null;
  last_read_at: Date | null;
  unread_count: string;
  other_full_name: string | null;
  other_username: string | null;
  other_avatar_url: string | null;
  other_is_online: boolean | null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, participantIds, type = 'group' } = body;

    if (!name || !participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { error: "Name and participants are required" },
        { status: 400 }
      );
    }

    // Create the chat
    const [newChat] = await db
      .insert(chats)
      .values({
        name,
        description,
        type,
        createdBy: userId,
      })
      .returning();

    // Add the creator as an owner participant
    await db.insert(chatParticipants).values({
      chatId: newChat.id,
      userId: userId,
      role: 'owner',
    });

    // Add other participants
    const participantValues = participantIds.map((id: string) => ({
      chatId: newChat.id,
      userId: id,
      role: 'member' as const,
    }));

    await db.insert(chatParticipants).values(participantValues);

    return NextResponse.json({ chat: newChat }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ULTRA-OPTIMIZED: Single query using CTEs and window functions
    // This replaces 40+ queries with just 1 query!
    const result = await db.execute(sql`
      WITH user_chats AS (
        SELECT 
          c.id,
          c.name,
          c.description,
          c.type,
          c.avatar_url,
          c.created_at,
          c.updated_at,
          c.last_message_at,
          c.last_message_content,
          c.last_message_user_id,
          c.last_message_user_name,
          c.message_count,
          c.is_active,
          cp.role,
          cp.last_read_message_id,
          cp.last_read_at
        FROM chats c
        INNER JOIN chat_participants cp ON c.id = cp.chat_id
        WHERE cp.user_id = ${userId}
          AND c.is_active = true
      ),
      unread_counts AS (
        SELECT 
          uc.id as chat_id,
          COUNT(m.id) as unread_count
        FROM user_chats uc
        LEFT JOIN messages m ON m.chat_id = uc.id
          AND m.is_deleted = false
          AND (
            uc.last_read_message_id IS NULL
            OR m.created_at > (
              SELECT created_at 
              FROM messages 
              WHERE id = uc.last_read_message_id
            )
          )
        GROUP BY uc.id
      ),
      direct_chat_participants AS (
        SELECT 
          uc.id as chat_id,
          u.full_name,
          u.username,
          u.avatar_url,
          u.is_online
        FROM user_chats uc
        INNER JOIN chat_participants cp ON cp.chat_id = uc.id
        INNER JOIN users u ON u.id = cp.user_id
        WHERE uc.type = 'direct'
          AND cp.user_id != ${userId}
      )
      SELECT 
        uc.*,
        COALESCE(unr.unread_count, 0) as unread_count,
        dcp.full_name as other_full_name,
        dcp.username as other_username,
        dcp.avatar_url as other_avatar_url,
        dcp.is_online as other_is_online
      FROM user_chats uc
      LEFT JOIN unread_counts unr ON unr.chat_id = uc.id
      LEFT JOIN direct_chat_participants dcp ON dcp.chat_id = uc.id
      ORDER BY uc.last_message_at DESC NULLS LAST
    `);

    // Handle both postgres-js v3.3.x (returns array) and v3.4.x+ (returns {rows: []})
    const rows = (Array.isArray(result) ? result : (result as { rows: ChatRow[] }).rows) as ChatRow[];

    // Transform raw result to match expected format (optimized for minimal payload)
    const chatsWithDetails = rows.map((row) => {
      const isDirectChat = row.type === 'direct';
      const displayName = isDirectChat
        ? (row.other_full_name || row.other_username || 'Unknown User')
        : row.name;
      const chatAvatarUrl = isDirectChat ? row.other_avatar_url : row.avatar_url;

      // Optimized response - only essential fields, no redundant data
      const chat: Record<string, unknown> = {
        id: row.id,
        type: row.type,
        avatarUrl: chatAvatarUrl,
        displayName,
        role: row.role,
        unreadCount: parseInt(row.unread_count) || 0,
      };

      // Add optional fields only if they exist (reduces payload size)
      if (row.name) chat.name = row.name;
      if (row.description) chat.description = row.description;
      if (isDirectChat && row.other_username) chat.username = row.other_username;
      if (isDirectChat) chat.isOnline = row.other_is_online || false;
      if (row.last_message_at) chat.lastMessageAt = row.last_message_at;
      if (row.message_count) chat.messageCount = row.message_count;

      // Compact last message format
      if (row.last_message_content) {
        chat.lastMessage = {
          content: row.last_message_content.substring(0, 100), // Truncate long messages for list view
          createdAt: row.last_message_at ? new Date(row.last_message_at + 'Z').toISOString() : null,
          userName: row.last_message_user_name,
        };
      }

      return chat;
    });

    return NextResponse.json({
      chats: chatsWithDetails
    }, {
      headers: {
        'Cache-Control': 'private, max-age=5, must-revalidate', // 5s cache for better UX
        'Content-Type': 'application/json; charset=utf-8',
      }
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
