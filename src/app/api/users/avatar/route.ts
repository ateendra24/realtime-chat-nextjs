import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('avatar') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({
                error: "Invalid file type. Please upload a JPEG, PNG, or WebP image."
            }, { status: 400 });
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({
                error: "File too large. Please upload an image smaller than 5MB."
            }, { status: 400 });
        }

        try {
            // Update avatar using Clerk
            const client = await clerkClient();
            const updatedUser = await client.users.updateUserProfileImage(userId, {
                file: file
            });

            // Update avatarUrl in our database
            await db
                .update(users)
                .set({
                    avatarUrl: updatedUser.imageUrl,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId));

            return NextResponse.json({
                success: true,
                avatarUrl: updatedUser.imageUrl,
                message: "Avatar updated successfully"
            });

        } catch (clerkError) {
            console.error("Error updating avatar in Clerk:", clerkError);
            return NextResponse.json({
                error: "Failed to update avatar. Please try again."
            }, { status: 500 });
        }

    } catch (error) {
        console.error("Error uploading avatar:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
