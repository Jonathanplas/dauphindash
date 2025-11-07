// Supabase Sync for DauphinDash
// Handles all data persistence with Supabase

class SupabaseSync {
    constructor() {
        this.supabaseUrl = localStorage.getItem('supabase-url');
        this.supabaseKey = localStorage.getItem('supabase-key');
        this.client = null;
        this.syncStatus = { syncing: false, lastSync: null, error: null };
        
        if (this.supabaseUrl && this.supabaseKey) {
            this.initializeClient();
        }
    }

    // Initialize Supabase client
    initializeClient() {
        try {
            this.client = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            console.log('✅ Supabase client initialized');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            this.client = null;
        }
    }

    // Check if user has configured Supabase
    isConfigured() {
        return !!this.client;
    }

    // Set Supabase credentials
    setCredentials(url, key) {
        this.supabaseUrl = url;
        this.supabaseKey = key;
        localStorage.setItem('supabase-url', url);
        localStorage.setItem('supabase-key', key);
        this.initializeClient();
    }

    // Test if the credentials are valid
    async testConnection() {
        if (!this.client) {
            return false;
        }

        try {
            const { data, error } = await this.client
                .from('daily_progress')
                .select('count')
                .limit(1);
            
            return !error;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    // Load all data from Supabase
    async loadAllData() {
        if (!this.client) {
            return null;
        }

        try {
            const { data, error } = await this.client
                .from('daily_progress')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                console.error('Failed to load data:', error);
                return null;
            }

            // Convert Supabase format to our internal format
            // Supabase: [{ date: '2024-01-01', weight: 150, ... }]
            // Internal: { '2024-01-01': { weight: 150, ... } }
            const converted = {};
            data.forEach(row => {
                converted[row.date] = {
                    weight: row.weight,
                    leetcode: row.leetcode || 0,
                    workout: row.workout || false
                };
            });

            console.log('✅ Loaded data from Supabase:', Object.keys(converted).length, 'entries');
            return converted;
        } catch (error) {
            console.error('Error loading from Supabase:', error);
            return null;
        }
    }

    // Save or update a single day's data
    async saveDayData(date, data) {
        if (!this.client) {
            console.log('Not configured, skipping sync');
            return false;
        }

        this.syncStatus.syncing = true;
        this.syncStatus.error = null;

        try {
            const { error } = await this.client
                .from('daily_progress')
                .upsert({
                    date: date,
                    weight: data.weight,
                    leetcode: data.leetcode || 0,
                    workout: data.workout || false,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'date'
                });

            if (error) {
                console.error('Failed to save data:', error);
                this.syncStatus.error = error.message;
                this.syncStatus.syncing = false;
                return false;
            }

            console.log('✅ Data synced to Supabase for', date);
            this.syncStatus.lastSync = new Date().toISOString();
            this.syncStatus.syncing = false;
            return true;
        } catch (error) {
            console.error('❌ Supabase sync error:', error);
            this.syncStatus.error = error.message;
            this.syncStatus.syncing = false;
            return false;
        }
    }

    // Sync all local data to Supabase (for initial migration)
    async syncAllData(dataObject) {
        if (!this.client) {
            console.log('Not configured, skipping sync');
            return false;
        }

        this.syncStatus.syncing = true;
        this.syncStatus.error = null;

        try {
            // Convert internal format to Supabase format
            const rows = Object.entries(dataObject).map(([date, data]) => ({
                date: date,
                weight: data.weight,
                leetcode: data.leetcode || 0,
                workout: data.workout || false,
                updated_at: new Date().toISOString()
            }));

            if (rows.length === 0) {
                console.log('No data to sync');
                this.syncStatus.syncing = false;
                return true;
            }

            const { error } = await this.client
                .from('daily_progress')
                .upsert(rows, {
                    onConflict: 'date'
                });

            if (error) {
                console.error('Failed to sync all data:', error);
                this.syncStatus.error = error.message;
                this.syncStatus.syncing = false;
                return false;
            }

            console.log('✅ All data synced to Supabase:', rows.length, 'entries');
            this.syncStatus.lastSync = new Date().toISOString();
            this.syncStatus.syncing = false;
            return true;
        } catch (error) {
            console.error('❌ Supabase sync error:', error);
            this.syncStatus.error = error.message;
            this.syncStatus.syncing = false;
            return false;
        }
    }

    // Get sync status for UI
    getSyncStatus() {
        return this.syncStatus;
    }

    // Disconnect Supabase
    disconnect() {
        localStorage.removeItem('supabase-url');
        localStorage.removeItem('supabase-key');
        this.supabaseUrl = null;
        this.supabaseKey = null;
        this.client = null;
        console.log('Disconnected from Supabase');
    }

    // Get Supabase dashboard URL
    getDashboardUrl() {
        if (this.supabaseUrl) {
            // Extract project ref from URL (e.g., https://xxxxx.supabase.co)
            const match = this.supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
            if (match) {
                return `https://supabase.com/dashboard/project/${match[1]}`;
            }
        }
        return null;
    }
}

