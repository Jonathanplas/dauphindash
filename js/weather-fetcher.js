// Weather data fetching and display
class WeatherFetcher {
    constructor() {
        this.latitude = 41.7037;  // South Bend, IN (Notre Dame)
        this.longitude = -86.2379;
    }

    async fetch() {
        const weatherIcon = document.getElementById('weather-icon');
        const weatherTemp = document.getElementById('weather-temp');
        const weatherDesc = document.getElementById('weather-desc');
        const rainTimeline = document.getElementById('rain-timeline');

        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${this.latitude}&longitude=${this.longitude}&current=temperature_2m,weather_code&hourly=precipitation_probability&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`
            );
            
            if (!response.ok) throw new Error('Weather fetch failed');
            
            const data = await response.json();
            const current = data.current;
            
            // Update temperature
            weatherTemp.textContent = `${Math.round(current.temperature_2m)}°F`;
            
            // Weather code to icon and description mapping
            const weatherInfo = this.getWeatherInfo(current.weather_code);
            weatherIcon.textContent = weatherInfo.icon;
            weatherDesc.textContent = weatherInfo.description;
            
            // Render hourly rain probability
            this.renderRainTimeline(data.hourly, rainTimeline);
            
        } catch (error) {
            console.error('Error fetching weather:', error);
            weatherDesc.textContent = 'Unable to load';
        }
    }

    renderRainTimeline(hourly, container) {
        if (!hourly || !container) return;

        const now = new Date();
        const currentHour = now.getHours();
        
        // Get next 12 hours of rain probability
        const hours = [];
        for (let i = 0; i < 12; i++) {
            const hour = (currentHour + i) % 24;
            const prob = hourly.precipitation_probability[currentHour + i] || 0;
            hours.push({ hour, probability: prob });
        }

        // Create rain timeline visualization
        container.innerHTML = `
            <div class="rain-hours">
                ${hours.map(h => `
                    <div class="rain-hour">
                        <div class="rain-bar" style="height: ${h.probability}%; background: ${h.probability > 50 ? '#4299e1' : '#cbd5e0'}"></div>
                        <span class="rain-time">${h.hour === 0 ? '12a' : h.hour < 12 ? h.hour + 'a' : h.hour === 12 ? '12p' : (h.hour - 12) + 'p'}</span>
                    </div>
                `).join('')}
            </div>
            <div class="rain-label">Rain Probability (%)</div>
        `;
    }

    getWeatherInfo(code) {
        // WMO Weather interpretation codes
        const weatherCodes = {
            0: { icon: '☀️', description: 'Clear sky' },
            1: { icon: '🌤️', description: 'Mainly clear' },
            2: { icon: '⛅', description: 'Partly cloudy' },
            3: { icon: '☁️', description: 'Overcast' },
            45: { icon: '🌫️', description: 'Foggy' },
            48: { icon: '🌫️', description: 'Foggy' },
            51: { icon: '🌦️', description: 'Light drizzle' },
            53: { icon: '🌦️', description: 'Drizzle' },
            55: { icon: '🌧️', description: 'Heavy drizzle' },
            61: { icon: '🌧️', description: 'Light rain' },
            63: { icon: '🌧️', description: 'Rain' },
            65: { icon: '🌧️', description: 'Heavy rain' },
            71: { icon: '🌨️', description: 'Light snow' },
            73: { icon: '🌨️', description: 'Snow' },
            75: { icon: '🌨️', description: 'Heavy snow' },
            77: { icon: '🌨️', description: 'Snow grains' },
            80: { icon: '🌦️', description: 'Light showers' },
            81: { icon: '🌦️', description: 'Showers' },
            82: { icon: '⛈️', description: 'Heavy showers' },
            85: { icon: '🌨️', description: 'Snow showers' },
            86: { icon: '🌨️', description: 'Heavy snow showers' },
            95: { icon: '⛈️', description: 'Thunderstorm' },
            96: { icon: '⛈️', description: 'Thunderstorm with hail' },
            99: { icon: '⛈️', description: 'Severe thunderstorm' }
        };
        
        return weatherCodes[code] || { icon: '🌤️', description: 'Unknown' };
    }
}
