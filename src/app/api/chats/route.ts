import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { chats, chatParticipants, users, messages } from "@/db/schema";
import { eq, and, ne, desc, sql } from "drizzle-orm";

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

    // Get all chats where the user is a participant
    const userChats = await db
      .select({
        id: chats.id,
        name: chats.name,
        description: chats.description,
        type: chats.type,
        avatarUrl: chats.avatarUrl,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
        lastMessageAt: chats.lastMessageAt,
        messageCount: chats.messageCount,
        isActive: chats.isActive,
        role: chatParticipants.role,
        lastReadMessageId: chatParticipants.lastReadMessageId,
        lastReadAt: chatParticipants.lastReadAt,
      })
      .from(chats)
      .innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
      .where(and(
        eq(chatParticipants.userId, userId),
        eq(chats.isActive, true)
      ))
      .orderBy(desc(chats.lastMessageAt));

    // For each chat, get the last message and participant info
    const chatsWithDetails = await Promise.all(
      userChats.map(async (chat) => {
        // Get last message
        const lastMessage = await db
          .select({
            id: messages.id,
            content: messages.content,
            createdAt: messages.createdAt,
            userId: messages.userId,
            userName: users.username,
            isDeleted: messages.isDeleted,
          })
          .from(messages)
          .innerJoin(users, eq(messages.userId, users.id))
          .where(and(
            eq(messages.chatId, chat.id),
            eq(messages.isDeleted, false)
          ))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Calculate unread messages count
        let unreadCount = 0;
        if (chat.lastReadMessageId) {
          // Count messages after the last read message
          const unreadMessages = await db
            .select({ count: sql<number>`count(*)`.as('count') })
            .from(messages)
            .where(and(
              eq(messages.chatId, chat.id),
              eq(messages.isDeleted, false),
              sql`${messages.createdAt} > (SELECT created_at FROM messages WHERE id = ${chat.lastReadMessageId})`
            ));
          unreadCount = unreadMessages[0]?.count || 0;
        } else {
          // If no last read message, count all messages
          const allMessages = await db
            .select({ count: sql<number>`count(*)`.as('count') })
            .from(messages)
            .where(and(
              eq(messages.chatId, chat.id),
              eq(messages.isDeleted, false)
            ));
          unreadCount = allMessages[0]?.count || 0;
        }

        // For direct chats, get the other participant's name and avatar
        let displayName = chat.name;
        let username = null;
        let chatAvatarUrl = chat.avatarUrl;
        let isOnline = false;

        if (chat.type === 'direct') {
          const otherParticipant = await db
            .select({
              fullName: users.fullName,
              username: users.username,
              avatarUrl: users.avatarUrl,
              isOnline: users.isOnline,
              lastSeen: users.lastSeen,
            })
            .from(users)
            .innerJoin(chatParticipants, eq(users.id, chatParticipants.userId))
            .where(
              and(
                eq(chatParticipants.chatId, chat.id),
                ne(chatParticipants.userId, userId)
              )
            )
            .limit(1);

          if (otherParticipant.length > 0) {
            displayName = otherParticipant[0].fullName || otherParticipant[0].username || 'Unknown User';
            username = otherParticipant[0].username;
            chatAvatarUrl = otherParticipant[0].avatarUrl || null;
            isOnline = otherParticipant[0].isOnline || false;
          }
        }

        return {
          ...chat,
          displayName,
          username,
          avatarUrl: chatAvatarUrl,
          isOnline,
          isAdmin: chat.role === 'admin' || chat.role === 'owner', // For backward compatibility
          isOwner: chat.role === 'owner',
          unreadCount,
          lastMessage: lastMessage.length > 0 ? {
            id: lastMessage[0].id,
            content: lastMessage[0].content,
            createdAt: lastMessage[0].createdAt,
            userName: lastMessage[0].userName,
          } : null,
        };
      })
    );

    return NextResponse.json({ chats: chatsWithDetails });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
