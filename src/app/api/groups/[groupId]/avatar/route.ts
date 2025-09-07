import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { chats, chatParticipants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadToImageKit, deleteFromImageKit } from '@/lib/imagekit';

// POST /api/groups/[groupId]/avatar - Upload group avatar
export async function POST(
    request: NextRequest,
    { params }: { params: { groupId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId } = await params;

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Verify the user is an admin or owner of the group
        const participant = await db
            .select({
                role: chatParticipants.role,
            })
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (participant.length === 0) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
        }

        const userRole = participant[0].role;
        if (userRole !== 'admin' && userRole !== 'owner') {
            return NextResponse.json({ error: 'Only admins and owners can change the group avatar' }, { status: 403 });
        }

        // Get the uploaded file
        const formData = await request.formData();
        const file = formData.get('avatar') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
        }

        // Get current avatar info to delete old file if exists
        const currentChat = await db
            .select({
                avatarFileId: chats.avatarFileId,
            })
            .from(chats)
            .where(eq(chats.id, groupId))
            .limit(1);

        const oldFileId = currentChat[0]?.avatarFileId;

        // Upload to ImageKit
        const fileName = `group-${groupId}-avatar-${Date.now()}`;
        const { url: avatarUrl, fileId } = await uploadToImageKit(file, fileName, '/group-avatars');

        // Update the group avatar in the database
        await db
            .update(chats)
            .set({
                avatarUrl,
                avatarFileId: fileId,
                updatedAt: new Date(),
            })
            .where(eq(chats.id, groupId));

        // Delete old avatar from ImageKit if it exists
        if (oldFileId) {
            try {
                await deleteFromImageKit(oldFileId);
            } catch (error) {
                console.warn('Failed to delete old avatar from ImageKit:', error);
                // Don't fail the request if old file deletion fails
            }
        }

        return NextResponse.json({
            message: 'Avatar updated successfully',
            avatarUrl,
        });

    } catch (error) {
        console.error('Error uploading group avatar:', error);
        return NextResponse.json(
            { error: 'Failed to upload avatar' },
            { status: 500 }
        );
    }
}

// DELETE /api/groups/[groupId]/avatar - Remove group avatar
export async function DELETE(
    request: NextRequest,
    { params }: { params: { groupId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId } = await params;

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        // Verify the user is an admin or owner of the group
        const participant = await db
            .select({
                role: chatParticipants.role,
            })
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (participant.length === 0) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
        }

        const userRole = participant[0].role;
        if (userRole !== 'admin' && userRole !== 'owner') {
            return NextResponse.json({ error: 'Only admins and owners can change the group avatar' }, { status: 403 });
        }

        // Get current avatar info to delete from ImageKit
        const currentChat = await db
            .select({
                avatarFileId: chats.avatarFileId,
            })
            .from(chats)
            .where(eq(chats.id, groupId))
            .limit(1);

        const fileId = currentChat[0]?.avatarFileId;

        // Remove the group avatar from the database
        await db
            .update(chats)
            .set({
                avatarUrl: null,
                avatarFileId: null,
                updatedAt: new Date(),
            })
            .where(eq(chats.id, groupId));

        // Delete from ImageKit if file exists
        if (fileId) {
            try {
                await deleteFromImageKit(fileId);
            } catch (error) {
                console.warn('Failed to delete avatar from ImageKit:', error);
                // Don't fail the request if ImageKit deletion fails
            }
        }

        return NextResponse.json({
            message: 'Avatar removed successfully',
        });

    } catch (error) {
        console.error('Error removing group avatar:', error);
        return NextResponse.json(
            { error: 'Failed to remove avatar' },
            { status: 500 }
        );
    }
}
