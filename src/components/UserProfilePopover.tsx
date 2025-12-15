"use client";
import React, { useEffect, useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, User as UserIcon, Calendar, AtSign } from "lucide-react";
import type { Chat } from '@/types/global';
import { Separator } from './ui/separator';

interface UserProfilePopoverProps {
    selectedChat: Chat;
    children: React.ReactNode;
}

interface UserProfile {
    id: string;
    username: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string;
    isOnline?: boolean;
    createdAt?: string;
}

export function UserProfilePopover({
    selectedChat,
    children,
}: UserProfilePopoverProps) {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/users/profile/${selectedChat.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setUserProfile(data);
                } else {
                    // Fallback to chat data
                    setUserProfile({
                        id: selectedChat.id,
                        username: selectedChat.username || 'Unknown',
                        fullName: selectedChat.displayName,
                        avatarUrl: selectedChat.avatarUrl,
                        isOnline: selectedChat.isOnline,
                    });
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                setLoading(false);
            }
        };

        if (open && selectedChat?.type === 'direct') {
            fetchUserProfile();
        }
    }, [open, selectedChat]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 bg-card rounded-3xl" align="start">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    </div>
                ) : userProfile ? (
                    <div className="space-y-4">
                        {/* Profile Picture & Name */}
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage
                                        src={userProfile.avatarUrl || undefined}
                                        alt={userProfile.fullName || userProfile.username}
                                    />
                                    <AvatarFallback className="text-xl">
                                        {(userProfile.fullName || userProfile.username)?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                {userProfile.isOnline && (
                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate">
                                    {userProfile.fullName || userProfile.username}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                    <AtSign className="inline-block w-4 h-4 mr-1" />{userProfile.username}
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {/* User Details */}
                        <div className="space-y-3">
                            {/* Email */}
                            <div className="flex items-start space-x-3">
                                <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="text-sm font-medium truncate">{userProfile.email}</p>
                                </div>
                            </div>

                            {/* Username */}
                            <div className="flex items-start space-x-3">
                                <UserIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Username</p>
                                    <p className="text-sm font-medium truncate"><AtSign className="inline-block w-3 h-3 mr-0.5" />{userProfile.username}</p>
                                </div>
                            </div>

                            {/* Member Since */}
                            <div className="flex items-start space-x-3">
                                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">Member Since</p>
                                    <p className="text-sm font-medium">{formatDate(userProfile.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-muted-foreground">Failed to load profile</div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
