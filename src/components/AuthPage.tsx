import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface LoadingPageProps {
    type: 'loading' | 'signin';
}

export function AuthPage({ type }: LoadingPageProps) {
    if (type === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-1">
                    <Image src="/LoadingAnimation.gif" alt="Loading..." width={164} height={164} className="mx-auto brightness-50" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
                <div className="mb-4">
                    <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h1 className="text-3xl font-bold">Realtime Chat</h1>
                    <p className="text-muted-foreground mt-2">Connect with friends and create groups</p>
                </div>
                <div className="space-y-2">
                    <p className="text-muted-foreground">Please sign in to start chatting</p>
                    <Link href="/sign-in">
                        <Button size="lg">Sign In</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
