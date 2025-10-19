import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { chatParticipants, userEncryptionKeys } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * POST /api/encryption/exchange-key
 * Exchange encrypted chat key with participants
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, encryptedKeys } = await req.json();
    
    // encryptedKeys is an object: { [userId]: encryptedKey }
    // Each key is the chat's symmetric key encrypted with that user's public key

    if (!chatId || !encryptedKeys) {
      return NextResponse.json(
        { error: "Chat ID and encrypted keys are required" },
        { status: 400 }
      );
    }

    // Verify the user is a participant of this chat
    const [participant] = await db
      .select()
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.chatId, chatId),
          eq(chatParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      return NextResponse.json(
        { error: "Not a participant of this chat" },
        { status: 403 }
      );
    }

    // In a real implementation, you would store these encrypted keys
    // in a separate table for key exchange, or send them via Pusher events
    // For now, we'll return success as the keys will be exchanged client-side
    // via Pusher events in the real-time flow

    return NextResponse.json({ 
      success: true,
      message: "Keys prepared for exchange"
    });
  } catch (error) {
    console.error("Error exchanging keys:", error);
    return NextResponse.json(
      { error: "Failed to exchange keys" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/encryption/exchange-key
 * Get public keys of all participants in a chat
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
    }

    // Verify the user is a participant of this chat
    const [participant] = await db
      .select()
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.chatId, chatId),
          eq(chatParticipants.userId, userId)
        )
      )
      .limit(1);

    if (!participant) {
      return NextResponse.json(
        { error: "Not a participant of this chat" },
        { status: 403 }
      );
    }

    // Get all participants of the chat
    const participants = await db
      .select({
        userId: chatParticipants.userId,
      })
      .from(chatParticipants)
      .where(eq(chatParticipants.chatId, chatId));

    const participantIds = participants.map(p => p.userId);

    // Get public keys for all participants
    const publicKeys = await db
      .select({
        userId: userEncryptionKeys.userId,
        publicKey: userEncryptionKeys.publicKey,
      })
      .from(userEncryptionKeys)
      .where(inArray(userEncryptionKeys.userId, participantIds));

    // Convert to a map for easier lookup
    const keysMap = publicKeys.reduce((acc, key) => {
      acc[key.userId] = key.publicKey;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ publicKeys: keysMap });
  } catch (error) {
    console.error("Error getting public keys:", error);
    return NextResponse.json(
      { error: "Failed to get public keys" },
      { status: 500 }
    );
  }
}
