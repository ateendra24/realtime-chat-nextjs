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

        // SECURITY: Verify authorization BEFORE fetching members
        // This prevents unauthorized users from triggering expensive queries
        const chatCheck = await db
            .select({
                chatId: chats.id,
                isMember: chatParticipants.userId
            })
            .from(chats)
            .leftJoin(
                chatParticipants,
                and(
                    eq(chatParticipants.chatId, chats.id),
                    eq(chatParticipants.userId, userId)
                )
            )
            .where(and(
                eq(chats.id, groupId),
                eq(chats.type, 'group')
            ))
            .limit(1);

        // Short-circuit: Reject unauthorized requests early
        if (chatCheck.length === 0) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        if (!chatCheck[0].isMember) {
            return NextResponse.json({ error: 'Unauthorized - Not a member of this group' }, { status: 403 });
        }

        // ONLY fetch members after authorization succeeds
        const membersData = await db
            .select({
                id: users.id,
                name: users.fullName,
                username: users.username,
                avatarUrl: users.avatarUrl,
                role: chatParticipants.role,
                joinedAt: chatParticipants.joinedAt,
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
            isAdmin: member.role === 'admin' || member.role === 'owner',
            isOwner: member.role === 'owner',
            joinedAt: member.joinedAt?.toISOString(),
            isOnline: member.isOnline || false,
            lastSeen: member.lastSeen?.toISOString(),
        }));

        return NextResponse.json({
            members,
            memberCount: members.length
        }, {
            headers: {
                'Cache-Control': 'private, max-age=10', // Cache for 10 seconds
            }
        });

    } catch (error) {
        console.error('Error fetching group members:', error);
        return NextResponse.json(
            { error: 'Failed to fetch group members' },
            { status: 500 }
        );
    }
}