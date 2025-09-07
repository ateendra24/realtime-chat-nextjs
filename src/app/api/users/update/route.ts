import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { username, fullName } = body;

        // Validate input
        if (!username || username.trim().length === 0) {
            return NextResponse.json({ error: "Username is required" }, { status: 400 });
        }

        // Check if username is already taken by another user
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.username, username.trim()));

        if (existingUser.length > 0 && existingUser[0].id !== userId) {
            return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
        }

        // Update user in database
        const [updatedUser] = await db
            .update(users)
            .set({
                username: username.trim(),
                fullName: fullName?.trim() || null,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning();

        // Also update user in Clerk
        try {
            const client = await clerkClient();
            await client.users.updateUser(userId, {
                username: username.trim(),
                firstName: fullName?.trim().split(' ')[0] || '',
                lastName: fullName?.trim().split(' ').slice(1).join(' ') || '',
            });
        } catch (clerkError) {
            console.warn("Failed to update Clerk user, but database was updated:", clerkError);
            // Continue even if Clerk update fails
        }

        return NextResponse.json({
            success: true,
            user: updatedUser,
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error("Error updating user profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
