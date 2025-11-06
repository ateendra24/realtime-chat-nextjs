import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { chatParticipants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE /api/groups/[groupId]/members/[memberId] - Remove member from group
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId, memberId } = await params;

        // Check if current user is admin or owner of the group
        const adminCheck = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, userId)
            ))
            .limit(1);

        if (adminCheck.length === 0) {
            return NextResponse.json({ error: 'Unauthorized - Not a member of this group' }, { status: 403 });
        }

        const userRole = adminCheck[0].role;
        if (userRole !== 'admin' && userRole !== 'owner') {
            return NextResponse.json({ error: 'Unauthorized - Admin or Owner access required' }, { status: 403 });
        }

        // Prevent admin from removing themselves (they should use leave group instead)
        if (memberId === userId) {
            return NextResponse.json({ error: 'Cannot remove yourself. Use leave group instead.' }, { status: 400 });
        }

        // Check if member exists in the group
        const memberExists = await db
            .select()
            .from(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, memberId)
            ))
            .limit(1);

        if (memberExists.length === 0) {
            return NextResponse.json({ error: 'Member not found in group' }, { status: 404 });
        }

        // Remove the member from the group
        await db
            .delete(chatParticipants)
            .where(and(
                eq(chatParticipants.chatId, groupId),
                eq(chatParticipants.userId, memberId)
            ));

        return NextResponse.json({
            success: true,
            message: 'Member removed successfully'
        });

    } catch (error) {
        console.error('Error removing group member:', error);
        return NextResponse.json(
            { error: 'Failed to remove member' },
            { status: 500 }
        );
    }
}
