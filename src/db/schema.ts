import { pgTable, text, timestamp, boolean, uuid, pgEnum, integer, varchar, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const chatTypeEnum = pgEnum('chat_type', ['direct', 'group']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'file', 'system']);
export const participantRoleEnum = pgEnum('participant_role', ['member', 'admin', 'owner']);

// Users table (extends Clerk user data)
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  usernameIdx: index("users_username_idx").on(table.username),
  emailIdx: index("users_email_idx").on(table.email),
  // For full-text search - will create via migration
}));

// Chats table (both direct and group chats)
export const chats = pgTable("chats", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }),
  description: text("description"),
  type: chatTypeEnum("type").notNull().default('direct'),
  avatarUrl: text("avatar_url"),
  avatarFileId: text("avatar_file_id"), // ImageKit file ID for deletion
  createdBy: text("created_by").notNull().references(() => users.id),
  lastMessageId: uuid("last_message_id"),
  lastMessageAt: timestamp("last_message_at"),
  lastMessageContent: text("last_message_content"), // Cached last message content
  lastMessageUserId: text("last_message_user_id").references(() => users.id), // Cached last message sender
  lastMessageUserName: varchar("last_message_user_name", { length: 100 }), // Cached sender name
  messageCount: integer("message_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  lastMessageAtIdx: index("chats_last_message_at_idx").on(table.lastMessageAt),
  isActiveIdx: index("chats_is_active_idx").on(table.isActive),
  typeIdx: index("chats_type_idx").on(table.type),
}));

// Chat participants (many-to-many relationship)
export const chatParticipants = pgTable("chat_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: participantRoleEnum("role").notNull().default('member'),
  lastReadMessageId: uuid("last_read_message_id"),
  lastReadAt: timestamp("last_read_at"),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
}, (table) => ({
  chatUserUnique: unique().on(table.chatId, table.userId),
  userIdIdx: index("chat_participants_user_id_idx").on(table.userId),
  chatIdIdx: index("chat_participants_chat_id_idx").on(table.chatId),
  userChatIdx: index("chat_participants_user_chat_idx").on(table.userId, table.chatId),
  lastReadIdx: index("chat_participants_last_read_idx").on(table.chatId, table.lastReadMessageId),
}));

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  type: messageTypeEnum("type").notNull().default('text'),
  replyToId: uuid("reply_to_id"),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  chatIdIdx: index("messages_chat_id_idx").on(table.chatId),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  chatIdCreatedAtIdx: index("messages_chat_id_created_at_idx").on(table.chatId, table.createdAt),
}));

// Message attachments (for images, files, etc.)
export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  blobUrl: text("blob_url").notNull(), // Vercel Blob URL
  thumbnailUrl: text("thumbnail_url"), // Optional thumbnail
  width: integer("width"), // Image dimensions
  height: integer("height"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Message reactions
export const messageReactions = pgTable("message_reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  messageUserEmojiUnique: unique().on(table.messageId, table.userId, table.emoji),
  messageIdIdx: index("message_reactions_message_id_idx").on(table.messageId),
}));

// User sessions for real-time presence (Pusher-based)
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chatParticipants: many(chatParticipants),
  messages: many(messages),
  createdChats: many(chats),
  messageReactions: many(messageReactions),
  sessions: many(userSessions),
}));

export const chatsRelations = relations(chats, ({ many, one }) => ({
  participants: many(chatParticipants),
  messages: many(messages),
  createdBy: one(users, {
    fields: [chats.createdBy],
    references: [users.id],
  }),
  lastMessage: one(messages, {
    fields: [chats.lastMessageId],
    references: [messages.id],
  }),
}));

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
  chat: one(chats, {
    fields: [chatParticipants.chatId],
    references: [chats.id],
  }),
  user: one(users, {
    fields: [chatParticipants.userId],
    references: [users.id],
  }),
  lastReadMessage: one(messages, {
    fields: [chatParticipants.lastReadMessageId],
    references: [messages.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
    relationName: "reply",
  }),
  replies: many(messages, {
    relationName: "reply",
  }),
  reactions: many(messageReactions),
  attachments: many(messageAttachments),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, {
    fields: [messageReactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));
