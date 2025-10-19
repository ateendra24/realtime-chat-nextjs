import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Info, Search } from "lucide-react";
import { GroupInfoSheet } from "@/components/GroupInfoSheet";
import { SearchMessages } from './SearchMessages';
import { EncryptionStatus } from './EncryptionStatus';

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
    onSearch?: (query: string) => void;
    searchResultCount?: number;
    currentSearchResultIndex?: number;
    onNextSearchResult?: () => void;
    onPrevSearchResult?: () => void;
}

export function ChatHeader({
    selectedChat,
    onLeaveGroup,
    onUpdateGroup,
    onRemoveMember,
    onRefreshMembers,
    onSearch,
    searchResultCount,
    currentSearchResultIndex,
    onNextSearchResult,
    onPrevSearchResult,
}: ChatHeaderProps) {
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleHeaderClick = () => {
        if (selectedChat?.type === 'group') {
            setIsGroupInfoOpen(true);
        }
    };

    useEffect(() => {
        if (onSearch) {
            onSearch(searchQuery);
        }
    }, [searchQuery, onSearch]);

    return (
        <>
            <div className="flex items-center justify-between p-3 border-b relative">
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

                <div className="flex items-center space-x-2">
                    {selectedChat && (
                        <>
                            <EncryptionStatus chatId={selectedChat.id} />
                            <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
                                <Search className="h-5 w-5" />
                            </Button>
                        </>
                    )}
                    {selectedChat?.type === 'group' && (
                        <Button variant="ghost" size="icon" onClick={() => setIsGroupInfoOpen(true)}>
                            <Info className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {showSearch && (
                <SearchMessages
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchResultCount={searchResultCount || 0}
                    currentResultIndex={currentSearchResultIndex || 0}
                    handleNextResult={onNextSearchResult || (() => { })}
                    handlePrevResult={onPrevSearchResult || (() => { })}
                    onClose={() => { setShowSearch(false); setSearchQuery(''); }}
                />
            )}

            {selectedChat?.type === 'group' && (
                <GroupInfoSheet
                    isOpen={isGroupInfoOpen}
                    onOpenChange={setIsGroupInfoOpen}
                    selectedChat={selectedChat}
                    onLeaveGroup={onLeaveGroup}
                    onUpdateGroup={onUpdateGroup}
                    onRemoveMember={onRemoveMember}
                    onRefreshMembers={onRefreshMembers}
                />
            )}
        </>
    );
}
