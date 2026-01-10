-- Book Requests Table
-- Allows members to request books not in the catalog

CREATE TABLE book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  description TEXT,
  cover_url TEXT,
  page_count INTEGER,
  publish_date TEXT,
  genres TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'fulfilled')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  book_id UUID REFERENCES books(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_book_requests_user ON book_requests(user_id);
CREATE INDEX idx_book_requests_status ON book_requests(status);
CREATE INDEX idx_book_requests_created ON book_requests(created_at DESC);

-- Updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_requests_updated_at
  BEFORE UPDATE ON book_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE book_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own book requests" ON book_requests
  FOR SELECT USING (user_id = auth.uid());

-- Authenticated users can create requests
CREATE POLICY "Authenticated users can create book requests" ON book_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pending requests (cancel)
CREATE POLICY "Users can delete own pending requests" ON book_requests
  FOR DELETE USING (
    user_id = auth.uid() AND status = 'pending'
  );

-- Admins can view all requests
CREATE POLICY "Admins can view all book requests" ON book_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Admins can update any request
CREATE POLICY "Admins can update book requests" ON book_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('librarian', 'admin')
    )
  );

-- Update notifications table to allow new notification types
-- First drop the existing constraint if it exists
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with new types
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'checkout_confirmed', 'due_soon', 'overdue',
  'waitlist_joined', 'waitlist_available', 'waitlist_expired',
  'book_returned', 'book_request_submitted', 'book_request_approved',
  'book_request_declined', 'book_request_fulfilled', 'admin_new_book_request',
  'system'
));
