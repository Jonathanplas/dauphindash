-- Migration: Add user_id column and update RLS policies for authentication
-- Run this in your Supabase SQL Editor

-- Step 1: Add user_id column to daily_progress table
ALTER TABLE daily_progress 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_id ON daily_progress(user_id);

-- Step 3: Update existing rows to set user_id (if you have existing data)
-- Note: This will set all existing rows to NULL. You may want to manually assign them.
-- UPDATE daily_progress SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Step 4: Make user_id NOT NULL for new rows (optional, but recommended)
-- ALTER TABLE daily_progress ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Update the unique constraint to include user_id
-- Drop the old unique constraint on date
ALTER TABLE daily_progress DROP CONSTRAINT IF EXISTS daily_progress_date_key;

-- Add new unique constraint on (user_id, date)
ALTER TABLE daily_progress 
ADD CONSTRAINT daily_progress_user_date_unique UNIQUE (user_id, date);

-- Step 6: Update Row Level Security policies
-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for now" ON daily_progress;

-- Create new policy: Users can only see their own data
CREATE POLICY "Users can view own data" ON daily_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create new policy: Users can insert their own data
CREATE POLICY "Users can insert own data" ON daily_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create new policy: Users can update their own data
CREATE POLICY "Users can update own data" ON daily_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create new policy: Users can delete their own data
CREATE POLICY "Users can delete own data" ON daily_progress
    FOR DELETE
    USING (auth.uid() = user_id);

-- Step 7: Create a function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create trigger to automatically set user_id
DROP TRIGGER IF EXISTS set_user_id_trigger ON daily_progress;
CREATE TRIGGER set_user_id_trigger
    BEFORE INSERT ON daily_progress
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

