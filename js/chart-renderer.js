// Chart rendering using Chart.js
class ChartRenderer {
    constructor() {
        this.charts = {
            weight: null,
            leetcode: null,
            workout: null
        };
    }

    renderWeightChart(data) {
        const canvas = document.getElementById('weight-chart');
        if (!canvas) return;

        const sortedDates = Object.keys(data)
            .filter(date => data[date].weight !== null && data[date].weight !== undefined)
            .sort();

        const weights = sortedDates.map(date => data[date].weight);
        const labels = sortedDates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        if (this.charts.weight) {
            this.charts.weight.destroy();
        }

        this.charts.weight = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (lbs)',
                    data: weights,
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
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    renderLeetCodeChart(data) {
        const canvas = document.getElementById('leetcode-chart');
        if (!canvas) return;

        const today = new Date();
        const weeks = [];
        const counts = [];

        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(today.getTime() - i * 7 * 86400000);
            const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
            
            let weekCount = 0;
            Object.keys(data).forEach(dateKey => {
                const date = new Date(dateKey);
                if (date >= weekStart && date < weekEnd) {
                    weekCount += data[dateKey].leetcode || 0;
                }
            });

            weeks.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            counts.push(weekCount);
        }

        if (this.charts.leetcode) {
            this.charts.leetcode.destroy();
        }

        this.charts.leetcode = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Problems Solved',
                    data: counts,
                    backgroundColor: '#1c4f8f',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    renderWorkoutChart(data) {
        const canvas = document.getElementById('workout-chart');
        if (!canvas) return;

        const today = new Date();
        const weeks = [];
        const counts = [];

        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(today.getTime() - i * 7 * 86400000);
            const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
            
            let weekCount = 0;
            Object.keys(data).forEach(dateKey => {
                const date = new Date(dateKey);
                if (date >= weekStart && date < weekEnd) {
                    if (data[dateKey].workout) weekCount++;
                }
            });

            weeks.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            counts.push(weekCount);
        }

        if (this.charts.workout) {
            this.charts.workout.destroy();
        }

        this.charts.workout = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Workouts',
                    data: counts,
                    backgroundColor: '#ae9142',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    renderAll(data) {
        this.renderWeightChart(data);
        this.renderLeetCodeChart(data);
        this.renderWorkoutChart(data);
    }
}
