import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { chatParticipants, users, chats } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/groups/[groupId]/members - Get group members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId } = await params;

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

        // Verify the current user is a member of this group
        const userMembership = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (userMembership.length === 0) {
            return NextResponse.json({ error: 'Unauthorized - Not a member of this group' }, { status: 403 });
        }

        // Fetch all group members with their user details
        const membersData = await db
            .select({
                id: users.id,
                name: users.fullName,
                username: users.username,
                avatarUrl: users.avatarUrl,
                role: chatParticipants.role,
                joinedAt: chatParticipants.joinedAt,
                email: users.email,
                isOnline: users.isOnline,
                lastSeen: users.lastSeen,
            })
            .from(chatParticipants)
            .innerJoin(users, eq(chatParticipants.userId, users.id))
            .where(eq(chatParticipants.chatId, groupId))
            .orderBy(chatParticipants.role, chatParticipants.joinedAt);

        // Transform the data to match the expected format
        const members = membersData.map(member => ({
            id: member.id,
            name: member.name || member.username || 'Unknown User',
            username: member.username,
            avatarUrl: member.avatarUrl || '',
            role: member.role,
            isAdmin: member.role === 'admin' || member.role === 'owner', // For backward compatibility
            isOwner: member.role === 'owner',
            joinedAt: member.joinedAt?.toISOString(),
            isOnline: member.isOnline || false,
            lastSeen: member.lastSeen?.toISOString(),
        }));

        console.log(`API: Fetched ${members.length} real members for group ${groupId}`);

        return NextResponse.json({
            members,
            memberCount: members.length
        });

    } catch (error) {
        console.error('Error fetching group members:', error);
        return NextResponse.json(
            { error: 'Failed to fetch group members' },
            { status: 500 }
        );
    }
}