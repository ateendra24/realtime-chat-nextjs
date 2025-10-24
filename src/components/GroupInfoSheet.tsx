"use client";

import React, { useState, useRef } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Edit2,
    Save,
    X,
    Users,
    Calendar,
    UserMinus,
    LogOut,
    Crown,
    Camera,
    UserPlus,
    Upload,
    Trash2,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import moment from 'moment';
import { ScrollArea } from './ui/scroll-area';
import { AddMembersDialog } from './AddMembersDialog';

interface GroupMember {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    role?: 'member' | 'admin' | 'owner';
    isAdmin?: boolean; // For backward compatibility
    isOwner?: boolean;
    isOnline?: boolean;
    lastSeen?: string;
    joinedAt?: string;
}

interface Chat {
    id: string;
    name?: string;
    description?: string;
    type: 'direct' | 'group';
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
    role?: 'member' | 'admin' | 'owner';
    isAdmin?: boolean; // For backward compatibility
    isOwner?: boolean;
    displayName?: string;
    username?: string;
    members?: GroupMember[];
    memberCount?: number;
}

interface GroupInfoSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedChat: Chat | null;
    onLeaveGroup?: (groupId: string) => void;
    onUpdateGroup?: (groupId: string, updates: { name?: string; description?: string; avatarUrl?: string | null }) => void;
    onRemoveMember?: (groupId: string, memberId: string) => void;
    onRefreshMembers?: () => void;
}

export function GroupInfoSheet({
    isOpen,
    onOpenChange,
    selectedChat,
    onLeaveGroup,
    onUpdateGroup,
    onRemoveMember,
    onRefreshMembers
}: GroupInfoSheetProps) {
    const { user } = useUser();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Only show for group chats
    if (!selectedChat || selectedChat.type !== 'group') {
        return null;
    }

    const isCurrentUserAdmin = selectedChat.isAdmin || selectedChat.role === 'admin' || selectedChat.role === 'owner';
    const isCurrentUserOwner = selectedChat.isOwner || selectedChat.role === 'owner';
    const members = selectedChat.members || [];

    const handleEditStart = () => {
        setEditName(selectedChat.displayName || selectedChat.name || '');
        setEditDescription(selectedChat.description || '');
        setIsEditing(true);
    };

    const handleEditSave = () => {
        if (onUpdateGroup) {
            onUpdateGroup(selectedChat.id, {
                name: editName,
                description: editDescription
            });
        }
        setIsEditing(false);
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditName('');
        setEditDescription('');
    };

    const handleLeaveGroup = () => {
        if (onLeaveGroup && confirm('Are you sure you want to leave this group?')) {
            onLeaveGroup(selectedChat.id);
            onOpenChange(false);
        }
    };

    const handleRemoveMember = (memberId: string, memberName: string) => {
        if (onRemoveMember && confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
            onRemoveMember(selectedChat.id, memberId);
        }
    };

    const handleMembersAdded = () => {
        // Refresh the members list after adding new members
        if (onRefreshMembers) {
            onRefreshMembers();
        }
    };

    const handleAvatarUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setIsUploadingAvatar(true);

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch(`/api/groups/${selectedChat.id}/avatar`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                if (onUpdateGroup) {
                    onUpdateGroup(selectedChat.id, { avatarUrl: result.avatarUrl });
                }
            } else {
                const error = await response.text();
                console.error('Error uploading avatar:', error);
                alert('Failed to upload avatar. Please try again.');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload avatar. Please try again.');
        } finally {
            setIsUploadingAvatar(false);
            // Clear the input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteAvatar = async () => {
        if (!confirm('Are you sure you want to delete the group avatar?')) {
            return;
        }

        setIsUploadingAvatar(true);

        try {
            const response = await fetch(`/api/groups/${selectedChat.id}/avatar`, {
                method: 'DELETE',
            });

            if (response.ok) {
                if (onUpdateGroup) {
                    onUpdateGroup(selectedChat.id, { avatarUrl: null });
                }
            } else {
                const error = await response.text();
                console.error('Error deleting avatar:', error);
                alert('Failed to delete avatar. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting avatar:', error);
            alert('Failed to delete avatar. Please try again.');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className='overflow-y-auto'>
                <SheetHeader>
                    <SheetTitle>Group Information</SheetTitle>
                    <SheetDescription>
                        View and manage group details and members
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 px-4 pb-4 overflow-y-auto">{/* Group Avatar and Basic Info */}
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                            <Avatar className="w-24 h-24">
                                <AvatarImage
                                    src={selectedChat.avatarUrl || undefined}
                                    alt={selectedChat.displayName || "Group"}
                                />
                                <AvatarFallback className="text-2xl">
                                    {(selectedChat.displayName || selectedChat.name || 'G')[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {isCurrentUserAdmin && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                                            disabled={isUploadingAvatar}
                                        >
                                            {isUploadingAvatar ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                            ) : (
                                                <Camera className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleAvatarUpload}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Photo
                                        </DropdownMenuItem>
                                        {selectedChat.avatarUrl && (
                                            <DropdownMenuItem
                                                onClick={handleDeleteAvatar}
                                                className="hover:bg-destructive! hover:text-destructive-foreground!"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2 hover:text-destructive-foreground!" />
                                                Remove Photo
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        {/* Group Name */}
                        {isEditing ? (
                            <div className="w-full space-y-2">
                                <Input
                                    value={editName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                                    placeholder="Group name"
                                    className="text-center font-semibold"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <h3 className="text-xl font-semibold">
                                    {selectedChat.displayName || selectedChat.name || 'Unnamed Group'}
                                </h3>
                                {isCurrentUserAdmin && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleEditStart}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Member Count */}
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{selectedChat.memberCount || members.length} members</span>
                        </div>
                    </div>

                    {/* Group Description */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Description</label>
                        {isEditing ? (
                            <Textarea
                                value={editDescription}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                                placeholder="Group description"
                                rows={3}
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {selectedChat.description || 'No description'}
                            </p>
                        )}
                    </div>

                    {/* Edit Controls */}
                    {isEditing && (
                        <div className="flex space-x-2">
                            <Button onClick={handleEditSave} size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                Save
                            </Button>
                            <Button onClick={handleEditCancel} variant="outline" size="sm">
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    )}

                    {/* Group Info */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Created</label>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{moment(selectedChat.createdAt).format('MMMM D, YYYY')}</span>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Members</label>
                            <div className="flex items-center space-x-2">
                                <Badge variant="secondary">
                                    {selectedChat.memberCount || members.length}
                                </Badge>
                                {isCurrentUserAdmin && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowAddMembersDialog(true)}
                                        className="h-8"
                                    >
                                        <UserPlus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                )}
                            </div>
                        </div>

                        <ScrollArea className="space-y-2 max-h-48 overflow-y-auto">
                            {members.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Loading members...</p>
                                    <p className="text-xs mt-1">This might take a moment</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {members.sort((a, b) => a.name.localeCompare(b.name)).map((member: GroupMember) => (
                                        <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                                                    <AvatarFallback>
                                                        {member.name[0]?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <p className="text-sm font-medium">{member.name}</p>
                                                        {member.isOnline && (
                                                            <div className="h-2 w-2 rounded-full bg-green-500" title="Online" />
                                                        )}
                                                        {(member.role === 'owner' || member.isOwner) && (
                                                            <Crown className="h-3 w-3 text-yellow-500" />
                                                        )}
                                                        {member.role === 'admin' && (
                                                            <Crown className="h-3 w-3 text-blue-500" />
                                                        )}
                                                        {member.isAdmin && !member.role && (
                                                            <Crown className="h-3 w-3 text-yellow-500" />
                                                        )}
                                                        {member.id === user?.id && (
                                                            <Badge variant="outline" className="text-xs">You</Badge>
                                                        )}
                                                    </div>
                                                    {member.username && (
                                                        <p className="text-xs text-muted-foreground">@{member.username}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Role-based member removal: Owners can remove anyone, Admins can remove members only */}
                                            {member.id !== user?.id && (
                                                (isCurrentUserOwner) ||
                                                (isCurrentUserAdmin && member.role === 'member' && !member.isAdmin)
                                            ) && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveMember(member.id, member.name)}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    >
                                                        <UserMinus className="h-4 w-4" />
                                                    </Button>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Leave Group Button */}
                    <div className="pt-4 border-t">
                        <Button
                            variant="destructive"
                            onClick={handleLeaveGroup}
                            className="w-full cursor-pointer hover:bg-destructive/80!"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Leave Group
                        </Button>
                    </div>
                </div>
            </SheetContent>

            {/* Add Members Dialog */}
            <AddMembersDialog
                isOpen={showAddMembersDialog}
                onOpenChange={setShowAddMembersDialog}
                groupId={selectedChat.id}
                onMembersAdded={handleMembersAdded}
            />
        </Sheet>
    );
}
