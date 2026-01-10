-- Create test user for demo purposes
-- Email: test@test.com
-- Password: Anju2026
--
-- NOTE: This creates the user in the profiles table.
-- To complete the setup, you need to also create the auth.users entry through Supabase Dashboard:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Enter email: test@test.com, password: Anju2026
-- 4. Copy the user ID and update the INSERT statement below with that ID
-- 5. Run this SQL script
--
-- Alternatively, if you're running locally, you can use the Supabase CLI:
-- supabase auth user create --email test@test.com --password Anju2026

-- Insert profile for test user (replace USER_ID with the actual user ID from auth.users)
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES ('USER_ID', 'test@test.com', 'Test User', 'member')
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   role = EXCLUDED.role;

-- To make testing easier, here's a SQL function that can be called to get the test user ID
-- after creating them through the dashboard:
SELECT id, email FROM auth.users WHERE email = 'test@test.com';
