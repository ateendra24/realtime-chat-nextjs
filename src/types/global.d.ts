// Global type declarations for the chat application

// ============================================
// CORE ENTITIES
// ============================================

/**
 * Message attachment metadata (images, files, etc.)
 */
export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Message reaction data
 */
export interface MessageReaction {
  id: string;
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

/**
 * Chat message entity
 */
export interface Message {
  id: string;
  user: string;
  userId?: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'system';
  createdAt: Date;
  updatedAt?: Date;
  chatId?: string;
  avatarUrl?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isOptimistic?: boolean; // For optimistic UI updates
  attachment?: MessageAttachment;
  reactions?: MessageReaction[];
}

/**
 * Group member entity
 */
export interface GroupMember {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  role?: 'owner' | 'admin' | 'member';
  isOwner?: boolean;
  isOnline?: boolean;
  joinedAt?: string;
}

/**
 * Chat entity (group or direct)
 */
export interface Chat {
  id: string;
  name?: string;
  description?: string;
  type: 'direct' | 'group';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isAdmin?: boolean;
  role?: 'owner' | 'admin' | 'member';
  isOwner?: boolean;
  displayName?: string;
  username?: string;
  isOnline?: boolean;
  unreadCount?: number;
  members?: GroupMember[];
  memberCount?: number;
  lastMessage?: {
    content: string;
    createdAt: Date;
    userName: string;
  };
}

/**
 * User entity
 */
export interface User {
  id: string;
  username: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

/**
 * Group entity (simplified)
 */
export interface Group {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  memberCount?: number;
}

// ============================================
// REAL-TIME EVENTS
// ============================================

/**
 * Reaction update event data
 */
export interface ReactionUpdateData {
  messageId: string;
  emoji: string;
  action: 'added' | 'removed';
  reaction: MessageReaction | null;
  chatId: string;
  userId: string;
}

/**
 * Chat list update event data
 */
export interface ChatListUpdateData {
  chatId: string;
  lastMessage: {
    content: string;
    createdAt: string;
    userName: string;
    userId: string;
  };
}

/**
 * Global chat list update event data
 */
export interface GlobalChatListUpdateData {
  chatId: string;
  triggerRefresh: boolean;
}

/**
 * User presence event data
 */
export interface UserPresenceData {
  userId: string;
  userName?: string;
}

// ============================================
// REALTIME CLIENT INTERFACE
// ============================================

/**
 * Real-time client interface (Pusher implementation)
 */
export interface RealtimeClient {
  connect: () => void;
  disconnect: () => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  onMessage: (callback: (data: Message) => void) => void;
  onReactionUpdate: (callback: (data: ReactionUpdateData) => void) => void;
  onChatListUpdate: (callback: (data: ChatListUpdateData) => void) => void;
  onGlobalChatListUpdate: (callback: (data: GlobalChatListUpdateData) => void) => void;
  onUserOnline: (callback: (data: UserPresenceData) => void) => void;
  onUserOffline: (callback: (data: UserPresenceData) => void) => void;
  emitChatListUpdate: (data: ChatListUpdateData) => void;
  emitGlobalChatListUpdate: (data: GlobalChatListUpdateData) => void;
  cleanup: () => void;
  isConnected: boolean;
}

// ============================================
// COMPONENT PROPS
// ============================================

/**
 * Message input component props
 */
export interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  selectedChat: Chat | null;
  onImageSent?: (message: Message) => void;
}

/**
 * Messages component props
 */
export interface MessagesProps {
  selectedChat: Chat | null;
  messages: Message[];
  messagesLoading: boolean;
  currentUserId?: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  onReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onLoadMoreMessages?: () => void;
  hasMoreMessages?: boolean;
  loadingMoreMessages?: boolean;
  searchResults?: Message[];
  currentSearchResultIndex?: number;
}

/**
 * Message actions component props
 */
export interface MessageActionsProps {
  messageId: string;
  isOwnMessage: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

/**
 * Image message component props
 */
export interface ImageMessageProps {
  attachment: MessageAttachment;
  content?: string;
  className?: string;
}

/**
 * Chat list component props
 */
export interface ChatListProps {
  selectedChatId?: string | null;
  onChatSelect?: (chat: Chat) => void;
  onCreateGroup?: () => void;
  onSearchUsers?: () => void;
  refreshTrigger?: number;
}

/**
 * Chat header component props
 */
export interface ChatHeaderProps {
  selectedChat: Chat | null;
  onOpenGroupInfo?: () => void;
}

/**
 * Chat dialogs component props
 */
export interface ChatDialogsProps {
  showCreateGroup: boolean;
  setShowCreateGroup: (show: boolean) => void;
  showUserSearch: boolean;
  setShowUserSearch: (show: boolean) => void;
  onGroupCreated: (group: Chat) => void;
  onDirectChat: (user: User) => void;
}

/**
 * Create group component props
 */
export interface CreateGroupProps {
  onClose: () => void;
  onGroupCreated: (group: Group) => void;
}

/**
 * User search component props
 */
export interface UserSearchProps {
  onClose: () => void;
  onUserSelect: (user: User) => void;
}

/**
 * Group info sheet component props
 */
export interface GroupInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedChat: Chat | null;
  onLeaveGroup: (groupId: string) => void;
  onMembersChange?: () => void;
}

/**
 * Add members dialog component props
 */
export interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onMembersAdded?: () => void;
}

/**
 * Search messages component props
 */
export interface SearchMessagesProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Message[];
  currentResultIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Auth page loading props
 */
export interface LoadingPageProps {
  message?: string;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

/**
 * Image upload hook result
 */
export interface UseImageUploadResult {
  uploadImage: (file: File, chatId: string, content?: string) => Promise<UploadResult>;
  uploading: boolean;
  progress: number;
  error: string | null;
  clearError: () => void;
}

/**
 * Upload result from image upload
 */
export interface UploadResult {
  success: boolean;
  message?: {
    id: string;
    chatId: string;
    userId: string;
    content: string;
    type: 'image';
    createdAt: string;
    attachment: MessageAttachment;
  };
  error?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Message type literal
 */
export type MessageType = 'text' | 'image' | 'file' | 'system';

/**
 * User role in group
 */
export type UserRole = 'owner' | 'admin' | 'member';

/**
 * Chat type literal
 */
export type ChatType = 'direct' | 'group';

/**
 * Reaction action type
 */
export type ReactionAction = 'added' | 'removed';

declare global {
  // Add any global type declarations here if needed
}

export { };
