
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { blockedUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { broadcastWithTimeout, CHANNELS, EVENTS } from "@/lib/ably";

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const blocked = await db.select().from(blockedUsers).where(eq(blockedUsers.blockerId, user.id));
        const blockedBy = await db.select().from(blockedUsers).where(eq(blockedUsers.blockedId, user.id));

        return NextResponse.json({
            blocked: blocked.map(b => b.blockedId),
            blockedBy: blockedBy.map(b => b.blockerId)
        });
    } catch (error) {
        console.error("Error fetching blocked users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { blockedId } = await req.json();

        if (!blockedId) {
            return NextResponse.json({ error: "Blocked ID is required" }, { status: 400 });
        }

        if (user.id === blockedId) {
            return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
        }

        // Check if already blocked
        const existing = await db.query.blockedUsers.findFirst({
            where: and(
                eq(blockedUsers.blockerId, user.id),
                eq(blockedUsers.blockedId, blockedId)
            )
        });

        if (existing) {
            return NextResponse.json({ message: "User already blocked" });
        }

        await db.insert(blockedUsers).values({
            blockerId: user.id,
            blockedId: blockedId,
        });

        // Notify both users
        await broadcastWithTimeout(
            [CHANNELS.presence(user.id), CHANNELS.presence(blockedId)],
            EVENTS.user_blocked,
            { blockerId: user.id, blockedId: blockedId }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error blocking user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { blockedId } = await req.json();

        if (!blockedId) {
            return NextResponse.json({ error: "Blocked ID is required" }, { status: 400 });
        }

        await db.delete(blockedUsers).where(
            and(
                eq(blockedUsers.blockerId, user.id),
                eq(blockedUsers.blockedId, blockedId)
            )
        );

        await broadcastWithTimeout(
            [CHANNELS.presence(user.id), CHANNELS.presence(blockedId)],
            EVENTS.user_unblocked,
            { blockerId: user.id, blockedId: blockedId }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error unblocking user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
