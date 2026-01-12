-- Allow authenticated users to update book status for checkout/return operations
-- This uses a SECURITY DEFINER function to bypass RLS while maintaining security

-- Function to update book status during checkout (bypasses RLS)
CREATE OR REPLACE FUNCTION checkout_book(
  p_book_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Only update if book is in a valid checkout state
  UPDATE books
  SET status = 'checked_out', hold_until = NULL
  WHERE id = p_book_id
    AND status IN ('available', 'on_hold_premium', 'on_hold_waitlist');

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$;

-- Function to return book status to available (bypasses RLS)
CREATE OR REPLACE FUNCTION return_book(
  p_book_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Only update if book is currently checked out
  UPDATE books
  SET status = 'available', hold_until = NULL
  WHERE id = p_book_id
    AND status = 'checked_out';

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$;

-- Function to set book on hold for premium users (bypasses RLS)
CREATE OR REPLACE FUNCTION set_book_on_hold_premium(
  p_book_id UUID,
  p_hold_until TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE books
  SET status = 'on_hold_premium', hold_until = p_hold_until
  WHERE id = p_book_id
    AND status IN ('available', 'checked_out');

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$;

-- Function to set book on hold for waitlist (bypasses RLS)
CREATE OR REPLACE FUNCTION set_book_on_hold_waitlist(
  p_book_id UUID,
  p_hold_until TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE books
  SET status = 'on_hold_waitlist', hold_until = p_hold_until
  WHERE id = p_book_id
    AND status IN ('available', 'on_hold_premium');

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$;

-- Function to set book as available (bypasses RLS)
CREATE OR REPLACE FUNCTION set_book_available(
  p_book_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE books
  SET status = 'available', hold_until = NULL
  WHERE id = p_book_id
    AND status IN ('on_hold_premium', 'on_hold_waitlist');

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION checkout_book(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION return_book(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_book_on_hold_premium(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION set_book_on_hold_waitlist(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION set_book_available(UUID) TO authenticated;
