import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { chats, chatParticipants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// PATCH /api/groups/[groupId] - Update group information
export async function PATCH(
    request: NextRequest,
    { params }: { params: { groupId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId } = params;
        const updates = await request.json();

        // Check if current user is admin of the group
        const adminCheck = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, userId),
                eq(chatParticipants.role, 'admin')
            ))
            .limit(1);

        if (adminCheck.length === 0) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Update the group information
        const updatedGroup = await db
            .update(chats)
            .set({
                name: updates.name,
                description: updates.description,
                avatarUrl: updates.avatarUrl,
                updatedAt: new Date(),
            })
            .where(eq(chats.id, groupId))
            .returning();

        if (updatedGroup.length === 0) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const group = updatedGroup[0];

        console.log(`Admin ${userId} updated group ${groupId}`);

        // Return updated group data in the format expected by the frontend
        const responseData = {
            id: group.id,
            name: group.name,
            description: group.description,
            type: group.type,
            avatarUrl: group.avatarUrl,
            createdAt: group.createdAt.toISOString(),
            updatedAt: group.updatedAt.toISOString(),
            isAdmin: true,
            displayName: group.name,
        };

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Error updating group:', error);
        return NextResponse.json(
            { error: 'Failed to update group' },
            { status: 500 }
        );
    }
}
