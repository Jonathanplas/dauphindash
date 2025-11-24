const STRAVA_CLIENT_ID = '186791'; 
class StravaSync {
    constructor(supabaseSync) {
        this.supabaseSync = supabaseSync;
        this.stravaData = null;
        this.connected = false;
        this.loading = false;
    }

    // Check if user has connected Strava
    async checkConnection() {
        if (!this.supabaseSync.client) return false;
        
        try {
            const session = await this.supabaseSync.getSession();
            if (!session) return false;

            const url = `${this.supabaseSync.supabaseUrl}/functions/v1/strava-sync?action=status`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (response.ok && data.connected) {
                this.connected = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking Strava connection:', error);
            return false;
        }
    }

    // Start OAuth flow to connect Strava
    async connect() {
        // Use configured client ID or fall back to localStorage
        const clientId = STRAVA_CLIENT_ID !== 'YOUR_STRAVA_CLIENT_ID_HERE' 
            ? STRAVA_CLIENT_ID 
            : localStorage.getItem('strava-client-id');
        
        if (!clientId || clientId === 'YOUR_STRAVA_CLIENT_ID_HERE') {
            alert('Please set your Strava Client ID in strava-sync.js. See the Strava Setup Guide.');
            return;
        }

        // Construct the correct redirect URI based on current URL
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        const redirectUri = `${baseUrl}/strava-callback.html`;
        const scope = 'read,activity:read_all';
        
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${scope}`;
        
        // Open OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
            authUrl,
            'Strava Authorization',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for OAuth callback
        return new Promise((resolve, reject) => {
            window.addEventListener('message', async (event) => {
                if (event.data.type === 'strava-oauth-success') {
                    popup?.close();
                    
                    // Call edge function with the code as query parameter
                    try {
                        const session = await this.supabaseSync.getSession();
                        if (!session) {
                            reject(new Error('Not authenticated with Supabase'));
                            return;
                        }

                        const url = `${this.supabaseSync.supabaseUrl}/functions/v1/strava-sync?action=callback&code=${encodeURIComponent(event.data.code)}`;
                        
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json',
                            }
                        });

                        const data = await response.json();
                        console.log('Strava Edge Function Response:', data);

                        if (!response.ok) {
                            console.error('Edge Function Error:', data);
                            reject(new Error(data.error || 'Failed to connect to Strava'));
                            return;
                        }

                        if (data.success) {
                            this.connected = true;
                            await this.loadActivities();
                            resolve(data);
                        } else {
                            reject(new Error(data.error || 'Failed to connect to Strava'));
                        }
                    } catch (error) {
                        console.error('Exception calling Edge Function:', error);
                        reject(error);
                    }
                }
            }, { once: true });

            // Handle popup closed without completion
            const checkPopup = setInterval(() => {
                if (popup?.closed) {
                    clearInterval(checkPopup);
                    reject(new Error('OAuth window closed'));
                }
            }, 500);
        });
    }

    // Manually sync activities from Strava
    async syncActivities() {
        if (!this.supabaseSync.client) {
            throw new Error('Supabase not configured');
        }

        this.loading = true;
        
        try {
            const session = await this.supabaseSync.getSession();
            if (!session) {
                throw new Error('Not authenticated with Supabase');
            }

            const url = `${this.supabaseSync.supabaseUrl}/functions/v1/strava-sync?action=sync`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await this.loadActivities();
                return data;
            } else {
                throw new Error(data.error || 'Failed to sync activities');
            }
        } finally {
            this.loading = false;
        }
    }

    // Load activities from Supabase
    async loadActivities() {
        if (!this.supabaseSync.client) return null;

        try {
            const session = await this.supabaseSync.getSession();
            if (!session) return null;

            // Fetch activities from last 6 months
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const { data, error } = await this.supabaseSync.client
                .from('strava_activities')
                .select('*')
                .gte('start_date_local', sixMonthsAgo.toISOString())
                .order('start_date_local', { ascending: false });

            if (error) throw error;

            this.stravaData = data || [];
            return this.stravaData;
        } catch (error) {
            console.error('Error loading Strava activities:', error);
            return null;
        }
    }

    // Disconnect Strava
    async disconnect() {
        if (!this.supabaseSync.client) return;

        try {
            const session = await this.supabaseSync.getSession();
            if (!session) return false;

            const url = `${this.supabaseSync.supabaseUrl}/functions/v1/strava-sync?action=disconnect`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.connected = false;
                this.stravaData = null;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error disconnecting Strava:', error);
            return false;
        }
    }

    // Get running statistics
    getRunningStats() {
        if (!this.stravaData) return null;

        const runs = this.stravaData.filter(a => a.type === 'Run');
        
        if (runs.length === 0) return null;

        const totalDistance = runs.reduce((sum, r) => sum + (r.distance || 0), 0);
        const totalTime = runs.reduce((sum, r) => sum + (r.moving_time || 0), 0);
        const totalElevation = runs.reduce((sum, r) => sum + (r.total_elevation_gain || 0), 0);

        // This week's runs
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const thisWeekRuns = runs.filter(r => new Date(r.start_date_local) >= weekAgo);
        const thisWeekDistance = thisWeekRuns.reduce((sum, r) => sum + (r.distance || 0), 0);

        // This month's runs
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const thisMonthRuns = runs.filter(r => new Date(r.start_date_local) >= monthStart);
        const thisMonthDistance = thisMonthRuns.reduce((sum, r) => sum + (r.distance || 0), 0);

        return {
            totalRuns: runs.length,
            totalDistanceKm: (totalDistance / 1000).toFixed(1),
            totalDistanceMiles: (totalDistance / 1609.34).toFixed(1),
            totalTimeHours: (totalTime / 3600).toFixed(1),
            totalElevationM: totalElevation.toFixed(0),
            totalElevationFt: (totalElevation * 3.28084).toFixed(0),
            avgDistanceKm: (totalDistance / 1000 / runs.length).toFixed(1),
            avgDistanceMiles: (totalDistance / 1609.34 / runs.length).toFixed(1),
            avgPaceMinPerKm: this.calculateAvgPace(totalDistance, totalTime, 'km'),
            avgPaceMinPerMile: this.calculateAvgPace(totalDistance, totalTime, 'mile'),
            thisWeekRuns: thisWeekRuns.length,
            thisWeekDistanceKm: (thisWeekDistance / 1000).toFixed(1),
            thisWeekDistanceMiles: (thisWeekDistance / 1609.34).toFixed(1),
            thisMonthRuns: thisMonthRuns.length,
            thisMonthDistanceKm: (thisMonthDistance / 1000).toFixed(1),
            thisMonthDistanceMiles: (thisMonthDistance / 1609.34).toFixed(1),
            lastRun: runs[0] ? new Date(runs[0].start_date_local) : null,
            longestRunKm: Math.max(...runs.map(r => r.distance)) / 1000,
            longestRunMiles: Math.max(...runs.map(r => r.distance)) / 1609.34
        };
    }

    calculateAvgPace(distanceMeters, timeSeconds, unit) {
        if (distanceMeters === 0) return '0:00';
        
        const distanceInUnit = unit === 'km' ? distanceMeters / 1000 : distanceMeters / 1609.34;
        const paceSecondsPerUnit = timeSeconds / distanceInUnit;
        const minutes = Math.floor(paceSecondsPerUnit / 60);
        const seconds = Math.floor(paceSecondsPerUnit % 60);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Get weekly running data for charts
    getWeeklyData(weeks = 12) {
        if (!this.stravaData) return null;

        const runs = this.stravaData.filter(a => a.type === 'Run');
        const weeklyData = [];
        
        for (let i = weeks - 1; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            const weekRuns = runs.filter(r => {
                const runDate = new Date(r.start_date_local);
                return runDate >= weekStart && runDate < weekEnd;
            });
            
            const weekDistance = weekRuns.reduce((sum, r) => sum + (r.distance || 0), 0);
            
            weeklyData.push({
                week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
                runs: weekRuns.length,
                distanceKm: weekDistance / 1000,
                distanceMiles: weekDistance / 1609.34
            });
        }
        
        return weeklyData;
    }
}
