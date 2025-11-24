-- Strava Integration Schema for DauphinDash
-- Run this in your Supabase SQL Editor

-- Table to store Strava OAuth tokens (one per user)
CREATE TABLE IF NOT EXISTS strava_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id BIGINT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Table to store Strava activities
CREATE TABLE IF NOT EXISTS strava_activities (
    id BIGINT PRIMARY KEY, -- Strava activity ID
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id BIGINT NOT NULL,
    name TEXT,
    distance NUMERIC, -- meters
    moving_time INTEGER, -- seconds
    elapsed_time INTEGER, -- seconds
    total_elevation_gain NUMERIC, -- meters
    type TEXT, -- Run, Ride, etc.
    start_date TIMESTAMPTZ,
    start_date_local TIMESTAMPTZ,
    timezone TEXT,
    average_speed NUMERIC, -- m/s
    max_speed NUMERIC, -- m/s
    average_heartrate NUMERIC,
    max_heartrate NUMERIC,
    suffer_score NUMERIC,
    calories NUMERIC,
    achievement_count INTEGER,
    kudos_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_strava_activities_user_date 
    ON strava_activities(user_id, start_date_local DESC);

CREATE INDEX IF NOT EXISTS idx_strava_activities_athlete_date 
    ON strava_activities(athlete_id, start_date_local DESC);

-- Enable Row Level Security
ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strava_tokens
CREATE POLICY "Users can view their own Strava tokens"
    ON strava_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Strava tokens"
    ON strava_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Strava tokens"
    ON strava_tokens FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Strava tokens"
    ON strava_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for strava_activities
CREATE POLICY "Users can view their own Strava activities"
    ON strava_activities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Strava activities"
    ON strava_activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Strava activities"
    ON strava_activities FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Strava activities"
    ON strava_activities FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
CREATE TRIGGER update_strava_tokens_updated_at
    BEFORE UPDATE ON strava_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strava_activities_updated_at
    BEFORE UPDATE ON strava_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for aggregated running stats (helpful for dashboard queries)
CREATE OR REPLACE VIEW user_running_stats AS
SELECT 
    user_id,
    COUNT(*) as total_runs,
    SUM(distance) as total_distance_meters,
    SUM(moving_time) as total_moving_time_seconds,
    SUM(total_elevation_gain) as total_elevation_meters,
    AVG(distance) as avg_distance_meters,
    AVG(average_speed) as avg_speed_ms,
    MAX(distance) as longest_run_meters,
    MAX(start_date_local) as last_run_date,
    DATE_TRUNC('week', MAX(start_date_local)) as last_run_week
FROM strava_activities
WHERE type = 'Run'
GROUP BY user_id;

-- Grant access to authenticated users
GRANT SELECT ON user_running_stats TO authenticated;
