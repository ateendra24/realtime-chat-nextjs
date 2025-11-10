import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CreateGroup } from "@/components/CreateGroup";
import { UserSearch } from "@/components/UserSearch";

interface User {
    id: string;
    username: string;
    fullName?: string;
    email: string;
    avatarUrl?: string;
}

interface Group {
    id: string;
    name: string;
    description?: string;
    type: 'group';
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
}

interface ChatDialogsProps {
    showUserSearch: boolean;
    setShowUserSearch: (show: boolean) => void;
    showCreateGroup: boolean;
    setShowCreateGroup: (show: boolean) => void;
    onDirectChat: (user: User) => void;
    onGroupCreated: (group: Group) => void;
}

export function ChatDialogs({
    showUserSearch,
    setShowUserSearch,
    showCreateGroup,
    setShowCreateGroup,
    onDirectChat,
    onGroupCreated
}: ChatDialogsProps) {
    return (
        <>
            {/* User Search Dialog */}
            <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Search Users</DialogTitle>
                        <DialogDescription>
                            Find users to start a direct conversation with.
                        </DialogDescription>
                    </DialogHeader>
                    <UserSearch
                        showDirectChatOption={true}
                        onDirectChat={(user) => {
                            onDirectChat(user);
                            setShowUserSearch(false);
                        }}
                        placeholder="Search users to chat with... eg: Ateendra"
                    />
                </DialogContent>
            </Dialog>

            {/* Create Group Dialog */}
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Group</DialogTitle>
                        <DialogDescription>
                            Create a new group chat and invite members.
                        </DialogDescription>
                    </DialogHeader>
                    <CreateGroup
                        onGroupCreated={(group) => {
                            onGroupCreated(group);
                            setShowCreateGroup(false);
                        }}
                        onCancel={() => setShowCreateGroup(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
