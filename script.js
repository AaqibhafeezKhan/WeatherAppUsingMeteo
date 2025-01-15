const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

let currentUnit = 'celsius';

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const unitToggle = document.getElementById('unitToggle');
const errorMessage = document.getElementById('errorMessage');
const loader = document.getElementById('loader');
const currentWeather = document.getElementById('currentWeather');
const forecast = document.getElementById('forecast');

const weatherCodes = {
    0: { description: 'Clear sky', icon: '☀️' },
    1: { description: 'Mainly clear', icon: '🌤️' },
    2: { description: 'Partly cloudy', icon: '⛅' },
    3: { description: 'Overcast', icon: '☁️' },
    45: { description: 'Foggy', icon: '🌫️' },
    48: { description: 'Depositing rime fog', icon: '🌫️' },
    51: { description: 'Light drizzle', icon: '🌦️' },
    53: { description: 'Moderate drizzle', icon: '🌦️' },
    55: { description: 'Dense drizzle', icon: '🌧️' },
    61: { description: 'Slight rain', icon: '🌦️' },
    63: { description: 'Moderate rain', icon: '🌧️' },
    65: { description: 'Heavy rain', icon: '🌧️' },
    71: { description: 'Slight snow fall', icon: '🌨️' },
    73: { description: 'Moderate snow fall', icon: '🌨️' },
    75: { description: 'Heavy snow fall', icon: '🌨️' },
    77: { description: 'Snow grains', icon: '🌨️' },
    80: { description: 'Slight rain showers', icon: '🌦️' },
    81: { description: 'Moderate rain showers', icon: '🌧️' },
    82: { description: 'Violent rain showers', icon: '🌧️' },
    85: { description: 'Slight snow showers', icon: '🌨️' },
    86: { description: 'Heavy snow showers', icon: '🌨️' },
    95: { description: 'Thunderstorm', icon: '⛈️' },
    96: { description: 'Thunderstorm with slight hail', icon: '⛈️' },
    99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' }
};

searchForm.addEventListener('submit', handleSearch);
unitToggle.addEventListener('click', toggleUnit);

async function getCoordinates(query) {
    try {
        const response = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=1`);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            throw new Error('Location not found. Please try another search.');
        }

        return {
            latitude: data.results[0].latitude,
            longitude: data.results[0].longitude,
            name: data.results[0].name,
            country: data.results[0].country
        };
    } catch (error) {
        throw new Error('Failed to find location. Please try again.');
    }
}

async function fetchWeatherData(latitude, longitude) {
    try {
        const response = await fetch(
            `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}` +
            '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
            '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
            '&timezone=auto'
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();
        
        return {
            current: {
                temp: data.current.temperature_2m,
                humidity: data.current.relative_humidity_2m,
                windSpeed: data.current.wind_speed_10m,
                weatherCode: data.current.weather_code
            },
            daily: data.daily.time.map((date, index) => ({
                date: date,
                maxTemp: data.daily.temperature_2m_max[index],
                minTemp: data.daily.temperature_2m_min[index],
                weatherCode: data.daily.weather_code[index]
            }))
        };
    } catch (error) {
        throw new Error('Failed to fetch weather data');
    }
}

function convertTemperature(temp) {
    if (currentUnit === 'fahrenheit') {
        return ((temp * 9/5) + 32).toFixed(1);
    }
    return temp.toFixed(1);
}

function updateCurrentWeather(locationData, weatherData) {
    const locationElem = document.getElementById('location');
    const temperatureElem = document.getElementById('temperature');
    const descriptionElem = document.getElementById('description');
    const humidityElem = document.getElementById('humidity');
    const windSpeedElem = document.getElementById('windSpeed');
    const weatherIconElem = document.getElementById('weatherIcon');

    const weather = weatherCodes[weatherData.current.weatherCode];

    locationElem.textContent = `${locationData.name}, ${locationData.country}`;
    temperatureElem.textContent = `${convertTemperature(weatherData.current.temp)}°${currentUnit === 'celsius' ? 'C' : 'F'}`;
    descriptionElem.textContent = weather.description;
    humidityElem.textContent = `${weatherData.current.humidity}%`;
    windSpeedElem.textContent = `${weatherData.current.windSpeed} km/h`;
    weatherIconElem.textContent = weather.icon;
    weatherIconElem.style.fontSize = '64px';

    currentWeather.classList.remove('hidden');
}

function updateForecast(weatherData) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';

    weatherData.daily.forEach(day => {
        const date = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
        const weather = weatherCodes[day.weatherCode];
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="date">${date}</div>
            <div style="font-size: 32px;">${weather.icon}</div>
            <div class="temp-high">${convertTemperature(day.maxTemp)}°</div>
            <div class="temp-low">${convertTemperature(day.minTemp)}°</div>
        `;
        forecastContainer.appendChild(card);
    });

    forecast.classList.remove('hidden');
}

async function handleSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    errorMessage.textContent = '';
    loader.classList.remove('hidden');
    currentWeather.classList.add('hidden');
    forecast.classList.add('hidden');

    try {
        const locationData = await getCoordinates(query);
        const weatherData = await fetchWeatherData(locationData.latitude, locationData.longitude);
        updateCurrentWeather(locationData, weatherData);
        updateForecast(weatherData);
    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        loader.classList.add('hidden');
    }
}

function toggleUnit() {
    currentUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
    unitToggle.textContent = `Switch to ${currentUnit === 'celsius' ? '°F' : '°C'}`;

    if (!currentWeather.classList.contains('hidden')) {
        const searchQuery = searchInput.value.trim();
        if (searchQuery) {
            handleSearch(new Event('submit'));
        }
    }
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const weatherData = await fetchWeatherData(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    const locationData = {
                        name: 'Your Location',
                        country: ''
                    };
                    updateCurrentWeather(locationData, weatherData);
                    updateForecast(weatherData);
                } catch (error) {
                    errorMessage.textContent = 'Failed to fetch weather data for your location';
                }
            },
            (error) => {
                console.error('Error getting location:', error);
            }
        );
    }
}

getUserLocation();
