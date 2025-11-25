// Strava Sync Edge Function
// Handles OAuth callback and syncs activities from Strava API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StravaTokenResponse {
  token_type: string
  expires_at: number
  expires_in: number
  refresh_token: string
  access_token: string
  athlete: {
    id: number
    username: string
    firstname: string
    lastname: string
  }
}

interface StravaActivity {
  id: number
  name: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  type: string
  start_date: string
  start_date_local: string
  timezone: string
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  suffer_score?: number
  calories?: number
  achievement_count: number
  kudos_count: number
  average_watts?: number
  map?: {
    summary_polyline?: string
    polyline?: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // Handle OAuth callback
    if (action === 'callback') {
      const code = url.searchParams.get('code')
      if (!code) {
        throw new Error('No authorization code provided')
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Deno.env.get('STRAVA_CLIENT_ID'),
          client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
          code: code,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token')
      }

      const tokenData: StravaTokenResponse = await tokenResponse.json()

      // Store tokens in database
      const { error: upsertError } = await supabaseClient
        .from('strava_tokens')
        .upsert({
          user_id: user.id,
          athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
        })

      if (upsertError) throw upsertError

      // Immediately sync activities
      await syncActivities(supabaseClient, user.id, tokenData.access_token)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connected to Strava and synced activities',
          athlete: tokenData.athlete 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle manual sync request
    if (action === 'sync') {
      // Get stored token
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('strava_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (tokenError || !tokenData) {
        throw new Error('No Strava connection found. Please connect first.')
      }

      // Check if token needs refresh
      const expiresAt = new Date(tokenData.expires_at)
      const now = new Date()
      
      let accessToken = tokenData.access_token

      if (expiresAt <= now) {
        // Refresh the token
        const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: Deno.env.get('STRAVA_CLIENT_ID'),
            client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh token')
        }

        const refreshData: StravaTokenResponse = await refreshResponse.json()
        accessToken = refreshData.access_token

        // Update stored tokens
        await supabaseClient
          .from('strava_tokens')
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expires_at: new Date(refreshData.expires_at * 1000).toISOString(),
          })
          .eq('user_id', user.id)
      }

      // Sync activities
      const activityCount = await syncActivities(supabaseClient, user.id, accessToken)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Synced ${activityCount} activities from Strava`,
          count: activityCount 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle disconnect request
    if (action === 'disconnect') {
      // Delete tokens and activities
      await supabaseClient
        .from('strava_tokens')
        .delete()
        .eq('user_id', user.id)

      await supabaseClient
        .from('strava_activities')
        .delete()
        .eq('user_id', user.id)

      return new Response(
        JSON.stringify({ success: true, message: 'Disconnected from Strava' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle connection status check
    if (action === 'status') {
      const { data: tokenData } = await supabaseClient
        .from('strava_tokens')
        .select('athlete_id, created_at')
        .eq('user_id', user.id)
        .single()

      return new Response(
        JSON.stringify({ 
          connected: !!tokenData,
          athleteId: tokenData?.athlete_id 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('Invalid action parameter')

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// Helper function to sync activities from Strava
async function syncActivities(
  supabaseClient: any,
  userId: string,
  accessToken: string
): Promise<number> {
  // Get activities from the last 6 months
  const after = Math.floor(Date.now() / 1000) - (180 * 24 * 60 * 60)
  
  const activitiesResponse = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!activitiesResponse.ok) {
    throw new Error('Failed to fetch activities from Strava')
  }

  const activities: StravaActivity[] = await activitiesResponse.json()

  // Get athlete_id from one of the stored tokens
  const { data: tokenData } = await supabaseClient
    .from('strava_tokens')
    .select('athlete_id')
    .eq('user_id', userId)
    .single()

  const athleteId = tokenData?.athlete_id

  if (!athleteId) {
    throw new Error('Athlete ID not found')
  }

  // Upsert activities into database
  if (activities.length > 0) {
    const activitiesToInsert = activities.map(activity => ({
      id: activity.id,
      user_id: userId,
      athlete_id: athleteId,
      name: activity.name,
      distance: activity.distance,
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      type: activity.type,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      timezone: activity.timezone,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      suffer_score: activity.suffer_score,
      calories: activity.calories,
      achievement_count: activity.achievement_count,
      kudos_count: activity.kudos_count,
      average_watts: activity.average_watts,
      map_summary_polyline: activity.map?.summary_polyline,
      map_polyline: activity.map?.polyline,
    }))

    const { error: insertError } = await supabaseClient
      .from('strava_activities')
      .upsert(activitiesToInsert, { onConflict: 'id' })

    if (insertError) throw insertError
  }

  return activities.length
}
