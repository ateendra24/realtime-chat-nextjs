import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { userEncryptionKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/encryption/public-key
 * Get public key for a user (for key exchange)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Fetch the user's public key
    const [userKey] = await db
      .select()
      .from(userEncryptionKeys)
      .where(eq(userEncryptionKeys.userId, targetUserId))
      .limit(1);

    if (!userKey) {
      return NextResponse.json({ error: "Public key not found" }, { status: 404 });
    }

    return NextResponse.json({ publicKey: userKey.publicKey });
  } catch (error) {
    console.error("Error fetching public key:", error);
    return NextResponse.json(
      { error: "Failed to fetch public key" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/encryption/public-key
 * Store or update user's public key
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicKey } = await req.json();

    if (!publicKey) {
      return NextResponse.json({ error: "Public key is required" }, { status: 400 });
    }

    // Check if key already exists
    const [existingKey] = await db
      .select()
      .from(userEncryptionKeys)
      .where(eq(userEncryptionKeys.userId, userId))
      .limit(1);

    if (existingKey) {
      // Update existing key
      await db
        .update(userEncryptionKeys)
        .set({ 
          publicKey, 
          updatedAt: new Date() 
        })
        .where(eq(userEncryptionKeys.userId, userId));
    } else {
      // Insert new key
      await db
        .insert(userEncryptionKeys)
        .values({
          userId,
          publicKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error storing public key:", error);
    return NextResponse.json(
      { error: "Failed to store public key" },
      { status: 500 }
    );
  }
}
