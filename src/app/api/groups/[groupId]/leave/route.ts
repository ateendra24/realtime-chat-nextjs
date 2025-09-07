import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { chatParticipants, chats } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';

// POST /api/groups/[groupId]/leave - Leave group
export async function POST(
    request: NextRequest,
    { params }: { params: { groupId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId } = params;

        // Check if user is a member of the group
        const membership = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (membership.length === 0) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 404 });
        }

        const userMembership = membership[0];

        // Check if user is admin and if there are other admins
        if (userMembership.role === "admin") {
            const adminCount = await db
                .select({ count: count() })
                .from(chatParticipants)
                .where(and(
                    eq(chatParticipants.chatId, groupId),
                    eq(chatParticipants.role, "admin")
                ));

            // If this is the only admin, we need to handle admin transfer or group deletion
            if (adminCount[0].count === 1) {
                // Get total member count
                const totalMembers = await db
                    .select({ count: count() })
                    .from(chatParticipants)
                    .where(eq(chatParticipants.chatId, groupId));

                // If this is the last member, delete the group
                if (totalMembers[0].count === 1) {
                    await db.delete(chats).where(eq(chats.id, groupId));
                    console.log(`Group ${groupId} deleted - last member left`);
                } else {
                    // Transfer admin to the oldest member
                    const oldestMember = await db
                        .select()
                        .from(chatParticipants)
                        .where(and(
                            eq(chatParticipants.chatId, groupId),
                            eq(chatParticipants.role, "member")
                        ))
                        .orderBy(chatParticipants.joinedAt)
                        .limit(1);

                    if (oldestMember.length > 0) {
                        await db
                            .update(chatParticipants)
                            .set({ role: "admin" })
                            .where(and(
                                eq(chatParticipants.chatId, groupId),
                                eq(chatParticipants.userId, oldestMember[0].userId)
                            ));
                        console.log(`Admin transferred to user ${oldestMember[0].userId}`);
                    }
                }
            }
        }

        // Remove user from group
        await db
            .delete(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, userId)
            ));

        console.log(`User ${userId} left group ${groupId}`);

        return NextResponse.json({
            success: true,
            message: 'Left group successfully'
        });

    } catch (error) {
        console.error('Error leaving group:', error);
        return NextResponse.json(
            { error: 'Failed to leave group' },
            { status: 500 }
        );
    }
}
