class DauphinDash {
    constructor() {
        this.data = this.loadData();
        this.init();
    }

    init() {
        this.renderStats();
        this.renderContributionGraph();
        this.setupEventListeners();
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

        // Generate last 365 days
        const today = new Date();
        const days = [];
        
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 86400000);
            const dateKey = this.getDateKey(date);
            const dayData = this.data[dateKey] || {};
            
            days.push({
                date: date,
                dateKey: dateKey,
                data: dayData
            });
        }

        // Create grid
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }

        weeks.forEach(week => {
            week.forEach(day => {
                const cell = document.createElement('div');
                cell.className = 'day-cell';
                cell.dataset.date = day.dateKey;
                
                // Determine cell class based on data
                const hasWeight = day.data.weight !== null && day.data.weight !== undefined;
                const hasLeetcode = day.data.leetcode > 0;
                const hasWorkout = day.data.workout === true;
                
                if (hasWeight && hasLeetcode && hasWorkout) {
                    cell.classList.add('multiple');
                } else if (hasWeight) {
                    cell.classList.add('weight');
                } else if (hasLeetcode) {
                    cell.classList.add('leetcode');
                } else if (hasWorkout) {
                    cell.classList.add('workout');
                }

                // Add tooltip
                const tooltip = this.createTooltip(day);
                cell.appendChild(tooltip);
                
                cell.addEventListener('mouseenter', () => {
                    tooltip.classList.add('show');
                });
                
                cell.addEventListener('mouseleave', () => {
                    tooltip.classList.remove('show');
                });

                graph.appendChild(cell);
            });
        });
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
        saveButton.addEventListener('click', () => this.saveProgress());
        
        // Load today's data on page load
        this.loadTodayData();
    }

    loadTodayData() {
        const todayData = this.getTodayData();
        
        // Load today's data into the form
        document.getElementById('weight-input').value = todayData.weight || '';
        document.getElementById('leetcode-input').value = todayData.leetcode || '';
        document.getElementById('workout-checkbox').checked = todayData.workout || false;
    }

    saveProgress() {
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
        this.renderStats();
        this.renderContributionGraph();
        
        // Show success feedback
        const saveButton = document.getElementById('save-button');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        saveButton.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
        }, 2000);
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
