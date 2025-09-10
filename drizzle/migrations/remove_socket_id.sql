-- Remove socketId column from user_sessions table as we're using Pusher instead of Socket.IO
ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "socket_id";
