-- Enable Realtime for notifications table
-- This allows the NotificationProvider to receive instant updates when notifications are created/updated

-- Add notifications table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Set replica identity to FULL so we can filter by user_id in subscriptions
-- This ensures RLS is properly respected for Realtime events
ALTER TABLE notifications REPLICA IDENTITY FULL;
