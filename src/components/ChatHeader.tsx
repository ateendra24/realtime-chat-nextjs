import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { GroupInfoSheet } from "@/components/GroupInfoSheet";

interface Chat {
    id: string;
    name?: string;
    description?: string;
    type: 'direct' | 'group';
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
    isAdmin?: boolean;
    displayName?: string;
    username?: string;
}

interface ChatHeaderProps {
    selectedChat: Chat | null;
    onLeaveGroup?: (groupId: string) => void;
    onUpdateGroup?: (groupId: string, updates: { name?: string; description?: string; avatarUrl?: string | null }) => void;
    onRemoveMember?: (groupId: string, memberId: string) => void;
    onRefreshMembers?: () => void;
}

export function ChatHeader({
    selectedChat,
    onLeaveGroup,
    onUpdateGroup,
    onRemoveMember,
    onRefreshMembers
}: ChatHeaderProps) {
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

    const handleHeaderClick = () => {
        if (selectedChat?.type === 'group') {
            setIsGroupInfoOpen(true);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center space-x-3">
                    <SidebarTrigger />
                    {selectedChat && (
                        <>
                            <Avatar className="w-8 h-8">
                                <AvatarImage
                                    src={selectedChat.avatarUrl || undefined}
                                    alt={selectedChat.displayName || "Chat"}
                                />
                                <AvatarFallback>
                                    {selectedChat.displayName?.[0]?.toUpperCase() || 'C'}
                                </AvatarFallback>
                            </Avatar>
                            <div className={`${selectedChat?.type === 'group' && 'cursor-pointer'}`} onClick={handleHeaderClick}>
                                <h2 className="font-semibold">
                                    {selectedChat.displayName || selectedChat.name || 'Chat'}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {selectedChat.type === 'group'
                                        ? 'Group chat'
                                        : 'Direct message'
                                    }
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Group Info Button */}
                {selectedChat?.type === 'group' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleHeaderClick}
                        className="h-8 w-8 p-0"
                    >
                        <Info className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Group Info Sheet */}
            <GroupInfoSheet
                isOpen={isGroupInfoOpen}
                onOpenChange={setIsGroupInfoOpen}
                selectedChat={selectedChat}
                onLeaveGroup={onLeaveGroup}
                onUpdateGroup={onUpdateGroup}
                onRemoveMember={onRemoveMember}
                onRefreshMembers={onRefreshMembers}
            />
        </>
    );
}
