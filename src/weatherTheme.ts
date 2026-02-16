export interface Theme {
    icon: string;
    bgColor: string;
    name: string;
}

export function getWeatherTheme(code: number, windSpeed: number): Theme {
    // WMO Weather interpretation codes (WW)
    // https://open-meteo.com/en/docs

    // Severe Weather (Thunder)
    if (code >= 95) {
        return { icon: '⛈️', bgColor: '#eef0ff', name: 'thunder' }; // Thunderstorm
    }

    // Snow
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
        return { icon: '❄️', bgColor: '#f3efff', name: 'snow' };
    }

    // Rain
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
        return { icon: '🌧️', bgColor: '#eaf4ff', name: 'rain' };
    }

    // Wind (Custom logic: if wind speed >= 20km/h currently, override cloud/sun)
    // User asked for "Wind: 🌬️". Let's prioritize wind if it's strong, UNLESS it's raining/snowing/storming.
    // We check this AFTER severe weather but BEFORE cloudy/sunny.
    if (windSpeed >= 20) {
        return { icon: '🌬️', bgColor: '#e9fbf6', name: 'wind' };
    }

    // Clouds
    // 1, 2, 3 = Mainly clear, partly cloudy, overcast
    // 45, 48 = Fog
    if (code === 2 || code === 3 || code === 45 || code === 48) {
        return { icon: '☁️', bgColor: '#f3f5f7', name: 'cloudy' };
    }
    if (code >= 1 && code <= 3) {
        return { icon: '⛅️', bgColor: '#f3f5f7', name: 'cloudy' };
    }

    // Clear/Sunny (0)
    return { icon: '☀️', bgColor: '#fff7e6', name: 'sunny' };
}
