import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, username, email, fullName, avatarUrl } = body;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          username,
          email,
          fullName,
          avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return NextResponse.json({ user: updatedUser });
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          id,
          username,
          email,
          fullName,
          avatarUrl,
        })
        .returning();

      return NextResponse.json({ user: newUser });
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
