import React from 'react';
import Image from "next/image";

export function LoadingPage() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-1">
                <Image src="/LoadingAnimation.gif" alt="Loading..." width={164} height={164} className="mx-auto brightness-50" priority={true} />
            </div>
        </div>
    );

}
