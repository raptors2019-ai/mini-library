-- Add AI enrichment fields to book_requests table
-- This allows admins to preview AI-generated content before approving requests

-- Add ai_summary column to store generated summary before book creation
ALTER TABLE book_requests ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add enriched_at timestamp to track when AI enrichment was performed
ALTER TABLE book_requests ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN book_requests.ai_summary IS 'AI-generated book summary, created during admin review before approval';
COMMENT ON COLUMN book_requests.enriched_at IS 'Timestamp when AI enrichment was performed on this request';
