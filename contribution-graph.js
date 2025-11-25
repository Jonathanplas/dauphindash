// GitHub-style contribution graph component
class ContributionGraph {
    constructor(containerId, data, options = {}) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.cellSize = options.cellSize || 12;
        this.cellGap = options.cellGap || 3;
        this.monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
        
        // GitHub-style intensity colors using dark gold
        this.colors = {
            empty: '#ebedf0',
            level1: '#f4eed8', // 25% activity
            level2: '#d9c596', // 50% activity
            level3: '#b89f5f', // 75% activity
            level4: '#8c7535'  // 100% activity - full dark gold
        };
        
        // Weights for activity calculation
        this.weights = {
            weight: 0.20,      // 20% for logging weight
            workout: 0.25,     // 25% for workout
            leetcode: 0.55     // 55% for LeetCode (scaled by problems solved)
        };
        
        // Max LeetCode problems per day for scaling (anything above this is 100%)
        this.maxLeetCodePerDay = 5;
    }

    render() {
        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        
        // Calculate grid dimensions
        const weeks = this.getWeeksBetween(oneYearAgo, today);
        const width = (this.cellSize + this.cellGap) * weeks + 30; // 30 for day labels
        const height = (this.cellSize + this.cellGap) * 7 + 20; // 20 for month labels
        
        // Create SVG with viewBox for responsive scaling
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', 'auto');
        svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        svg.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        svg.style.fontSize = '10px';
        svg.style.maxHeight = '200px';
        
        // Clear container
        this.container.innerHTML = '';
        this.container.appendChild(svg);
        
        // Render month labels
        this.renderMonthLabels(svg, oneYearAgo, today, weeks);
        
        // Render day labels
        this.renderDayLabels(svg);
        
        // Render cells
        this.renderCells(svg, oneYearAgo, today);
    }

    renderMonthLabels(svg, startDate, endDate, totalWeeks) {
        let currentMonth = -1;
        let weekIndex = 0;
        
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const month = currentDate.getMonth();
            
            if (month !== currentMonth && currentDate.getDate() <= 7) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', 30 + weekIndex * (this.cellSize + this.cellGap));
                text.setAttribute('y', 10);
                text.setAttribute('fill', '#666');
                text.setAttribute('font-size', '10px');
                text.textContent = this.monthLabels[month];
                svg.appendChild(text);
                currentMonth = month;
            }
            
            if (currentDate.getDay() === 0) {
                weekIndex++;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    renderDayLabels(svg) {
        for (let day = 0; day < 7; day++) {
            if (this.dayLabels[day]) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', 0);
                text.setAttribute('y', 20 + day * (this.cellSize + this.cellGap) + this.cellSize / 2 + 3);
                text.setAttribute('fill', '#666');
                text.setAttribute('font-size', '9px');
                text.textContent = this.dayLabels[day];
                svg.appendChild(text);
            }
        }
    }

    renderCells(svg, startDate, endDate) {
        const currentDate = new Date(startDate);
        let weekIndex = 0;
        let dayOfWeek = currentDate.getDay();
        
        // Start on Sunday
        while (currentDate.getDay() !== 0) {
            currentDate.setDate(currentDate.getDate() - 1);
        }
        dayOfWeek = 0;
        
        while (currentDate <= endDate) {
            const dateKey = this.formatDate(currentDate);
            const dayData = this.data[dateKey] || {};
            
            const x = 30 + weekIndex * (this.cellSize + this.cellGap);
            const y = 20 + dayOfWeek * (this.cellSize + this.cellGap);
            
            // Determine cell color based on activities
            const color = this.getCellColor(dayData);
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', this.cellSize);
            rect.setAttribute('height', this.cellSize);
            rect.setAttribute('fill', color);
            rect.setAttribute('rx', 2);
            rect.setAttribute('data-date', dateKey);
            rect.style.cursor = 'pointer';
            
            // Add tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = this.getTooltipText(dateKey, dayData);
            rect.appendChild(title);
            
            svg.appendChild(rect);
            
            dayOfWeek++;
            if (dayOfWeek === 7) {
                dayOfWeek = 0;
                weekIndex++;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    getCellColor(dayData) {
        const hasWeight = dayData.weight !== null && dayData.weight !== undefined;
        const hasWorkout = dayData.workout === true;
        const leetcodeCount = dayData.leetcode || 0;
        
        // Calculate activity score (0 to 1)
        let activityScore = 0;
        
        // Add weight contribution (20%)
        if (hasWeight) {
            activityScore += this.weights.weight;
        }
        
        // Add workout contribution (25%)
        if (hasWorkout) {
            activityScore += this.weights.workout;
        }
        
        // Add LeetCode contribution (55%, scaled by problems solved)
        if (leetcodeCount > 0) {
            const leetcodeRatio = Math.min(leetcodeCount / this.maxLeetCodePerDay, 1);
            activityScore += this.weights.leetcode * leetcodeRatio;
        }
        
        // Map activity score to color levels
        if (activityScore === 0) return this.colors.empty;
        if (activityScore <= 0.25) return this.colors.level1;
        if (activityScore <= 0.50) return this.colors.level2;
        if (activityScore <= 0.75) return this.colors.level3;
        return this.colors.level4;
    }

    getTooltipText(dateKey, dayData) {
        const date = new Date(dateKey);
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        const activities = [];
        if (dayData.weight) activities.push(`Weight: ${dayData.weight} lbs`);
        if (dayData.leetcode) activities.push(`LeetCode: ${dayData.leetcode}`);
        if (dayData.workout) activities.push('Workout ✓');
        
        if (activities.length === 0) {
            return `${formattedDate}\nNo activities`;
        }
        
        return `${formattedDate}\n${activities.join(', ')}`;
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getWeeksBetween(start, end) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        return Math.ceil((end - start) / msPerWeek) + 1;
    }
}
