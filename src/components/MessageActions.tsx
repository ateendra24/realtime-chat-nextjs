"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, Laugh, ThumbsUp, ThumbsDown, MoreHorizontal, Edit, Trash } from "lucide-react";

interface MessageActionsProps {
    messageId: string;
    isOwnMessage: boolean;
    onReaction: (messageId: string, emoji: string) => void;
    onEdit?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
    messageTimestamp: string;
    messageCreatedAt?: Date | string;
}

const COMMON_REACTIONS = [
    { emoji: "👍", icon: ThumbsUp, label: "Like" },
    { emoji: "👎", icon: ThumbsDown, label: "Dislike" },
    { emoji: "❤️", icon: Heart, label: "Love" },
    { emoji: "😂", icon: Laugh, label: "Laugh" },
];

export function MessageActions({
    messageId,
    isOwnMessage,
    onReaction,
    onEdit,
    onDelete,
    messageTimestamp,
    messageCreatedAt
}: MessageActionsProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Check if message is within 30 minutes
    const canEdit = () => {
        if (!messageCreatedAt) return false;
        const thirtyMinutesInMs = 30 * 60 * 1000;
        const messageAge = Date.now() - new Date(messageCreatedAt).getTime();
        return messageAge <= thirtyMinutesInMs;
    };

    const handleReaction = (emoji: string) => {
        onReaction(messageId, emoji);
        setIsOpen(false);
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(messageId);
        }
        setIsOpen(false);
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(messageId);
        }
        setIsOpen(false);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <MoreHorizontal className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
                {/* Quick Reactions */}
                <div className="flex items-center justify-around p-1 border-b">
                    {COMMON_REACTIONS.map(({ emoji, label }) => (
                        <Button
                            key={emoji}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-base hover:bg-muted"
                            onClick={() => handleReaction(emoji)}
                            title={label}
                        >
                            {emoji}
                        </Button>
                    ))}
                </div>

                {/* Message Actions */}
                {isOwnMessage && (
                    <>
                        {canEdit() && onEdit && (
                            <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit message
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            onClick={handleDelete}
                            className="cursor-pointer hover:bg-destructive! hover:text-destructive-foreground!"
                        >
                            <Trash className="mr-2 h-4 w-4 hover:text-destructive-foreground!" />
                            Delete message
                        </DropdownMenuItem>
                    </>
                )}

                <DropdownMenuLabel className="flex items-center gap-2 opacity-80 float-end text-xs">
                    {messageTimestamp}
                </DropdownMenuLabel>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
