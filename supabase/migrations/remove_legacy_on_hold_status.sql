-- Migration: Remove legacy on_hold status
-- Any books currently on_hold (legacy) should become available
-- The new flow uses on_hold_premium and on_hold_waitlist instead

-- Convert any legacy on_hold books to available
UPDATE books
SET status = 'available', hold_until = NULL
WHERE status = 'on_hold';

-- Update the status constraint to remove on_hold
-- First drop the existing constraint
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;

-- Add new constraint without on_hold
ALTER TABLE books ADD CONSTRAINT books_status_check
CHECK (status IN ('available', 'checked_out', 'on_hold_premium', 'on_hold_waitlist', 'inactive'));
