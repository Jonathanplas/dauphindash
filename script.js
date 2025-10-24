class DauphinDash {
    constructor() {
        this.data = this.loadData();
        this.currentQuarter = Math.floor(new Date().getMonth() / 3);
        this.currentYear = new Date().getFullYear();
        this.gistSync = new GistSync();
        this.init();
    }

    async init() {
        this.renderStats();
        this.renderContributionGraph();
        this.setupEventListeners();
        await this.initGistSync();
    }

    async initGistSync() {
        // Try to load data from Gist if authenticated
        if (this.gistSync.isAuthenticated()) {
            const gistData = await this.gistSync.loadFromGist();
            if (gistData) {
                // Merge Gist data with local data (Gist takes precedence)
                this.data = { ...this.data, ...gistData };
                this.saveData();
                this.renderStats();
                this.renderContributionGraph();
                console.log('✅ Loaded data from GitHub Gist');
            }
        }
    }

    loadData() {
        const saved = localStorage.getItem('dauphindash-data');
        return saved ? JSON.parse(saved) : {};
    }

    saveData() {
        localStorage.setItem('dauphindash-data', JSON.stringify(this.data));
    }

    getDateKey(date = new Date()) {
        return date.toISOString().split('T')[0];
    }

    getTodayData() {
        const today = this.getDateKey();
        return this.data[today] || { weight: null, leetcode: 0, workout: false };
    }

    updateStats() {
        const today = this.getTodayData();
        
        // Update weight
        const weightElement = document.getElementById('current-weight');
        const weightChangeElement = document.getElementById('weight-change');
        
        if (today.weight) {
            weightElement.textContent = `${today.weight} lbs`;
            
            // Calculate weight change from yesterday
            const yesterday = this.getDateKey(new Date(Date.now() - 86400000));
            const yesterdayData = this.data[yesterday];
            if (yesterdayData && yesterdayData.weight) {
                const change = today.weight - yesterdayData.weight;
                const changeText = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
                weightChangeElement.textContent = `${changeText} from yesterday`;
                weightChangeElement.style.color = change > 0 ? '#e53e3e' : '#38a169';
            } else {
                weightChangeElement.textContent = 'First entry';
                weightChangeElement.style.color = '#718096';
            }
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
        document.getElementById('leetcode-this-week').textContent = `${thisWeekLeetcode} this week`;

        // Update workout stats
        const workoutStreak = this.calculateWorkoutStreak();
        document.getElementById('workout-streak').textContent = workoutStreak;
        
        const thisWeekWorkouts = Object.entries(this.data)
            .filter(([date]) => new Date(date) >= weekAgo)
            .reduce((sum, [, day]) => sum + (day.workout ? 1 : 0), 0);
        document.getElementById('workout-this-week').textContent = `${thisWeekWorkouts} this week`;
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
        const graph = document.getElementById('contribution-graph');
        graph.innerHTML = '';

        // Generate three months for the quarter
        const quarterStartMonth = this.currentQuarter * 3;
        const months = [];
        
        for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
            const month = quarterStartMonth + monthOffset;
            const year = this.currentYear;
            
            // Get the first day of the month
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Get the first Sunday of the month (or before if month doesn't start on Sunday)
            const firstSunday = new Date(firstDay);
            firstSunday.setDate(firstDay.getDate() - firstDay.getDay());
            
            // Get the last Saturday of the month (or after if month doesn't end on Saturday)
            const lastSaturday = new Date(lastDay);
            lastSaturday.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
            
            // Create all days from first Sunday to last Saturday
            const allDays = [];
            const currentDate = new Date(firstSunday);
            
            while (currentDate <= lastSaturday) {
                const dateKey = this.getDateKey(currentDate);
                const dayData = this.data[dateKey] || {};
                
                allDays.push({
                    date: new Date(currentDate),
                    dateKey: dateKey,
                    data: dayData,
                    isCurrentMonth: currentDate.getMonth() === month,
                    month: month,
                    year: year
                });
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            months.push({
                month: month,
                year: year,
                days: allDays
            });
        }

        // Add month labels above each month
        this.addHorizontalMonthLabels(graph, months);

        // Create the graph wrapper that contains day labels and quarter container
        const graphWrapper = document.createElement('div');
        graphWrapper.className = 'graph-wrapper';
        
        // Add day labels
        const dayLabelsContainer = document.createElement('div');
        dayLabelsContainer.className = 'day-labels';
        const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        dayLabels.forEach(label => {
            const dayLabel = document.createElement('div');
            dayLabel.className = 'day-label';
            dayLabel.textContent = label;
            dayLabelsContainer.appendChild(dayLabel);
        });
        graphWrapper.appendChild(dayLabelsContainer);

        // Create the horizontal layout with three month blocks
        const quarterContainer = document.createElement('div');
        quarterContainer.className = 'quarter-container';
        
        months.forEach((monthData, monthIndex) => {
            // Create month block
            const monthBlock = document.createElement('div');
            monthBlock.className = 'month-block';
            
            // Create grid for this month (7 columns for days of week)
            const weeks = [];
            for (let i = 0; i < monthData.days.length; i += 7) {
                weeks.push(monthData.days.slice(i, i + 7));
            }
            
            weeks.forEach((week, weekIndex) => {
                week.forEach(day => {
                    const cell = document.createElement('div');
                    cell.className = 'day-cell split-dot';
                    cell.dataset.date = day.dateKey;
                    
                    // Fade out days not in current month
                    if (!day.isCurrentMonth) {
                        cell.classList.add('other-month');
                    }
                    
                    // Create split dot with thirds
                    const hasWeight = day.data.weight !== null && day.data.weight !== undefined;
                    const hasLeetcode = day.data.leetcode > 0;
                    const hasWorkout = day.data.workout === true;
                    
                    // Create the split dot visual
                    const dot = document.createElement('div');
                    dot.className = 'split-dot-inner';
                    
                    // Weight third (top)
                    const weightThird = document.createElement('div');
                    weightThird.className = 'dot-third weight-third';
                    if (hasWeight) weightThird.classList.add('active');
                    
                    // LeetCode third (bottom-left)
                    const leetcodeThird = document.createElement('div');
                    leetcodeThird.className = 'dot-third leetcode-third';
                    if (hasLeetcode) leetcodeThird.classList.add('active');
                    
                    // Workout third (bottom-right)
                    const workoutThird = document.createElement('div');
                    workoutThird.className = 'dot-third workout-third';
                    if (hasWorkout) workoutThird.classList.add('active');
                    
                    dot.appendChild(weightThird);
                    dot.appendChild(leetcodeThird);
                    dot.appendChild(workoutThird);
                    cell.appendChild(dot);

                    // Add tooltip
                    const tooltip = this.createTooltip(day);
                    cell.appendChild(tooltip);
                    
                    cell.addEventListener('mouseenter', () => {
                        tooltip.classList.add('show');
                    });
                    
                    cell.addEventListener('mouseleave', () => {
                        tooltip.classList.remove('show');
                    });

                    monthBlock.appendChild(cell);
                });
            });
            
            quarterContainer.appendChild(monthBlock);
            
            // Add separator between months (except after the last month)
            if (monthIndex < months.length - 1) {
                const separator = document.createElement('div');
                separator.className = 'month-separator';
                quarterContainer.appendChild(separator);
            }
        });
        
        graphWrapper.appendChild(quarterContainer);
        graph.appendChild(graphWrapper);
    }

    createTooltip(day) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        
        const dateStr = day.date.toLocaleDateString();
        const weight = day.data.weight ? `${day.data.weight} lbs` : 'No weight data';
        const leetcode = day.data.leetcode || 0;
        const workout = day.data.workout ? 'Yes' : 'No';
        
        tooltip.innerHTML = `
            <div><strong>${dateStr}</strong></div>
            <div>Weight: ${weight}</div>
            <div>LeetCode: ${leetcode} problems</div>
            <div>Workout: ${workout}</div>
        `;
        
        return tooltip;
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
        
        // Quarter navigation
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => this.navigateQuarter(-1));
        }
        
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => this.navigateQuarter(1));
        }
        
        this.updateQuarterDisplay();
        
        // GitHub sync event listeners
        this.setupGitHubSyncListeners();
    }

    setupGitHubSyncListeners() {
        // Update sync status UI
        this.updateSyncStatusUI();

        // Setup GitHub button
        const setupBtn = document.getElementById('setup-github-btn');
        if (setupBtn) {
            setupBtn.addEventListener('click', () => this.showGitHubModal());
        }

        // Disconnect GitHub button
        const disconnectBtn = document.getElementById('disconnect-github-btn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnectGitHub());
        }

        // Modal buttons
        const saveTokenBtn = document.getElementById('save-token-btn');
        if (saveTokenBtn) {
            saveTokenBtn.addEventListener('click', () => this.saveGitHubToken());
        }

        const cancelTokenBtn = document.getElementById('cancel-token-btn');
        if (cancelTokenBtn) {
            cancelTokenBtn.addEventListener('click', () => this.hideGitHubModal());
        }

        // Close modal on outside click
        const modal = document.getElementById('github-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideGitHubModal();
                }
            });
        }
    }

    updateSyncStatusUI() {
        const isConnected = this.gistSync.isAuthenticated();
        const disconnectedState = document.getElementById('sync-disconnected');
        const connectedState = document.getElementById('sync-connected');
        const gistLink = document.getElementById('gist-link');

        if (isConnected) {
            disconnectedState.style.display = 'none';
            connectedState.style.display = 'block';
            const gistUrl = this.gistSync.getGistUrl();
            if (gistUrl && gistLink) {
                gistLink.href = gistUrl;
            }
        } else {
            disconnectedState.style.display = 'block';
            connectedState.style.display = 'none';
        }
    }

    showGitHubModal() {
        const modal = document.getElementById('github-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideGitHubModal() {
        const modal = document.getElementById('github-modal');
        const tokenInput = document.getElementById('github-token-input');
        if (modal) {
            modal.style.display = 'none';
        }
        if (tokenInput) {
            tokenInput.value = '';
        }
    }

    async saveGitHubToken() {
        const tokenInput = document.getElementById('github-token-input');
        const token = tokenInput?.value.trim();

        if (!token) {
            alert('Please enter a GitHub token');
            return;
        }

        // Set the token
        this.gistSync.setAccessToken(token);

        // Test the token
        const isValid = await this.gistSync.testToken();
        if (!isValid) {
            alert('Invalid GitHub token. Please check your token and try again.');
            this.gistSync.disconnect();
            return;
        }

        // Sync current data to Gist
        const synced = await this.gistSync.syncToGist(this.data);
        if (synced) {
            alert('✅ Connected to GitHub! Your data will now sync automatically.');
            this.hideGitHubModal();
            this.updateSyncStatusUI();
        } else {
            alert('Failed to sync data to GitHub. Please try again.');
        }
    }

    async disconnectGitHub() {
        if (confirm('Disconnect from GitHub? Your data will remain locally but won\'t sync anymore.')) {
            this.gistSync.disconnect();
            this.updateSyncStatusUI();
        }
    }

    loadTodayData() {
        const todayData = this.getTodayData();
        
        // Load today's data into the form
        document.getElementById('weight-input').value = todayData.weight || '';
        document.getElementById('leetcode-input').value = todayData.leetcode || '';
        
        // Handle custom checkbox
        const workoutCheckbox = document.getElementById('workout-checkbox');
        if (workoutCheckbox) {
            workoutCheckbox.checked = todayData.workout || false;
            // Trigger change event to update visual state
            workoutCheckbox.dispatchEvent(new Event('change'));
        }
    }

    async saveProgress() {
        const today = this.getDateKey();
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
        
        this.data[today] = {
            weight: weight || null,
            leetcode: leetcode,
            workout: workout
        };
        
        this.saveData();
        
        // Sync to Gist if authenticated
        if (this.gistSync.isAuthenticated()) {
            await this.gistSync.syncToGist(this.data);
        }
        
        this.renderStats();
        this.renderContributionGraph();
        
        // Show success feedback
        const saveButton = document.getElementById('save-button');
        const originalText = saveButton.textContent;
        saveButton.textContent = this.gistSync.isAuthenticated() ? 'Saved & Synced!' : 'Saved!';
        saveButton.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
        }, 2000);
    }
    
    addHorizontalMonthLabels(graph, months) {
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        // Create month labels container
        const labelsContainer = document.createElement('div');
        labelsContainer.className = 'horizontal-month-labels-container';
        
        months.forEach((monthData, index) => {
            const monthLabel = document.createElement('div');
            monthLabel.className = 'horizontal-month-label';
            monthLabel.textContent = monthNames[monthData.month];
            labelsContainer.appendChild(monthLabel);
        });
        
        // Insert the labels container at the beginning of the graph
        graph.insertBefore(labelsContainer, graph.firstChild);
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
