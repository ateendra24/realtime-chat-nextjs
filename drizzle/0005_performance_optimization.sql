-- Performance Optimization Migration
-- Add indexes for faster queries

-- Users table indexes
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Full-text search for users (GIN index for fast text search)
CREATE INDEX IF NOT EXISTS users_search_idx ON users USING GIN(
  to_tsvector('english', 
    COALESCE(username, '') || ' ' || 
    COALESCE(full_name, '') || ' ' || 
    COALESCE(email, '')
  )
);

-- Chat participants indexes
CREATE INDEX IF NOT EXISTS chat_participants_user_id_idx ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS chat_participants_chat_id_idx ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS chat_participants_user_chat_idx ON chat_participants(user_id, chat_id);
CREATE INDEX IF NOT EXISTS chat_participants_last_read_idx ON chat_participants(chat_id, last_read_message_id);

-- Chats table indexes
CREATE INDEX IF NOT EXISTS chats_last_message_at_idx ON chats(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS chats_is_active_idx ON chats(is_active);
CREATE INDEX IF NOT EXISTS chats_type_idx ON chats(type);

-- Message reactions indexes (already exist but ensuring they're optimal)
CREATE INDEX IF NOT EXISTS message_reactions_message_emoji_idx ON message_reactions(message_id, emoji);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS messages_chat_not_deleted_idx ON messages(chat_id, created_at DESC) WHERE is_deleted = false;

-- Add statistics for better query planning
ANALYZE users;
ANALYZE chats;
ANALYZE chat_participants;
ANALYZE messages;
ANALYZE message_reactions;
