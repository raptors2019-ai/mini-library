-- Add hold_started_at column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS hold_started_at TIMESTAMPTZ;

-- Update the status check constraint to include new hold statuses
-- First drop the old constraint if it exists
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;

-- Add the new constraint with all statuses
ALTER TABLE books ADD CONSTRAINT books_status_check
  CHECK (status IN ('available', 'checked_out', 'on_hold', 'on_hold_premium', 'on_hold_waitlist', 'inactive'));

-- Create index on hold_started_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_books_hold_started_at ON books(hold_started_at) WHERE hold_started_at IS NOT NULL;

-- Comment on the new column
COMMENT ON COLUMN books.hold_started_at IS 'Timestamp when the book entered a hold status. Used to calculate hold phase transitions.';
