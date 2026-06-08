import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messageAttachments, chatParticipants, messages } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ imageId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageId } = await context.params;

        const result = await db.select({
            blobUrl: messageAttachments.blobUrl,
            fileName: messageAttachments.fileName,
            mimeType: messageAttachments.mimeType,
        })
            .from(messageAttachments)
            .innerJoin(messages, eq(messageAttachments.messageId, messages.id))
            .innerJoin(chatParticipants, eq(messages.chatId, chatParticipants.chatId))
            .where(
                and(
                    eq(messageAttachments.id, imageId),
                    eq(chatParticipants.userId, userId),
                    isNull(chatParticipants.leftAt)
                )
            )
            .limit(1);

        if (result.length === 0) {
            return NextResponse.json({ error: 'Image not found or access denied' }, { status: 404 });
        }

        const { blobUrl, mimeType, fileName } = result[0];

        // Proxy the image instead of redirecting — keeps the blob URL hidden
        // and ensures only authenticated users can access it
        const blobResponse = await fetch(blobUrl);

        if (!blobResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
        }

        const imageBuffer = await blobResponse.arrayBuffer();

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': mimeType || 'image/jpeg',
                'Content-Disposition': `inline; filename="${fileName}"`,
                'Cache-Control': 'private, max-age=86400, immutable',
                'X-Content-Type-Options': 'nosniff',
            },
        });

    } catch (error) {
        console.error('Image serving error:', error);
        return NextResponse.json(
            { error: 'Failed to serve image' },
            { status: 500 }
        );
    }
}