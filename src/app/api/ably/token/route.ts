import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as Ably from 'ably';

// Create Ably token for client-side authentication
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create Ably Rest client
        const ably = new Ably.Rest({
            key: process.env.ABLY_API_KEY!,
        });

        // Generate token with user ID as client ID for presence
        const tokenRequest = await ably.auth.createTokenRequest({
            clientId: userId,
            capability: {
                '*': ['publish', 'subscribe', 'presence'],
            },
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
