import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { chatParticipants, users, chats } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// POST /api/groups/[groupId]/members/add - Add member to group
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId } = await params;
        const { userIds } = await request.json();

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
        }

        // Verify the chat exists and is a group chat
        const chat = await db
            .select()
            .from(chats)
            .where(and(
                eq(chats.id, groupId),
                eq(chats.type, 'group')
            ))
            .limit(1);

        if (chat.length === 0) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Verify the current user is an admin of this group
        const userMembership = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, userId),
                inArray(chatParticipants.role, ['admin', 'owner'])
            ))
            .limit(1);

        if (userMembership.length === 0) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Verify all users exist
        const usersToAdd = await db
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.id, userIds));

        if (usersToAdd.length !== userIds.length) {
            return NextResponse.json({ error: 'One or more users not found' }, { status: 404 });
        }

        // Check which users are already members
        const existingMembers = await db
            .select({ userId: chatParticipants.userId })
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                inArray(chatParticipants.userId, userIds)
            ));

        const existingMemberIds = existingMembers.map(m => m.userId);
        const newUserIds = userIds.filter(id => !existingMemberIds.includes(id));

        if (newUserIds.length === 0) {
            return NextResponse.json({ error: 'All users are already members of this group' }, { status: 400 });
        }

        // Add new members to the group
        const newMembers = newUserIds.map(userId => ({
            chatId: groupId,
            userId: userId,
            role: 'member' as const,
            joinedAt: new Date()
        }));

        await db.insert(chatParticipants).values(newMembers);

        // Update the chat's updatedAt timestamp
        await db
            .update(chats)
            .set({ updatedAt: new Date() })
            .where(eq(chats.id, groupId));

        return NextResponse.json({
            message: `Successfully added ${newUserIds.length} member(s) to the group`,
            addedUserIds: newUserIds,
            skippedUserIds: existingMemberIds
        });

    } catch (error) {
        console.error('Error adding group members:', error);
        return NextResponse.json(
            { error: 'Failed to add group members' },
            { status: 500 }
        );
    }
}
