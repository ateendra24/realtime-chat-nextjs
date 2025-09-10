import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { pusher, CHANNELS, EVENTS } from '@/lib/pusher';

// POST /api/pusher/typing - Handle typing indicators
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, chatId, username } = await request.json();

        if (!action || !chatId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const eventName = action === 'start' ? EVENTS.typing_start : EVENTS.typing_stop;
        const data = {
            chatId,
            userId,
            username: username || 'Anonymous'
        };

        await pusher.trigger(CHANNELS.chat(chatId), eventName, data);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error handling typing event:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
