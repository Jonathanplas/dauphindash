class DauphinDash {
    constructor() {
        this.data = this.loadData();
        this.currentQuarter = Math.floor(new Date().getMonth() / 3);
        this.currentYear = new Date().getFullYear();
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

        // Generate the entire quarter as one continuous calendar
        const quarterStartMonth = this.currentQuarter * 3;
        const quarterEndMonth = quarterStartMonth + 2;
        
        // Get the first day of the quarter (first day of first month)
        const firstDayOfQuarter = new Date(this.currentYear, quarterStartMonth, 1);
        
        // Get the last day of the quarter (last day of last month)
        const lastDayOfQuarter = new Date(this.currentYear, quarterEndMonth + 1, 0);
        
        // Get the first Sunday of the quarter (or before if quarter doesn't start on Sunday)
        const firstSunday = new Date(firstDayOfQuarter);
        firstSunday.setDate(firstDayOfQuarter.getDate() - firstDayOfQuarter.getDay());
        
        // Get the last Saturday of the quarter (or after if quarter doesn't end on Saturday)
        const lastSaturday = new Date(lastDayOfQuarter);
        lastSaturday.setDate(lastDayOfQuarter.getDate() + (6 - lastDayOfQuarter.getDay()));
        
        // Create all days from first Sunday to last Saturday
        const allDays = [];
        const currentDate = new Date(firstSunday);
        
        while (currentDate <= lastSaturday) {
            const dateKey = this.getDateKey(currentDate);
            const dayData = this.data[dateKey] || {};
            const dayMonth = currentDate.getMonth();
            const dayYear = currentDate.getFullYear();
            
            allDays.push({
                date: new Date(currentDate),
                dateKey: dateKey,
                data: dayData,
                isCurrentQuarter: dayMonth >= quarterStartMonth && dayMonth <= quarterEndMonth && dayYear === this.currentYear,
                month: dayMonth,
                year: dayYear
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Create grid (7 columns for days of week)
        const weeks = [];
        for (let i = 0; i < allDays.length; i += 7) {
            weeks.push(allDays.slice(i, i + 7));
        }

        // Add quarter month labels
        this.addQuarterMonthLabels(graph, quarterStartMonth, quarterEndMonth);

        weeks.forEach((week, weekIndex) => {
            week.forEach(day => {
                const cell = document.createElement('div');
                cell.className = 'day-cell split-dot';
                cell.dataset.date = day.dateKey;
                
                // Fade out days not in current quarter
                if (!day.isCurrentQuarter) {
                    cell.classList.add('other-quarter');
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

                graph.appendChild(cell);
            });
        });
        
        // Add week separators
        for (let i = 1; i < weeks.length; i++) {
            const separator = document.createElement('div');
            separator.className = 'week-separator';
            graph.appendChild(separator);
        }
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
    
    addQuarterMonthLabels(graph, quarterStartMonth, quarterEndMonth) {
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        // Create month labels container
        const labelsContainer = document.createElement('div');
        labelsContainer.className = 'quarter-month-labels-container';
        
        const cellWidth = 20; // Same as .day-cell width
        const gap = 4; // Same as grid gap
        
        // Create labels for each month in the quarter
        for (let month = quarterStartMonth; month <= quarterEndMonth; month++) {
            const monthLabel = document.createElement('div');
            monthLabel.className = 'quarter-month-label';
            monthLabel.textContent = monthNames[month];
            
            // Calculate position based on the first day of the month
            const firstDayOfMonth = new Date(this.currentYear, month, 1);
            const firstSunday = new Date(firstDayOfMonth);
            firstSunday.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
            
            const daysFromStart = Math.floor((firstDayOfMonth - firstSunday) / (1000 * 60 * 60 * 24));
            const position = daysFromStart * (cellWidth + gap);
            
            monthLabel.style.left = `${position}px`;
            monthLabel.style.width = `${this.getMonthWidth(month) * (cellWidth + gap) - gap}px`;
            
            labelsContainer.appendChild(monthLabel);
        }
        
        // Insert the labels container at the beginning of the graph
        graph.insertBefore(labelsContainer, graph.firstChild);
    }
    
    getMonthWidth(month) {
        const year = this.currentYear;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Get the first Sunday of the month (or before if month doesn't start on Sunday)
        const firstSunday = new Date(firstDay);
        firstSunday.setDate(firstDay.getDate() - firstDay.getDay());
        
        // Get the last Saturday of the month (or after if month doesn't end on Saturday)
        const lastSaturday = new Date(lastDay);
        lastSaturday.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
        
        const daysDiff = Math.floor((lastSaturday - firstSunday) / (1000 * 60 * 60 * 24)) + 1;
        return daysDiff;
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
