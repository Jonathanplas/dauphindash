# Strava Integration Setup Guide

This guide will walk you through integrating your Strava running data with DauphinDash using Supabase Edge Functions.

## Overview

The Strava integration uses:
- **Supabase** to store your Strava tokens and activities securely
- **Supabase Edge Functions** to handle OAuth and sync activities from Strava
- **Client-side JavaScript** to display your running stats on the dashboard

## Prerequisites

Before you begin, make sure you have:
1. A Supabase project already set up (from `SUPABASE_SETUP_GUIDE.md`)
2. Supabase CLI installed ([installation guide](https://supabase.com/docs/guides/cli))
3. A Strava account with some running activities

## Step 1: Create a Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Click **"Create an App"** or **"My API Application"**
3. Fill in the application details:
   - **Application Name**: `DauphinDash` (or your preference)
   - **Category**: Choose the most appropriate (e.g., "Training")
   - **Club**: Leave blank
   - **Website**: Your dashboard URL (e.g., `https://yourusername.github.io/dauphindash`)
   - **Authorization Callback Domain**: Your dashboard domain (e.g., `yourusername.github.io`)
   - **Application Description**: "Personal fitness tracking dashboard"
4. Click **"Create"**

5. After creation, you'll see:
   - **Client ID**: A numeric ID (e.g., `123456`)
   - **Client Secret**: A hexadecimal string (e.g., `abc123def456...`)
   
   ⚠️ **Important**: Keep your Client Secret secure! Don't commit it to public repositories.

## Step 2: Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase-strava-setup.sql` from your project
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **"Run"** to create the tables, policies, and views

This creates:
- `strava_tokens` table - stores OAuth tokens securely
- `strava_activities` table - stores your running activities
- Row Level Security policies - ensures users can only access their own data
- Helper views for aggregated stats

## Step 3: Deploy the Supabase Edge Function

### Login to Supabase CLI

```bash
# Login to Supabase (opens browser for authentication)
supabase login

# Link your project (replace with your project reference ID)
supabase link --project-ref your-project-ref
```

To find your project reference:
- Go to Supabase Dashboard → Settings → General
- Look for "Reference ID"

### Set Environment Variables

The Edge Function needs your Strava credentials. Set them as Supabase secrets:

```bash
# Set your Strava Client ID
supabase secrets set STRAVA_CLIENT_ID=your_client_id_here

# Set your Strava Client Secret
supabase secrets set STRAVA_CLIENT_SECRET=your_client_secret_here
```

Replace `your_client_id_here` and `your_client_secret_here` with your actual values from Step 1.

### Deploy the Edge Function

```bash
# Deploy the strava-sync function
supabase functions deploy strava-sync
```

This uploads and deploys the Edge Function to Supabase's global network.

### Verify Deployment

```bash
# List all functions
supabase functions list
```

You should see `strava-sync` in the list with status "ACTIVE".

## Step 4: Configure Your Dashboard

### Add Your Strava Client ID to Code

1. Open the file `strava-sync.js` in your project
2. Find this line near the top:
   ```javascript
   const STRAVA_CLIENT_ID = 'YOUR_STRAVA_CLIENT_ID_HERE';
   ```
3. Replace `YOUR_STRAVA_CLIENT_ID_HERE` with your actual Client ID from Step 1
4. Save the file
5. Commit and push to GitHub:
   ```bash
   git add strava-sync.js
   git commit -m "Add Strava Client ID"
   git push origin main
   ```

**Note**: The Client ID is public and safe to commit to GitHub. Only the Client Secret must be kept private (which is stored securely in Supabase).

### Set Distance Units (Optional)

Choose between miles or kilometers by opening your dashboard in a browser, opening the console (F12), and running:

```javascript
// For miles
localStorage.setItem('strava-units', 'miles');

// For kilometers
localStorage.setItem('strava-units', 'km');
```

## Step 5: Connect to Strava

1. Make sure you're signed in to Supabase in your dashboard
2. Scroll to the **"Strava Integration"** section
3. Click **"Connect with Strava"**
4. A popup will open asking you to authorize the app
5. Click **"Authorize"** on Strava's page
6. The popup will close and your activities will sync automatically

🎉 **That's it!** Your Strava data is now integrated.

## Using the Integration

### View Your Stats

Once connected, you'll see:
- **Strava Runs** stat card showing total runs and weekly runs
- **Running Distance (Weekly)** chart showing your distance over time
- Detailed stats including:
  - Total distance and time
  - Average pace
  - This month's distance
  - Longest run

### Manual Sync

To manually sync new activities:
1. Click the **"Sync Now"** button in the Strava section
2. Wait for the sync to complete
3. Your stats and charts will update automatically

### Disconnect

To disconnect Strava:
1. Click the **"Disconnect"** button
2. Confirm the action
3. This will delete all stored Strava data from Supabase

## Automatic Syncing (Optional)

Want your data to sync automatically? You can set up a cron job using Supabase's pg_cron.

### Enable pg_cron Extension

1. Go to Supabase Dashboard → Database → Extensions
2. Enable the `pg_cron` extension

### Create Sync Schedule

Run this SQL in your SQL Editor:

```sql
-- Schedule daily sync at 6 AM UTC
SELECT cron.schedule(
  'strava-daily-sync',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/strava-sync?action=sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims')::json->>'sub'
      ),
      body := '{}'
    )
  FROM auth.users;
  $$
);
```

Replace `your-project-ref` with your actual Supabase project reference ID.

**Note**: This attempts to sync for all users. For better control, consider using Supabase Functions with scheduled triggers instead.

## Troubleshooting

### "No Strava connection found" Error

**Cause**: Your OAuth tokens aren't stored or have expired.

**Solution**: 
1. Disconnect and reconnect to Strava
2. Make sure you're signed in to Supabase

### "Failed to fetch activities from Strava" Error

**Cause**: Your access token may have expired or been revoked.

**Solution**:
1. The Edge Function should auto-refresh tokens, but if it fails:
2. Disconnect and reconnect to Strava
3. Check that your Strava API application is still active

### Activities Not Showing Up

**Cause**: The sync only fetches activities from the last 6 months by default.

**Solution**:
- Older activities won't sync automatically
- To fetch more, modify the `after` parameter in the Edge Function code

### OAuth Popup Blocked

**Cause**: Your browser is blocking popups.

**Solution**:
1. Allow popups for your dashboard domain
2. Try again

### Edge Function Deployment Fails

**Cause**: Missing environment variables or incorrect project link.

**Solution**:
1. Verify you're linked to the correct project: `supabase projects list`
2. Re-run `supabase link --project-ref your-ref-id`
3. Make sure secrets are set: `supabase secrets list`

## Data Privacy

- Your Strava tokens are stored securely in Supabase with Row Level Security
- Only you can access your own Strava data
- The Client Secret is never exposed to the browser (only in Edge Functions)
- You can disconnect and delete all data anytime

## Advanced Customization

### Change Sync Period

Edit `supabase/functions/strava-sync/index.ts`, line ~250:

```typescript
// Change from 180 days to 365 days
const after = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60)
```

Then redeploy: `supabase functions deploy strava-sync`

### Filter Activity Types

By default, all activities are synced. To sync only runs, modify the query:

```typescript
const activitiesResponse = await fetch(
  `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&type=Run`,
  // ... rest of code
)
```

### Add More Stats

You can query the `strava_activities` table for custom stats. For example, to get total elevation gain:

```javascript
const { data } = await supabaseClient
  .from('strava_activities')
  .select('total_elevation_gain')
  .eq('type', 'Run');

const totalElevation = data.reduce((sum, a) => sum + a.total_elevation_gain, 0);
```

## Resources

- [Strava API Documentation](https://developers.strava.com/docs/reference/)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)

## Need Help?

If you run into issues:
1. Check the browser console for JavaScript errors
2. Check Supabase Edge Function logs (Dashboard → Edge Functions → strava-sync → Logs)
3. Verify your RLS policies are correct
4. Make sure all environment variables are set

---

**Happy Running! 🏃‍♂️💨**
