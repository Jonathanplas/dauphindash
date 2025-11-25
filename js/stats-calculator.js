// Statistics calculation and trend analysis
class StatsCalculator {
    constructor(data) {
        this.data = data;
        this.GOAL_WEIGHT = 160;
        this.GOAL_WORKOUTS_PER_WEEK = 5;
    }

    getMostRecentWeight() {
        const sortedDates = Object.keys(this.data).sort().reverse();
        for (const date of sortedDates) {
            if (this.data[date].weight !== null && this.data[date].weight !== undefined) {
                return { date, weight: this.data[date].weight };
            }
        }
        return null;
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

    calculateWeightTrend(currentWeight, previousWeight) {
        if (!previousWeight) {
            return { indicator: '', color: '#718096', diff: 0 };
        }

        const diff = currentWeight - previousWeight;
        const aboveGoal = currentWeight > this.GOAL_WEIGHT;
        const absDiff = Math.abs(diff).toFixed(1);
        
        const upIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 14l5-5 5 5z"/></svg>';
        const downIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 10l5 5 5-5z"/></svg>';
        const sameIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M8 12h8"/></svg>';
        
        if (diff > 0) {
            return {
                indicator: `<span style="font-size: 0.85em;">(+${absDiff} lbs ${upIcon})</span>`,
                color: aboveGoal ? '#e53e3e' : '#38a169',
                diff: diff
            };
        } else if (diff < 0) {
            return {
                indicator: `<span style="font-size: 0.85em;">(-${absDiff} lbs ${downIcon})</span>`,
                color: aboveGoal ? '#38a169' : '#e53e3e',
                diff: diff
            };
        } else {
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
            return { indicator: upIcon, color: '#38a169' };
        } else if (diff < 0) {
            return { indicator: downIcon, color: '#e53e3e' };
        } else {
            return { indicator: sameIcon, color: '#718096' };
        }
    }

    calculateWorkoutTrend(thisWeekWorkouts, daysSinceSunday) {
        const expectedWorkouts = (daysSinceSunday / 7) * this.GOAL_WORKOUTS_PER_WEEK;
        
        const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        const upIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 14l5-5 5 5z"/></svg>';
        const downIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-left: 4px;"><path d="M7 10l5 5 5-5z"/></svg>';
        
        if (thisWeekWorkouts >= this.GOAL_WORKOUTS_PER_WEEK) {
            return { indicator: checkIcon, color: '#38a169' };
        } else if (thisWeekWorkouts >= expectedWorkouts) {
            return { indicator: upIcon, color: '#38a169' };
        } else {
            return { indicator: downIcon, color: '#e53e3e' };
        }
    }

    calculateWorkoutStreak(data) {
        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 365; i++) {
            const date = new Date(today.getTime() - i * 86400000);
            const dateKey = this.getDateKey(date);
            const dayData = data[dateKey];
            
            if (dayData && dayData.workout) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    getDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
