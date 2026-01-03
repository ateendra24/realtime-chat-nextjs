"use client";

import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, AtSign } from "lucide-react";
import type { Chat } from '@/types/global';
import moment from 'moment';

interface DirectChatInfoSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedChat: Chat | null;
}

export function DirectChatInfoSheet({
    isOpen,
    onOpenChange,
    selectedChat,
}: DirectChatInfoSheetProps) {
    // Only show for direct chats
    if (!selectedChat || selectedChat.type !== 'direct') {
        return null;
    }

    console.table(selectedChat);

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className='overflow-y-auto'>
                <SheetHeader>
                    <SheetTitle>Contact Info</SheetTitle>
                    <SheetDescription>
                        User details and information
                    </SheetDescription>
                </SheetHeader>

                <div className="px-4 flex flex-col gap-4 pb-4 overflow-y-auto h-full">
                    {/* Avatar and Basic Info */}
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                            <Avatar className="w-24 h-24">
                                <AvatarImage
                                    src={selectedChat.avatarUrl || undefined}
                                    alt={selectedChat.displayName || "User"}
                                />
                                <AvatarFallback className="text-2xl">
                                    {(selectedChat.displayName || selectedChat.name || 'U')[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {selectedChat.isOnline && (
                                <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-background rounded-full" />
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <h3 className="text-xl font-semibold">
                                {selectedChat.displayName || selectedChat.name || 'Unknown User'}
                            </h3>
                        </div>

                        {/* <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span className={selectedChat.isOnline ? "text-green-600 font-medium" : ""}>
                                {selectedChat.isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div> */}
                    </div>

                    {/* Username */}
                    {selectedChat.username && (
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Username</label>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <AtSign className="h-4 w-4" />
                                <span>{selectedChat.username}</span>
                            </div>
                        </div>
                    )}

                    {/* Created/Joined Date */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Created</label>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{moment(selectedChat.createdAt).format('MMMM D, YYYY')}</span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
