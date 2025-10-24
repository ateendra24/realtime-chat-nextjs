"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, X, Check } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface User {
    id: string;
    username: string;
    fullName?: string;
    email: string;
    avatarUrl?: string;
}

interface AddMembersDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    onMembersAdded?: () => void;
}

export function AddMembersDialog({
    isOpen,
    onOpenChange,
    groupId,
    onMembersAdded
}: AddMembersDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Search for users
    useEffect(() => {
        const searchUsers = async () => {
            if (debouncedSearchQuery.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const response = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
                if (response.ok) {
                    const data = await response.json();
                    setSearchResults(data.users || []);
                } else {
                    console.error('Failed to search users');
                    setSearchResults([]);
                }
            } catch (error) {
                console.error('Error searching users:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        searchUsers();
    }, [debouncedSearchQuery]);

    const handleUserToggle = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleAddMembers = async () => {
        if (selectedUsers.size === 0) return;

        setIsAdding(true);
        try {
            const response = await fetch(`/api/groups/${groupId}/members/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userIds: Array.from(selectedUsers)
                }),
            });

            if (response.ok) {
                // Reset state
                setSelectedUsers(new Set());
                setSearchQuery('');
                setSearchResults([]);

                // Close dialog and refresh members
                onOpenChange(false);
                if (onMembersAdded) {
                    onMembersAdded();
                }
            } else {
                const error = await response.json();
                console.error('Failed to add members:', error);
                alert(error.error || 'Failed to add members');
            }
        } catch (error) {
            console.error('Error adding members:', error);
            alert('Failed to add members');
        } finally {
            setIsAdding(false);
        }
    };

    const handleClose = () => {
        setSelectedUsers(new Set());
        setSearchQuery('');
        setSearchResults([]);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Members</DialogTitle>
                    <DialogDescription>
                        Search for users to add to the group
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by username, name, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Selected Users */}
                    {selectedUsers.size > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Selected Users</label>
                                <Badge variant="secondary">{selectedUsers.size}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(selectedUsers).map(userId => {
                                    const user = searchResults.find(u => u.id === userId);
                                    if (!user) return null;

                                    return (
                                        <Badge key={userId} variant="default" className="flex items-center gap-1">
                                            {user.fullName || user.username}
                                            <button
                                                onClick={() => handleUserToggle(userId)}
                                                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Search Results</label>
                        <ScrollArea className="h-64 border rounded-md">
                            {isSearching ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="text-sm text-muted-foreground">Searching...</div>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="text-sm text-muted-foreground">
                                        {searchQuery.length < 2
                                            ? "Type at least 2 characters to search"
                                            : "No users found"
                                        }
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {searchResults.map((user) => {
                                        const isSelected = selectedUsers.has(user.id);

                                        return (
                                            <div
                                                key={user.id}
                                                onClick={() => handleUserToggle(user.id)}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected
                                                    ? 'bg-primary/10 border border-primary/20'
                                                    : 'hover:bg-muted/50'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarImage src={user.avatarUrl} alt={user.fullName || user.username} />
                                                        <AvatarFallback>
                                                            {(user.fullName || user.username)[0]?.toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {user.fullName || user.username}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            @{user.username}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <Check className="h-4 w-4 text-primary" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddMembers}
                            disabled={selectedUsers.size === 0 || isAdding}
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            {isAdding ? 'Adding...' : `Add ${selectedUsers.size} Member${selectedUsers.size !== 1 ? 's' : ''}`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
