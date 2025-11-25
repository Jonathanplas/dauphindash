class DauphinDash {
    constructor() {
        this.data = this.loadData();
        this.currentQuarter = Math.floor(new Date().getMonth() / 3);
        this.currentYear = new Date().getFullYear();
        this.supabaseSync = new SupabaseSync();
        this.stravaSync = new StravaSync(this.supabaseSync);
        // Store chart instances to prevent duplication
        this.charts = {
            weight: null,
            leetcode: null,
            workout: null,
            strava: null
        };
        this.init();
    }

    async init() {
        this.renderStats();
        this.renderContributionGraph();
        this.renderCharts();
        this.setupEventListeners();
        await this.initSupabaseSync();
        await this.initStravaSync();
    }

    async initSupabaseSync() {
        // Try to load data from Supabase if configured
        if (this.supabaseSync.isConfigured()) {
            const supabaseData = await this.supabaseSync.loadAllData();
            if (supabaseData) {
                // Merge Supabase data with local data (Supabase takes precedence)
                this.data = { ...this.data, ...supabaseData };
                this.saveData();
                this.renderStats();
                this.renderContributionGraph();
                this.renderCharts();
                console.log('✅ Loaded data from Supabase');
            }
        }
    }

    async initStravaSync() {
        // Check if Strava is connected and load data
        const connected = await this.stravaSync.checkConnection();
        if (connected) {
            await this.stravaSync.loadActivities();
            this.mergeStravaWorkouts();
            this.updateStravaUI(true);
            this.renderStravaStats();
            this.renderStravaChart();
            // Re-render stats and graph with merged data
            this.renderStats();
            this.renderContributionGraph();
        }
    }

    // Merge Strava runs into workout data
    mergeStravaWorkouts() {
        if (!this.stravaSync.stravaData) return;

        const runs = this.stravaSync.stravaData.filter(a => a.type === 'Run');
        
        runs.forEach(run => {
            const runDate = new Date(run.start_date_local);
            const dateKey = this.getDateKey(runDate);
            
            // Create entry if doesn't exist
            if (!this.data[dateKey]) {
                this.data[dateKey] = { weight: null, leetcode: 0, workout: false };
            }
            
            // Mark as workout if there's a run
            this.data[dateKey].workout = true;
        });
        
        // Save merged data
        this.saveData();
    }

    loadData() {
        const saved = localStorage.getItem('dauphindash-data');
        return saved ? JSON.parse(saved) : {};
    }

    saveData() {
        localStorage.setItem('dauphindash-data', JSON.stringify(this.data));
    }

    getDateKey(date = new Date()) {
        // Use local date, not UTC, to match the date picker
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getTodayData() {
        const today = this.getDateKey();
        return this.data[today] || { weight: null, leetcode: 0, workout: false };
    }

    getMostRecentWeight() {
        // Find the most recent weight entry
        const sortedDates = Object.keys(this.data).sort().reverse();
        for (const date of sortedDates) {
            if (this.data[date].weight !== null && this.data[date].weight !== undefined) {
                return { date, weight: this.data[date].weight };
            }
        }
        return null;
    }

    updateStats() {
        const todayData = this.getTodayData();
        const GOAL_WEIGHT = 160;
        const GOAL_WORKOUTS_PER_WEEK = 5;
        
        // Update weight - show most recent weight, not just today's
        const weightElement = document.getElementById('current-weight');
        const weightChangeElement = document.getElementById('weight-change');
        
        const recentWeight = this.getMostRecentWeight();
        
        if (recentWeight) {
            weightElement.textContent = `${recentWeight.weight} lbs`;
            
            const weightDate = new Date(recentWeight.date);
            const daysAgo = Math.floor((Date.now() - weightDate.getTime()) / 86400000);
            
            // Calculate weight trend
            const previousWeight = this.getPreviousWeight(recentWeight.date);
            const weightTrend = this.calculateWeightTrend(recentWeight.weight, previousWeight, GOAL_WEIGHT);
            
            let changeText = '';
            if (daysAgo === 0) {
                changeText = 'Today';
            } else if (daysAgo === 1) {
                changeText = 'Yesterday';
            } else {
                changeText = `${daysAgo} days ago`;
            }
            
            weightChangeElement.innerHTML = `${changeText} ${weightTrend.indicator}`;
            weightChangeElement.style.color = weightTrend.color;
        } else {
            weightElement.textContent = '--';
            weightChangeElement.textContent = 'No data';
            weightChangeElement.style.color = '#718096';
        }

        // Update LeetCode stats
        const leetcodeTotal = Object.values(this.data).reduce((sum, day) => sum + (day.leetcode || 0), 0);
        document.getElementById('leetcode-total').textContent = leetcodeTotal;
        
        // Calculate this week's LeetCode
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        const thisWeekLeetcode = Object.entries(this.data)
            .filter(([date]) => new Date(date) >= weekAgo)
            .reduce((sum, [, day]) => sum + (day.leetcode || 0), 0);
        
        // Calculate last week's LeetCode for comparison
        const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
        const lastWeekLeetcode = Object.entries(this.data)
            .filter(([date]) => {
                const d = new Date(date);
                return d >= twoWeeksAgo && d < weekAgo;
            })
            .reduce((sum, [, day]) => sum + (day.leetcode || 0), 0);
        
        const leetcodeTrend = this.calculateLeetCodeTrend(thisWeekLeetcode, lastWeekLeetcode);
        document.getElementById('leetcode-this-week').innerHTML = `${thisWeekLeetcode} this week ${leetcodeTrend.indicator}`;
        document.getElementById('leetcode-this-week').style.color = leetcodeTrend.color;

        // Update workout stats (includes Strava runs)
        const workoutStreak = this.calculateWorkoutStreak();
        document.getElementById('workout-streak').textContent = workoutStreak;
        
        const thisWeekWorkouts = Object.entries(this.data)
            .filter(([date]) => new Date(date) >= weekAgo)
            .reduce((sum, [, day]) => sum + (day.workout ? 1 : 0), 0);
        
        // Calculate workout trend based on goal and days into week
        const today = new Date();
        const daysSinceSunday = (today.getDay() === 0 ? 7 : today.getDay()); // Monday = 1, Sunday = 7
        const workoutTrend = this.calculateWorkoutTrend(thisWeekWorkouts, daysSinceSunday, GOAL_WORKOUTS_PER_WEEK);
        
        document.getElementById('workout-this-week').innerHTML = `${thisWeekWorkouts} this week ${workoutTrend.indicator}`;
        document.getElementById('workout-this-week').style.color = workoutTrend.color;
    }

    getPreviousWeight(currentDate) {
        const sortedDates = Object.keys(this.data)
            .filter(date => date < currentDate)
            .sort()
            .reverse();
        
        for (const date of sortedDates) {
            if (this.data[date].weight !== null && this.data[date].weight !== undefined) {
                return this.data[date].weight;
            }
        }
        return null;
    }

    calculateWeightTrend(currentWeight, previousWeight, goalWeight) {
        if (!previousWeight) {
            return { indicator: '', color: '#718096', diff: 0 };
        }

        const diff = currentWeight - previousWeight;
        const aboveGoal = currentWeight > goalWeight;
        const absDiff = Math.abs(diff).toFixed(1);
        
        const upIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 14l5-5 5 5z"/></svg>';
        const downIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 10l5 5 5-5z"/></svg>';
        const sameIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M8 12h8"/></svg>';
        
        if (diff > 0) {
            // Weight went up
            return {
                indicator: `<span style="font-size: 0.85em;">(+${absDiff} lbs ${upIcon})</span>`,
                color: aboveGoal ? '#e53e3e' : '#38a169',
                diff: diff
            };
        } else if (diff < 0) {
            // Weight went down
            return {
                indicator: `<span style="font-size: 0.85em;">(-${absDiff} lbs ${downIcon})</span>`,
                color: aboveGoal ? '#38a169' : '#e53e3e',
                diff: diff
            };
        } else {
            // No change
            return {
                indicator: `<span style="font-size: 0.85em;">(${sameIcon})</span>`,
                color: '#718096',
                diff: 0
            };
        }
    }

    calculateLeetCodeTrend(thisWeek, lastWeek) {
        const diff = thisWeek - lastWeek;
        const upIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 14l5-5 5 5z"/></svg>';
        const downIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 10l5 5 5-5z"/></svg>';
        const sameIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M8 12h8"/></svg>';
        
        if (diff > 0) {
            return {
                indicator: upIcon,
                color: '#38a169'
            };
        } else if (diff < 0) {
            return {
                indicator: downIcon,
                color: '#e53e3e'
            };
        } else {
            return {
                indicator: sameIcon,
                color: '#718096'
            };
        }
    }

    calculateWorkoutTrend(thisWeekWorkouts, daysSinceSunday, goalPerWeek) {
        // Calculate expected workouts based on how far into the week we are
        const expectedWorkouts = (daysSinceSunday / 7) * goalPerWeek;
        
        const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        const upIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 14l5-5 5 5z"/></svg>';
        const downIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 10l5 5 5-5z"/></svg>';
        
        if (thisWeekWorkouts >= goalPerWeek) {
            // Already hit goal!
            return {
                indicator: checkIcon,
                color: '#38a169'
            };
        } else if (thisWeekWorkouts >= expectedWorkouts) {
            // On track
            return {
                indicator: upIcon,
                color: '#38a169'
            };
        } else {
            // Behind pace
            return {
                indicator: downIcon,
                color: '#e53e3e'
            };
        }
    }

    calculateWorkoutStreak() {
        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 365; i++) {
            const date = new Date(today.getTime() - i * 86400000);
            const dateKey = this.getDateKey(date);
            const dayData = this.data[dateKey];
            
            if (dayData && dayData.workout) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    renderStats() {
        this.updateStats();
    }

    renderContributionGraph() {
        // Use the new GitHub-style contribution graph with intensity-based coloring
        const graph = new ContributionGraph('contribution-graph', this.data, {
            cellSize: 11,
            cellGap: 3
        });
        graph.render();
    }

    setupEventListeners() {
        const saveButton = document.getElementById('save-button');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                console.log('Save button clicked');
                this.saveProgress();
            });
        } else {
            console.error('Save button not found!');
        }
        
        // Load today's data on page load
        this.loadTodayData();
        
        // Test form elements
        console.log('Weight input:', document.getElementById('weight-input'));
        console.log('LeetCode input:', document.getElementById('leetcode-input'));
        console.log('Workout checkbox:', document.getElementById('workout-checkbox'));
        
        // Add click listener to custom checkbox label
        const checkboxLabel = document.querySelector('.checkbox-label');
        if (checkboxLabel) {
            checkboxLabel.addEventListener('click', (e) => {
                e.preventDefault();
                const checkbox = document.getElementById('workout-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    console.log('Checkbox toggled:', checkbox.checked);
                }
            });
        }
        
        // Supabase sync event listeners
        this.setupSupabaseSyncListeners();
        
        // Strava sync event listeners
        this.setupStravaSyncListeners();
    }

    setupSupabaseSyncListeners() {
        // Update sync status UI
        this.updateSyncStatusUI();

        // Setup Supabase button (first time setup)
        const setupBtn = document.getElementById('setup-supabase-btn');
        if (setupBtn) {
            setupBtn.addEventListener('click', () => this.showSupabaseSetup());
        }

        // Sign in button
        const signInBtn = document.getElementById('sign-in-btn');
        if (signInBtn) {
            signInBtn.addEventListener('click', () => this.showSupabaseAuth());
        }

        // Sign out button
        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.signOut());
        }

        // Setup modal buttons
        const saveConfigBtn = document.getElementById('save-supabase-config-btn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => this.saveSupabaseConfig());
        }

        const cancelSetupBtn = document.getElementById('cancel-supabase-btn');
        if (cancelSetupBtn) {
            cancelSetupBtn.addEventListener('click', () => this.hideSupabaseModal());
        }

        // Auth modal buttons
        const authSubmitBtn = document.getElementById('auth-submit-btn');
        if (authSubmitBtn) {
            authSubmitBtn.addEventListener('click', () => this.handleAuth());
        }

        const authSwitchBtn = document.getElementById('auth-switch-btn');
        if (authSwitchBtn) {
            authSwitchBtn.addEventListener('click', () => this.toggleAuthMode());
        }

        const cancelAuthBtn = document.getElementById('cancel-auth-btn');
        if (cancelAuthBtn) {
            cancelAuthBtn.addEventListener('click', () => this.hideSupabaseModal());
        }

        // Close modal on outside click
        const modal = document.getElementById('supabase-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideSupabaseModal();
                }
            });
        }

        // Check for existing session on load
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        if (this.supabaseSync.isConfigured()) {
            const session = await this.supabaseSync.getSession();
            if (session) {
                // User is authenticated, load data
                await this.initSupabaseSync();
            }
            this.updateSyncStatusUI();
        }
    }

    async updateSyncStatusUI() {
        const notConfigured = document.getElementById('sync-not-configured');
        const notAuthenticated = document.getElementById('sync-not-authenticated');
        const connected = document.getElementById('sync-connected');
        const userEmailSpan = document.getElementById('user-email');
        const supabaseLink = document.getElementById('supabase-link');

        // Check if all required elements exist
        if (!notConfigured || !notAuthenticated || !connected) {
            console.warn('Sync status UI elements not found');
            return;
        }

        if (!this.supabaseSync.isConfigured()) {
            // Not configured - show setup button
            notConfigured.style.display = 'block';
            notAuthenticated.style.display = 'none';
            connected.style.display = 'none';
        } else {
            // Check if authenticated
            const session = await this.supabaseSync.getSession();
            if (session) {
                // Authenticated - show connected state
                notConfigured.style.display = 'none';
                notAuthenticated.style.display = 'none';
                connected.style.display = 'block';
                
                const email = await this.supabaseSync.getCurrentUserEmail();
                if (userEmailSpan && email) {
                    userEmailSpan.textContent = email;
                }
                
                const dashboardUrl = this.supabaseSync.getDashboardUrl();
                if (dashboardUrl && supabaseLink) {
                    supabaseLink.href = dashboardUrl;
                }
            } else {
                // Configured but not authenticated - show sign in
                notConfigured.style.display = 'none';
                notAuthenticated.style.display = 'block';
                connected.style.display = 'none';
            }
        }
    }

    showSupabaseSetup() {
        const modal = document.getElementById('supabase-modal');
        const setupView = document.getElementById('setup-view');
        const authView = document.getElementById('auth-view');
        if (modal) {
            setupView.style.display = 'block';
            authView.style.display = 'none';
            modal.style.display = 'flex';
        }
    }

    showSupabaseAuth() {
        const modal = document.getElementById('supabase-modal');
        const setupView = document.getElementById('setup-view');
        const authView = document.getElementById('auth-view');
        if (modal) {
            setupView.style.display = 'none';
            authView.style.display = 'block';
            this.authMode = 'signin';
            this.updateAuthUI();
            modal.style.display = 'flex';
        }
    }

    toggleAuthMode() {
        this.authMode = this.authMode === 'signin' ? 'signup' : 'signin';
        this.updateAuthUI();
    }

    updateAuthUI() {
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const submitBtn = document.getElementById('auth-submit-btn');
        const switchBtn = document.getElementById('auth-switch-btn');

        if (this.authMode === 'signin') {
            title.textContent = 'Sign In';
            subtitle.textContent = 'Sign in to sync your data across devices';
            submitBtn.textContent = 'Sign In';
            switchBtn.textContent = 'Need an account? Sign Up';
        } else {
            title.textContent = 'Sign Up';
            subtitle.textContent = 'Create an account to sync your data';
            submitBtn.textContent = 'Sign Up';
            switchBtn.textContent = 'Already have an account? Sign In';
        }
    }

    hideSupabaseModal() {
        const modal = document.getElementById('supabase-modal');
        const urlInput = document.getElementById('supabase-url-input');
        const keyInput = document.getElementById('supabase-key-input');
        const emailInput = document.getElementById('auth-email-input');
        const passwordInput = document.getElementById('auth-password-input');
        const errorDiv = document.getElementById('auth-error');
        
        if (modal) {
            modal.style.display = 'none';
        }
        if (urlInput) urlInput.value = '';
        if (keyInput) keyInput.value = '';
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }

    async saveSupabaseConfig() {
        const urlInput = document.getElementById('supabase-url-input');
        const keyInput = document.getElementById('supabase-key-input');
        const url = urlInput?.value.trim();
        const key = keyInput?.value.trim();

        if (!url || !key) {
            alert('Please enter both Supabase URL and anon key');
            return;
        }

        // Set the config
        this.supabaseSync.setConfig(url, key);

        // Close setup modal and show auth
        this.hideSupabaseModal();
        this.showSupabaseAuth();
    }

    async handleAuth() {
        const emailInput = document.getElementById('auth-email-input');
        const passwordInput = document.getElementById('auth-password-input');
        const errorDiv = document.getElementById('auth-error');
        const email = emailInput?.value.trim();
        const password = passwordInput?.value.trim();

        if (!email || !password) {
            this.showAuthError('Please enter both email and password');
            return;
        }

        try {
            if (this.authMode === 'signin') {
                await this.supabaseSync.signIn(email, password);
                // Success - load data and update UI
                await this.initSupabaseSync();
                this.hideSupabaseModal();
                this.updateSyncStatusUI();
            } else {
                const result = await this.supabaseSync.signUp(email, password);
                
                // Check if email confirmation is required
                if (result.user && !result.session) {
                    // Email confirmation required
                    this.showAuthSuccess('✅ Account created! Please check your email to confirm your account before signing in.');
                    // Switch to sign-in mode
                    setTimeout(() => {
                        this.authMode = 'signin';
                        this.updateAuthUI();
                    }, 3000);
                } else if (result.session) {
                    // Email confirmation disabled - user can sign in immediately
                    await this.initSupabaseSync();
                    this.hideSupabaseModal();
                    this.updateSyncStatusUI();
                } else {
                    this.showAuthError('Signup completed but status unclear. Please try signing in.');
                }
            }
        } catch (error) {
            this.showAuthError(error.message || 'Authentication failed');
        }
    }

    showAuthError(message) {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.className = 'status error';
        }
    }

    showAuthSuccess(message) {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.className = 'status success';
        }
    }

    async signOut() {
        if (confirm('Sign out? Your data will remain locally but won\'t sync anymore.')) {
            await this.supabaseSync.disconnect();
            this.updateSyncStatusUI();
        }
    }

    loadTodayData() {
        // Set date input to today
        const dateInput = document.getElementById('date-input');
        const today = new Date();
        dateInput.value = this.getDateKey(today);
        
        // Load today's data
        this.loadDataForDate(this.getDateKey(today));
        
        // Listen for date changes
        dateInput.addEventListener('change', (e) => {
            this.loadDataForDate(e.target.value);
        });
    }

    loadDataForDate(dateKey) {
        const dateData = this.data[dateKey] || { weight: null, leetcode: 0, workout: false };
        
        // Load data into the form
        document.getElementById('weight-input').value = dateData.weight || '';
        document.getElementById('leetcode-input').value = dateData.leetcode || '';
        
        // Handle custom checkbox
        const workoutCheckbox = document.getElementById('workout-checkbox');
        if (workoutCheckbox) {
            workoutCheckbox.checked = dateData.workout || false;
            // Trigger change event to update visual state
            workoutCheckbox.dispatchEvent(new Event('change'));
        }
    }

    async saveProgress() {
        const dateInput = document.getElementById('date-input');
        const selectedDate = dateInput.value;
        
        if (!selectedDate) {
            alert('Please select a date');
            return;
        }
        
        const weightInput = document.getElementById('weight-input');
        const leetcodeInput = document.getElementById('leetcode-input');
        const workoutCheckbox = document.getElementById('workout-checkbox');
        
        if (!weightInput || !leetcodeInput || !workoutCheckbox) {
            console.error('Form elements not found!');
            return;
        }
        
        const weight = parseFloat(weightInput.value);
        const leetcode = parseInt(leetcodeInput.value) || 0;
        const workout = workoutCheckbox.checked;
        
        this.data[selectedDate] = {
            weight: weight || null,
            leetcode: leetcode,
            workout: workout
        };
        
        this.saveData();
        
        // Sync to Supabase if configured
        if (this.supabaseSync.isConfigured()) {
            await this.supabaseSync.saveDayData(selectedDate, this.data[selectedDate]);
        }
        
        this.renderStats();
        this.renderContributionGraph();
        this.renderCharts();
        
        // Show success feedback
        const saveButton = document.getElementById('save-button');
        const originalText = saveButton.textContent;
        const dateObj = new Date(selectedDate);
        const today = new Date();
        const isToday = this.getDateKey(dateObj) === this.getDateKey(today);
        
        saveButton.textContent = this.supabaseSync.isConfigured() ? 
            (isToday ? 'Saved & Synced!' : 'Updated & Synced!') : 
            (isToday ? 'Saved!' : 'Updated!');
        saveButton.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
        }, 2000);
    }
    
    navigateQuarter(direction) {
        this.currentQuarter += direction;
        
        if (this.currentQuarter < 0) {
            this.currentQuarter = 3;
            this.currentYear--;
        } else if (this.currentQuarter > 3) {
            this.currentQuarter = 0;
            this.currentYear++;
        }
        
        this.updateQuarterDisplay();
        this.renderContributionGraph();
    }
    
    updateQuarterDisplay() {
        const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
        const monthNames = [
            'Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'
        ];
        
        const monthDisplay = document.getElementById('current-month');
        if (monthDisplay) {
            monthDisplay.textContent = `${quarterNames[this.currentQuarter]} ${this.currentYear} (${monthNames[this.currentQuarter]})`;
        }
    }

    renderCharts() {
        this.renderWeightChart();
        this.renderLeetCodeChart();
        this.renderWorkoutChart();
    }

    renderWeightChart() {
        const ctx = document.getElementById('weight-chart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.weight) {
            this.charts.weight.destroy();
        }

        // Get last 30 days of weight data
        const dates = [];
        const weights = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = this.getDateKey(date);
            const dayData = this.data[dateKey];
            
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            weights.push(dayData?.weight || null);
        }

        this.charts.weight = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Weight (lbs)',
                    data: weights,
                    borderColor: '#ae9142',
                    backgroundColor: 'rgba(174, 145, 66, 0.1)',
                    tension: 0.4,
                    fill: true,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return value + ' lbs';
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    renderLeetCodeChart() {
        const ctx = document.getElementById('leetcode-chart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.leetcode) {
            this.charts.leetcode.destroy();
        }

        // Get cumulative LeetCode progress over last 30 days
        const dates = [];
        const cumulative = [];
        const today = new Date();
        let total = 0;
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = this.getDateKey(date);
            const dayData = this.data[dateKey];
            
            total += dayData?.leetcode || 0;
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            cumulative.push(total);
        }

        this.charts.leetcode = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Total Problems',
                    data: cumulative,
                    borderColor: '#0a843d',
                    backgroundColor: 'rgba(10, 132, 61, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    renderWorkoutChart() {
        const ctx = document.getElementById('workout-chart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.workout) {
            this.charts.workout.destroy();
        }

        // Get workouts per week for the last several weeks
        const weekLabels = [];
        const workoutsPerWeek = [];
        const today = new Date();
        
        // Calculate data for the last 12 weeks
        for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() - (weekOffset * 7));
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekEnd.getDate() - 6);
            
            // Count workouts in this week
            let workoutCount = 0;
            for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
                const dateKey = this.getDateKey(d);
                const dayData = this.data[dateKey];
                if (dayData?.workout) {
                    workoutCount++;
                }
            }
            
            // Format week label
            const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            weekLabels.push(weekLabel);
            workoutsPerWeek.push(workoutCount);
        }

        this.charts.workout = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weekLabels,
                datasets: [{
                    label: 'Workouts per Week',
                    data: workoutsPerWeek,
                    borderColor: '#d39f10',
                    backgroundColor: 'rgba(211, 159, 16, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    // Strava Integration Methods
    updateStravaUI(connected) {
        const disconnectedBox = document.getElementById('strava-disconnected');
        const connectedBox = document.getElementById('strava-connected');
        const chartCard = document.getElementById('strava-chart-card');
        const mapCard = document.getElementById('strava-map-card');
        const stravaNote = document.getElementById('strava-note');
        const stravaLegendNote = document.getElementById('strava-legend-note');

        if (connected) {
            disconnectedBox.style.display = 'none';
            connectedBox.style.display = 'block';
            chartCard.style.display = 'block';
            if (mapCard) mapCard.style.display = 'block';
            if (stravaNote) stravaNote.style.display = 'block';
            if (stravaLegendNote) stravaLegendNote.style.display = 'block';
        } else {
            disconnectedBox.style.display = 'block';
            connectedBox.style.display = 'none';
            chartCard.style.display = 'none';
            if (mapCard) mapCard.style.display = 'none';
            if (stravaNote) stravaNote.style.display = 'none';
            if (stravaLegendNote) stravaLegendNote.style.display = 'none';
        }
    }

    renderStravaStats() {
        const stats = this.stravaSync.getRunningStats();
        
        if (!stats) {
            console.log('No Strava data available');
            return;
        }

        // Update detailed stats (check if connected section is visible)
        const distanceEl = document.getElementById('strava-total-distance');
        if (!distanceEl) {
            console.log('Strava stats UI not visible yet');
            return;
        }

        const useMiles = localStorage.getItem('strava-units') === 'miles';
        distanceEl.textContent = useMiles ? `${stats.totalDistanceMiles} mi` : `${stats.totalDistanceKm} km`;
        document.getElementById('strava-avg-pace').textContent = 
            useMiles ? `${stats.avgPaceMinPerMile}/mi` : `${stats.avgPaceMinPerKm}/km`;
        document.getElementById('strava-month-distance').textContent = 
            useMiles ? `${stats.thisMonthDistanceMiles} mi` : `${stats.thisMonthDistanceKm} km`;
        document.getElementById('strava-longest-run').textContent = 
            useMiles ? `${stats.longestRunMiles.toFixed(1)} mi` : `${stats.longestRunKm.toFixed(1)} km`;
        
        // Render latest run map
        this.renderLatestRunMap();
    }

    renderLatestRunMap() {
        if (!this.stravaSync.stravaData || this.stravaSync.stravaData.length === 0) {
            return;
        }

        // Get the most recent run with a map
        const runs = this.stravaSync.stravaData
            .filter(a => a.type === 'Run' && a.map && a.map.summary_polyline)
            .sort((a, b) => new Date(b.start_date_local) - new Date(a.start_date_local));

        if (runs.length === 0) {
            return;
        }

        const latestRun = runs[0];
        const mapCard = document.getElementById('strava-map-card');
        const mapImage = document.getElementById('strava-map-image');
        
        if (!mapCard || !mapImage) {
            return;
        }

        // Generate Static Map URL using Google Maps API (no key needed for basic use)
        const polyline = latestRun.map.summary_polyline;
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x300&path=weight:3|color:0xFC4C02|enc:${encodeURIComponent(polyline)}&maptype=roadmap&key=AIzaSyDummyKeyForDisplay`;
        
        // Alternative: Use Mapbox static API (requires free API key)
        // const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/path-5+FC4C02(${encodeURIComponent(polyline)})/auto/600x300?access_token=YOUR_MAPBOX_TOKEN`;
        
        mapImage.src = mapUrl;

        // Update latest run stats
        const useMiles = localStorage.getItem('strava-units') === 'miles';
        const distance = latestRun.distance / 1000; // convert to km
        const distanceMiles = distance * 0.621371;
        const paceMinPerKm = (latestRun.moving_time / 60) / distance;
        const paceMinPerMile = paceMinPerKm / 0.621371;

        document.getElementById('latest-run-distance').textContent = 
            useMiles ? `${distanceMiles.toFixed(2)} mi` : `${distance.toFixed(2)} km`;
        
        document.getElementById('latest-run-pace').textContent = 
            useMiles ? `${Math.floor(paceMinPerMile)}:${String(Math.floor((paceMinPerMile % 1) * 60)).padStart(2, '0')}/mi` 
                     : `${Math.floor(paceMinPerKm)}:${String(Math.floor((paceMinPerKm % 1) * 60)).padStart(2, '0')}/km`;
        
        document.getElementById('latest-run-calories').textContent = 
            latestRun.calories ? `${Math.round(latestRun.calories)} kcal` : '--';
        
        const runDate = new Date(latestRun.start_date_local);
        document.getElementById('latest-run-date').textContent = 
            runDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    renderStravaChart() {
        const weeklyData = this.stravaSync.getWeeklyData(12);
        
        if (!weeklyData) {
            console.log('No Strava weekly data available');
            return;
        }

        const canvas = document.getElementById('strava-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.strava) {
            this.charts.strava.destroy();
        }

        const useMiles = localStorage.getItem('strava-units') === 'miles';
        const distanceData = weeklyData.map(w => useMiles ? w.distanceMiles : w.distanceKm);

        this.charts.strava = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weeklyData.map(w => w.week),
                datasets: [{
                    label: useMiles ? 'Miles' : 'Kilometers',
                    data: distanceData,
                    backgroundColor: '#FC4C02',
                    borderColor: '#FC4C02',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: useMiles ? 'Distance (miles)' : 'Distance (km)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    setupStravaSyncListeners() {
        const connectBtn = document.getElementById('connect-strava-btn');
        const syncBtn = document.getElementById('sync-strava-btn');
        const disconnectBtn = document.getElementById('disconnect-strava-btn');

        if (connectBtn) {
            connectBtn.addEventListener('click', async () => {
                try {
                    await this.stravaSync.connect();
                    this.mergeStravaWorkouts();
                    this.updateStravaUI(true);
                    this.renderStravaStats();
                    this.renderStravaChart();
                    this.renderStats();
                    this.renderContributionGraph();
                    alert('Successfully connected to Strava! Your runs have been added to your workout tracking.');
                } catch (error) {
                    console.error('Error connecting to Strava:', error);
                    alert('Failed to connect to Strava. Please check your setup and try again.');
                }
            });
        }

        if (syncBtn) {
            syncBtn.addEventListener('click', async () => {
                syncBtn.disabled = true;
                syncBtn.textContent = 'Syncing...';
                
                try {
                    const result = await this.stravaSync.syncActivities();
                    this.mergeStravaWorkouts();
                    this.renderStravaStats();
                    this.renderStravaChart();
                    this.renderStats();
                    this.renderContributionGraph();
                    alert(`Synced ${result.count} activities from Strava! Workouts updated on contribution graph.`);
                } catch (error) {
                    console.error('Error syncing Strava:', error);
                    alert('Failed to sync Strava data: ' + error.message);
                } finally {
                    syncBtn.disabled = false;
                    syncBtn.textContent = 'Sync Now';
                }
            });
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to disconnect Strava? This will remove Strava runs from your workout tracking.')) {
                    try {
                        await this.stravaSync.disconnect();
                        this.updateStravaUI(false);
                        // Note: We don't remove workout flags as user might have manually tracked some
                        // If you want to remove only Strava-sourced workouts, additional tracking would be needed
                        alert('Disconnected from Strava');
                    } catch (error) {
                        console.error('Error disconnecting Strava:', error);
                        alert('Failed to disconnect Strava');
                    }
                }
            });
        }
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing DauphinDash...');
    try {
        new DauphinDash();
        console.log('DauphinDash initialized successfully');
    } catch (error) {
        console.error('Error initializing DauphinDash:', error);
    }
});
