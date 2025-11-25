import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { chats, chatParticipants } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/users/profile/[chatId] - Get user profile from direct chat
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { chatId } = await params;

        // First verify this is a direct chat
        const chat = await db.query.chats.findFirst({
            where: eq(chats.id, chatId),
        });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        if (chat.type !== 'direct') {
            return NextResponse.json({ error: 'Not a direct chat' }, { status: 400 });
        }

        // Get the other participant in the direct chat
        const participants = await db.query.chatParticipants.findMany({
            where: eq(chatParticipants.chatId, chatId),
            with: {
                user: true,
            },
        });

        // Find the other user (not the current user)
        const otherParticipant = participants.find(p => p.userId !== userId);

        if (!otherParticipant || !otherParticipant.user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const otherUser = otherParticipant.user;

        // Return user profile information
        return NextResponse.json({
            id: otherUser.id,
            username: otherUser.username,
            fullName: otherUser.fullName,
            email: otherUser.email,
            avatarUrl: otherUser.avatarUrl,
            isOnline: otherUser.isOnline,
            createdAt: otherUser.createdAt,
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
