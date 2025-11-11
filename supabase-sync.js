// Supabase Sync for DauphinDash
// Handles all data persistence with Supabase using authentication

// ⚙️ CONFIGURATION - Replace with your Supabase project credentials
// Get these from: Supabase Dashboard → Settings → API
const SUPABASE_CONFIG = {
    url: 'https://errqduxqwiuxuczujdgh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycnFkdXhxd2l1eHVjenVqZGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NzY3NjEsImV4cCI6MjA3ODA1Mjc2MX0.21AJDJMIz9Q2gtzWojOm5NQQfr-_jPyE56Yeey-xGco'
};

class SupabaseSync {
    constructor() {
        // Use hardcoded config or fall back to localStorage for backward compatibility
        this.supabaseUrl = SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL_HERE' 
            ? SUPABASE_CONFIG.url 
            : localStorage.getItem('supabase-url');
        
        this.anonKey = SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE'
            ? SUPABASE_CONFIG.anonKey
            : localStorage.getItem('supabase-anon-key');
        
        this.client = null;
        this.syncStatus = { syncing: false, lastSync: null, error: null };
        
        this.initializeClient();
        if (this.client) {
            this.checkSession();
        }
    }

    // Initialize Supabase client (using anon key for auth)
    initializeClient() {
        if (!this.supabaseUrl || !this.anonKey) {
            console.warn('Supabase not configured. Please set credentials in supabase-sync.js');
            return;
        }
        
        try {
            this.client = supabase.createClient(this.supabaseUrl, this.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
            console.log('✅ Supabase client initialized');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            this.client = null;
        }
    }

    // Get anon key (for backward compatibility)
    getAnonKey() {
        return this.anonKey;
    }

    // Set Supabase URL and anon key (for backward compatibility with manual setup)
    setConfig(url, anonKey) {
        this.supabaseUrl = url;
        this.anonKey = anonKey;
        localStorage.setItem('supabase-url', url);
        if (anonKey) {
            localStorage.setItem('supabase-anon-key', anonKey);
        }
        this.initializeClient();
    }

    // Check for existing session
    async checkSession() {
        if (!this.client) return;
        
        const { data: { session } } = await this.client.auth.getSession();
        if (session) {
            console.log('✅ Existing session found');
        }
    }

    // Check if user is authenticated (async)
    async isAuthenticated() {
        if (!this.client) return false;
        const session = await this.getSession();
        return !!session;
    }

    // Sign up with email and password
    async signUp(email, password) {
        if (!this.client) {
            throw new Error('Supabase not configured');
        }

        const { data, error } = await this.client.auth.signUp({
            email,
            password
        });

        if (error) {
            throw error;
        }

        return data;
    }

    // Sign in with email and password
    async signIn(email, password) {
        if (!this.client) {
            throw new Error('Supabase not configured');
        }

        const { data, error } = await this.client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        return data;
    }

    // Sign out
    async signOut() {
        if (!this.client) return;

        const { error } = await this.client.auth.signOut();
        if (error) {
            throw error;
        }
    }

    // Get current session
    async getSession() {
        if (!this.client) return null;
        const { data: { session } } = await this.client.auth.getSession();
        return session;
    }

    // Check if user has configured Supabase
    isConfigured() {
        return !!this.client && this.supabaseUrl;
    }

    // Load all data from Supabase
    async loadAllData() {
        if (!this.client) {
            return null;
        }

        // Check if user is authenticated
        const session = await this.getSession();
        if (!session) {
            console.log('Not authenticated, cannot load data');
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

        // Check if user is authenticated
        const session = await this.getSession();
        if (!session) {
            console.log('Not authenticated, skipping sync');
            return false;
        }

        this.syncStatus.syncing = true;
        this.syncStatus.error = null;

        try {
            const session = await this.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            const { error } = await this.client
                .from('daily_progress')
                .upsert({
                    date: date,
                    weight: data.weight,
                    leetcode: data.leetcode || 0,
                    workout: data.workout || false,
                    user_id: session.user.id,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,date'
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

        // Check if user is authenticated
        const session = await this.getSession();
        if (!session) {
            console.log('Not authenticated, skipping sync');
            return false;
        }

        this.syncStatus.syncing = true;
        this.syncStatus.error = null;

        try {
            const session = await this.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            // Convert internal format to Supabase format
            const rows = Object.entries(dataObject).map(([date, data]) => ({
                date: date,
                weight: data.weight,
                leetcode: data.leetcode || 0,
                workout: data.workout || false,
                user_id: session.user.id,
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
                    onConflict: 'user_id,date'
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

    // Get current user email
    async getCurrentUserEmail() {
        const session = await this.getSession();
        return session?.user?.email || null;
    }

    // Disconnect Supabase (sign out)
    async disconnect() {
        await this.signOut();
        // Keep URL and anon key for re-authentication
        // localStorage.removeItem('supabase-url');
        // localStorage.removeItem('supabase-anon-key');
        console.log('Signed out from Supabase');
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

