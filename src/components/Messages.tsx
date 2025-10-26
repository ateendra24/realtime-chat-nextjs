import React, { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, ChevronUp } from "lucide-react";
import { MessageActions } from "./MessageActions";
import { ImageMessage } from "./ImageMessage";
import moment from 'moment';
import type { Message, Chat, MessagesProps } from '@/types/global';

// Helper function to format date separator
const formatDateSeparator = (date: moment.Moment) => {
    const today = moment();
    const yesterday = moment().subtract(1, 'day');

    if (date.isSame(today, 'day')) {
        return 'Today';
    } else if (date.isSame(yesterday, 'day')) {
        return 'Yesterday';
    } else if (date.isSame(today, 'year')) {
        return date.format('dddd, MMMM D');
    } else {
        return date.format('dddd, MMMM D, YYYY');
    }
};

export function Messages({
    selectedChat,
    messages,
    messagesLoading,
    currentUserId,
    messagesEndRef,
    scrollAreaRef,
    onReaction,
    onEditMessage,
    onDeleteMessage,
    onLoadMoreMessages,
    hasMoreMessages = false,
    loadingMoreMessages = false,
    searchResults = [],
    currentSearchResultIndex = 0,
}: MessagesProps) {
    const messageRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    // Auto-scroll to current search result
    useEffect(() => {
        if (searchResults.length > 0 && searchResults[currentSearchResultIndex]) {
            const currentResultMessage = searchResults[currentSearchResultIndex];
            const messageElement = messageRefs.current[currentResultMessage.id];
            
            if (messageElement) {
                messageElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }
    }, [currentSearchResultIndex, searchResults]);

    return (
        <ScrollArea ref={scrollAreaRef} className={`flex-1 overflow-y-auto relative ${selectedChat && 'bg-[url("/bg.png")] dark:bg-[url("/bg-dark.png")] '}`}>
            <div className="p-4 h-full">
                {!selectedChat ? (
                    <div className="h-[85vh] flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                        <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-40 animate-pulse" />
                        <p className="text-xl font-semibold mb-2">Welcome to Chat App!</p>
                        <p className="text-sm opacity-70">Select a chat from the sidebar or create a new group to start messaging.</p>
                    </div>
                ) : messagesLoading ? (
                    <div className="h-[75vh] flex flex-col items-center justify-center text-center text-muted-foreground py-4">
                        <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                        <p className="text-sm font-medium">Loading messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-[75vh] flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                        <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-40" />
                        <p className="text-lg font-semibold mb-1">No messages yet</p>
                        <p className="text-sm opacity-70">Start the conversation!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Load More Messages Button */}
                        {hasMoreMessages && (
                            <div className="flex justify-center py-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onLoadMoreMessages}
                                    disabled={loadingMoreMessages}
                                    className="text-xs text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all rounded-full"
                                >
                                    {loadingMoreMessages ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <ChevronUp className="h-4 w-4 mr-2" />
                                            Load older messages
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Messages List */}
                        {messages.map((message, index) => {
                            const isCurrentUser = message.userId === currentUserId;
                            const isGroupChat = selectedChat.type === 'group';
                            const formattedTime = moment(message.createdAt).format('LT');
                            const isSearchResult = searchResults.length > 0 && searchResults[currentSearchResultIndex]?.id === message.id;


                            // Date and grouping logic
                            const showDate = index === 0 || !moment(message.createdAt).isSame(moment(messages[index - 1].createdAt), 'day');
                            const isSameUserAsPrev = index > 0 && messages[index - 1].userId === message.userId && !showDate;
                            const isSameUserAsNext = index < messages.length - 1 && messages[index + 1].userId === message.userId &&
                                moment(message.createdAt).isSame(moment(messages[index + 1].createdAt), 'day');

                            const shouldShowAvatar = isGroupChat && !isSameUserAsPrev;
                            const shouldShowTimestamp = !isSameUserAsNext;

                            return (
                                <React.Fragment key={`${message.id}-${index}`}>

                                    {/* Date Separator */}
                                    {showDate && (
                                        <div className="flex justify-center my-4">
                                            <div className="bg-muted/60 text-muted-foreground text-xs px-3 py-1.5 rounded-full shadow-sm">
                                                {formatDateSeparator(moment(message.createdAt))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Message */}
                                    <div
                                        ref={el => { messageRefs.current[message.id] = el; }}
                                        className={`group flex items-start space-x-3 ${isSameUserAsPrev ? 'mb-1' : 'mb-3'} ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''} ${isSearchResult && 'bg-primary/10'}`}
                                        data-message-id={message.id}
                                    >
                                        {shouldShowAvatar ? (
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={message.avatarUrl} alt={message.user || 'User'} />
                                                <AvatarFallback>{(message.user || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        ) : isGroupChat ? (
                                            <div className="w-8 h-8" />
                                        ) : null}

                                        <div className={`flex-1 max-w-xs ${isCurrentUser ? 'text-right' : ''}`}>
                                            {shouldShowAvatar && !isCurrentUser && (
                                                <p className="font-semibold text-sm mb-1.5 text-foreground/90">{message.user || 'Unknown User'}</p>
                                            )}
                                            <div className={`relative w-fit ${isCurrentUser && 'ml-auto'} group`}>
                                                {/* Message Content */}
                                                {message.isDeleted ? (
                                                    <div className={`px-4 py-2.5 rounded-2xl w-fit relative shadow-sm ${isCurrentUser ? 'bg-primary/90 ml-auto' : 'bg-muted'} ${message.isOptimistic ? 'opacity-70' : ''}`}>
                                                        <p className="text-sm">
                                                            <em className="text-muted-foreground/80">This message was deleted</em>
                                                        </p>
                                                    </div>
                                                ) : message.type === 'image' && message.attachment ? (
                                                    <div className={`relative ${message.isOptimistic ? 'opacity-70' : ''}`}>
                                                        <ImageMessage
                                                            attachment={message.attachment}
                                                            content={message.content}
                                                            className={isCurrentUser ? 'ml-auto' : ''}
                                                        />
                                                        {/* Show loading indicator for optimistic messages */}
                                                        {message.isOptimistic && (
                                                            <div className="absolute -right-1 -top-1 bg-background rounded-full p-1 shadow-sm">
                                                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className={`px-4 py-2.5 rounded-xl w-fit relative shadow-sm hover:shadow-md transition-all ${isCurrentUser ? 'bg-primary/90 ml-auto text-primary-foreground' : 'bg-muted hover:bg-muted/80'} ${message.isOptimistic ? 'opacity-70' : ''}`}>
                                                        <p className="text-sm leading-relaxed">
                                                            {message.content}
                                                            {message.isEdited && (
                                                                <span className="text-xs opacity-70 ml-2 italic">(edited)</span>
                                                            )}
                                                        </p>

                                                        {/* Show loading indicator for optimistic messages */}
                                                        {message.isOptimistic && (
                                                            <div className="absolute -right-1 -top-1 bg-background rounded-full p-1 shadow-sm">
                                                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Message Actions */}
                                                {!message.isDeleted && (
                                                    <div className={`absolute top-0 ${isCurrentUser ? '-left-7' : '-right-7'}`}>
                                                        <MessageActions
                                                            messageId={message.id}
                                                            isOwnMessage={message.userId === currentUserId}
                                                            onReaction={onReaction || (() => { })}
                                                            onEdit={onEditMessage}
                                                            onDelete={onDeleteMessage}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Message Reactions */}
                                            {message.reactions && message.reactions.length > 0 && (
                                                <div className={`flex flex-wrap gap-1.5 mt-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                                    {message.reactions.map((reaction, index) => {
                                                        return (
                                                            <div
                                                                key={reaction?.id || `${reaction?.emoji || 'emoji'}-${reaction?.count || 0}-${index}`}
                                                                className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs border cursor-pointer transition-all hover:scale-110 shadow-sm ${(reaction && typeof reaction.hasReacted === 'boolean' && reaction.hasReacted)
                                                                    ? 'bg-primary/25 border-primary text-black dark:text-white font-semibold'
                                                                    : 'bg-muted border-muted-foreground/20 hover:bg-muted/80'
                                                                    }`}
                                                                title={`${reaction?.count || 0} reaction${(reaction?.count || 0) > 1 ? 's' : ''}`}
                                                                onClick={() => reaction?.emoji && onReaction?.(message.id, reaction.emoji)}
                                                            >
                                                                <span>{reaction?.emoji || '?'}</span>
                                                                <span className="font-medium">{reaction?.count || 0}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {shouldShowTimestamp && (
                                                <span className={`text-[10px] text-muted-foreground mt-1 block ${isCurrentUser ? 'text-right text-white/70' : 'text-left'}`}>
                                                    {formattedTime}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
                {/* Scroll anchor - always at the bottom */}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
}
