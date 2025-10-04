import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { messageAttachments, chatParticipants, messages } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ imageId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageId } = await params;

        // Get the attachment with message and chat info
        const attachment = await db.select({
            blobUrl: messageAttachments.blobUrl,
            fileName: messageAttachments.fileName,
            mimeType: messageAttachments.mimeType,
            chatId: messages.chatId,
        })
            .from(messageAttachments)
            .innerJoin(messages, eq(messageAttachments.messageId, messages.id))
            .where(eq(messageAttachments.id, imageId))
            .limit(1);

        if (attachment.length === 0) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        const { blobUrl, fileName, mimeType, chatId } = attachment[0];

        // Verify user has access to this chat
        const participant = await db.select()
            .from(chatParticipants)
            .where(
                and(
                    eq(chatParticipants.chatId, chatId),
                    eq(chatParticipants.userId, userId),
                    isNull(chatParticipants.leftAt)
                )
            )
            .limit(1);

        if (participant.length === 0) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Fetch the image from Vercel Blob and stream it to prevent URL exposure
        const imageResponse = await fetch(blobUrl);

        if (!imageResponse.ok) {
            return NextResponse.json({ error: 'Image not found on storage' }, { status: 404 });
        }

        const imageBuffer = await imageResponse.arrayBuffer();

        // Return the image with proper headers
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Length': imageBuffer.byteLength.toString(),
                'Cache-Control': 'private, max-age=3600', // Cache for 1 hour but keep private
                'Content-Disposition': `inline; filename="${fileName}"`,
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