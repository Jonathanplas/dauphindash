// GitHub Gist Sync for DauphinDash
// Uses Personal Access Token for authentication

class GistSync {
    constructor() {
        this.gistId = localStorage.getItem('dauphindash-gist-id');
        this.accessToken = localStorage.getItem('github-access-token');
        this.syncStatus = { syncing: false, lastSync: null, error: null };
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.accessToken;
    }

    // Set access token (user provides their PAT)
    setAccessToken(token) {
        this.accessToken = token;
        localStorage.setItem('github-access-token', token);
    }

    // Test if the token is valid
    async testToken() {
        if (!this.accessToken) {
            return false;
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Token test failed:', error);
            return false;
        }
    }

    // Create a new private Gist
    async createGist(data) {
        if (!this.accessToken) {
            throw new Error('Not authenticated. Please add your GitHub token.');
        }

        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: 'DauphinDash Progress Data (Auto-sync)',
                public: false,
                files: {
                    'dauphindash-data.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to create Gist: ${error.message || response.statusText}`);
        }

        const gist = await response.json();
        this.gistId = gist.id;
        localStorage.setItem('dauphindash-gist-id', gist.id);
        console.log('Created new Gist:', gist.html_url);
        return gist;
    }

    // Update existing Gist
    async updateGist(data) {
        if (!this.accessToken || !this.gistId) {
            throw new Error('Not authenticated or no Gist found');
        }

        const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    'dauphindash-data.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to update Gist: ${error.message || response.statusText}`);
        }

        return await response.json();
    }

    // Load data from Gist
    async loadFromGist() {
        if (!this.accessToken || !this.gistId) {
            return null;
        }

        try {
            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                console.error('Failed to load from Gist:', response.statusText);
                return null;
            }

            const gist = await response.json();
            const fileContent = gist.files['dauphindash-data.json']?.content;
            
            if (!fileContent) {
                console.error('No data file found in Gist');
                return null;
            }

            return JSON.parse(fileContent);
        } catch (error) {
            console.error('Error loading from Gist:', error);
            return null;
        }
    }

    // Sync data to Gist
    async syncToGist(data) {
        if (!this.accessToken) {
            console.log('Not authenticated, skipping sync');
            return false;
        }

        this.syncStatus.syncing = true;
        this.syncStatus.error = null;

        try {
            if (this.gistId) {
                await this.updateGist(data);
                console.log('✅ Data synced to Gist');
            } else {
                const gist = await this.createGist(data);
                console.log('✅ Created new Gist and synced data:', gist.html_url);
            }
            
            this.syncStatus.lastSync = new Date().toISOString();
            this.syncStatus.syncing = false;
            return true;
        } catch (error) {
            console.error('❌ Gist sync error:', error);
            this.syncStatus.error = error.message;
            this.syncStatus.syncing = false;
            return false;
        }
    }

    // Get sync status for UI
    getSyncStatus() {
        return this.syncStatus;
    }

    // Disconnect GitHub
    disconnect() {
        localStorage.removeItem('github-access-token');
        localStorage.removeItem('dauphindash-gist-id');
        this.accessToken = null;
        this.gistId = null;
        console.log('Disconnected from GitHub');
    }

    // Get Gist URL for user to view
    getGistUrl() {
        if (this.gistId) {
            return `https://gist.github.com/${this.gistId}`;
        }
        return null;
    }
}
