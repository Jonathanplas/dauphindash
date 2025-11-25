// Data persistence and management
export class DataManager {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        const saved = localStorage.getItem('dauphindash-data');
        return saved ? JSON.parse(saved) : {};
    }

    saveData() {
        localStorage.setItem('dauphindash-data', JSON.stringify(this.data));
    }

    getDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getTodayData() {
        const today = this.getDateKey();
        return this.data[today] || { weight: null, leetcode: 0, workout: false };
    }

    getAllData() {
        return this.data;
    }

    setData(data) {
        this.data = data;
        this.saveData();
    }

    mergeData(newData) {
        this.data = { ...this.data, ...newData };
        this.saveData();
    }

    getDateData(dateKey) {
        return this.data[dateKey] || { weight: null, leetcode: 0, workout: false };
    }

    setDateData(dateKey, data) {
        this.data[dateKey] = data;
        this.saveData();
    }
}
