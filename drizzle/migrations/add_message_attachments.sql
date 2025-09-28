-- Migration: Add message attachments support
-- This migration adds support for image and file attachments to messages

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS "message_attachments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
    "file_name" varchar(255) NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" varchar(100) NOT NULL,
    "blob_url" text NOT NULL,
    "thumbnail_url" text,
    "width" integer,
    "height" integer,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "message_attachments_message_id_idx" ON "message_attachments"("message_id");
CREATE INDEX IF NOT EXISTS "message_attachments_mime_type_idx" ON "message_attachments"("mime_type");