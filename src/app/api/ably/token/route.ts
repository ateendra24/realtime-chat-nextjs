import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as Ably from 'ably';
import { db } from '@/db';
import { chatParticipants } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { and } from 'drizzle-orm';

// Create Ably token for client-side authentication
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate environment variable
        const apiKey = process.env.ABLY_API_KEY;
        if (!apiKey) {
            console.error('ABLY_API_KEY is not configured');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Fetch all chats the user is currently an active participant of
        const userChats = await db.query.chatParticipants.findMany({
            where: and(
                eq(chatParticipants.userId, userId),
                isNull(chatParticipants.leftAt)
            ),
            columns: {
                chatId: true,
            }
        });

        type CapabilityOp = 'publish' | 'subscribe' | 'presence';

        // Build capability object ensuring the principle of least privilege
        const capability: { [key: string]: CapabilityOp[] } = {
            'global-updates': ['subscribe'],
            [`presence-${userId}`]: ['subscribe', 'presence'],
            [`user-${userId}`]: ['subscribe'],
        };

        for (const chat of userChats) {
            capability[`chat-${chat.chatId}`] = ['publish', 'subscribe', 'presence'];
        }

        // Create Ably Rest client
        const ably = new Ably.Rest({
            key: apiKey,
        });

        // Generate token with user ID as client ID for presence
        const tokenRequest = await ably.auth.createTokenRequest({
            clientId: userId,
            capability,
        });

        return NextResponse.json(tokenRequest);
    } catch (error) {
        console.error('Error creating Ably token:', error);
        return NextResponse.json(
            { error: 'Failed to create Ably token' },
            { status: 500 }
        );
    }
}
