export interface WeatherData {
    current_weather: {
        temperature: number;
        windspeed: number;
        weathercode: number;
    };
    daily: {
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
        time: string[];
    };
    hourly: {
        temperature_2m: number[];
        windspeed_10m: number[];
        precipitation_probability: number[];
        time: string[];
    };
}

export interface ProcessedWeather {
    currentTemp: number | null;
    maxTemp: number;
    minTemp: number;
    windSpeed: number;
    temp8am: number;
    temp6pm: number;
    precipitationChance: number;
    weatherCode: number;
    commuteMorning: {
        temp: number;
        wind: number;
        rain: number;
        apparentTemp: number;
    };
    commuteEvening: {
        temp: number;
        wind: number;
        rain: number;
        apparentTemp: number;
    };
    rainTimeRanges: string | null;
}
