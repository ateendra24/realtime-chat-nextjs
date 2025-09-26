"use client";
import React, { useEffect } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { ChatList } from "@/components/ChatList";
import UserFooter from "@/components/UserFooter";
import { AuthPage } from "@/components/AuthPage";
import { ChatHeader } from "@/components/ChatHeader";
import { Messages } from "@/components/Messages";
import { MessageInput } from "@/components/MessageInput";
import { ChatDialogs } from "@/components/ChatDialogs";
import { useChatLogic } from "@/hooks/useChatLogic";

export default function ChatPage() {
    const {
        // State
        messages,
        input,
        setInput,
        selectedChat,
        setSelectedChat,
        showCreateGroup,
        setShowCreateGroup,
        showUserSearch,
        setShowUserSearch,
        chatListRefresh,
        messagesLoading,
        hasMoreMessages,
        loadingMoreMessages,
        scrollAreaRef,
        messagesEndRef,
        user,
        isLoaded,

        // Functions
        sendMessage,
        handleKeyPress,
        handleChatSelect,
        loadMoreMessages,
        handleGroupCreated,
        handleDirectChat,
        handleLeaveGroup,
        handleUpdateGroup,
        handleRemoveMember,
        refreshMembers,
        handleReaction,
        handleEditMessage,
        handleDeleteMessage,
        // Search
        setSearchQuery,
        searchResults,
        currentSearchResultIndex,
        handleNextSearchResult,
        handlePrevSearchResult,
    } = useChatLogic();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedChat(null);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [setSelectedChat]);

    if (!isLoaded) {
        return <AuthPage type="loading" />;
    }

    return (
        <SidebarProvider>
            <div className="flex h-dvh w-full">
                <Sidebar>
                    <SidebarContent className="flex-1 overflow-hidden rounded-3xl!">
                        <ChatList
                            onChatSelect={handleChatSelect}
                            onCreateGroup={() => setShowCreateGroup(true)}
                            onSearchUsers={() => setShowUserSearch(true)}
                            selectedChatId={selectedChat?.id}
                            refreshTrigger={chatListRefresh}
                        />
                    </SidebarContent>

                    <SidebarFooter className="pb-4 pt-0">
                        <UserFooter />
                    </SidebarFooter>
                </Sidebar>

                <SidebarInset className="flex-1 bg-transparent! relative">
                    <ChatHeader
                        selectedChat={selectedChat}
                        onLeaveGroup={handleLeaveGroup}
                        onUpdateGroup={handleUpdateGroup}
                        onRemoveMember={handleRemoveMember}
                        onRefreshMembers={refreshMembers}
                        onSearch={setSearchQuery}
                        searchResultCount={searchResults.length}
                        currentSearchResultIndex={currentSearchResultIndex}
                        onNextSearchResult={handleNextSearchResult}
                        onPrevSearchResult={handlePrevSearchResult}
                    />

                    <Messages
                        selectedChat={selectedChat}
                        messages={messages}
                        messagesLoading={messagesLoading}
                        currentUserId={user?.id}
                        messagesEndRef={messagesEndRef}
                        scrollAreaRef={scrollAreaRef}
                        onReaction={handleReaction}
                        onEditMessage={handleEditMessage}
                        onDeleteMessage={handleDeleteMessage}
                        onLoadMoreMessages={loadMoreMessages}
                        hasMoreMessages={hasMoreMessages}
                        loadingMoreMessages={loadingMoreMessages}
                        searchResults={searchResults}
                        currentSearchResultIndex={currentSearchResultIndex}
                    />

                    <MessageInput
                        selectedChat={selectedChat}
                        input={input}
                        setInput={setInput}
                        onSendMessage={sendMessage}
                        onKeyPress={handleKeyPress}
                    />
                </SidebarInset>

                <ChatDialogs
                    showUserSearch={showUserSearch}
                    setShowUserSearch={setShowUserSearch}
                    showCreateGroup={showCreateGroup}
                    setShowCreateGroup={setShowCreateGroup}
                    onDirectChat={handleDirectChat}
                    onGroupCreated={handleGroupCreated}
                />
            </div>
        </SidebarProvider>
    );
}
