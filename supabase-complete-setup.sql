-- Complete Supabase Database Setup for DauphinDash
-- Run this in your Supabase SQL Editor

-- Step 1: Create the daily_progress table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS daily_progress (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    weight DECIMAL,
    leetcode INTEGER DEFAULT 0,
    workout BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add user_id column to daily_progress table
ALTER TABLE daily_progress 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_id ON daily_progress(user_id);

-- Step 4: Update the unique constraint to include user_id
-- Drop the old unique constraint on date (if exists)
ALTER TABLE daily_progress DROP CONSTRAINT IF EXISTS daily_progress_date_key;

-- Add new unique constraint on (user_id, date)
-- Each user can have one entry per day
ALTER TABLE daily_progress 
DROP CONSTRAINT IF EXISTS daily_progress_user_date_unique;

ALTER TABLE daily_progress 
ADD CONSTRAINT daily_progress_user_date_unique UNIQUE (user_id, date);

-- Step 5: Enable Row Level Security
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop any existing policies
DROP POLICY IF EXISTS "Enable all access for now" ON daily_progress;
DROP POLICY IF EXISTS "Users can view own data" ON daily_progress;
DROP POLICY IF EXISTS "Users can insert own data" ON daily_progress;
DROP POLICY IF EXISTS "Users can update own data" ON daily_progress;
DROP POLICY IF EXISTS "Users can delete own data" ON daily_progress;

-- Step 7: Create RLS policies for user data isolation

-- Users can only view their own data
CREATE POLICY "Users can view own data" ON daily_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert own data" ON daily_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own data
CREATE POLICY "Users can update own data" ON daily_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own data
CREATE POLICY "Users can delete own data" ON daily_progress
    FOR DELETE
    USING (auth.uid() = user_id);

-- Step 8: Create a function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set user_id to current authenticated user
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger to automatically set user_id
DROP TRIGGER IF EXISTS set_user_id_trigger ON daily_progress;
CREATE TRIGGER set_user_id_trigger
    BEFORE INSERT ON daily_progress
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

-- Step 10: Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_daily_progress_updated_at ON daily_progress;
CREATE TRIGGER update_daily_progress_updated_at
    BEFORE UPDATE ON daily_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Done! Your database is ready for authentication-based sync
-- Users can now sign up and their data will be automatically isolated
