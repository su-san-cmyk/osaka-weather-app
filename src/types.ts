export interface WeatherData {
    current: {
        temperature_2m: number;
        windspeed_10m: number;
        weathercode: number;
        surface_pressure: number;
        uv_index: number;
        relative_humidity_2m: number;
        precipitation_probability: number;
    };
    daily: {
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
        weather_code: number[];
        uv_index_max: number[];
        time: string[];
    };
    hourly: {
        temperature_2m: number[];
        windspeed_10m: number[];
        precipitation_probability: number[];
        surface_pressure: number[];
        apparent_temperature: number[];
        time: string[];
    };
}

export interface DailyForecast {
    date: string;       // "YYYY-MM-DD"
    dayLabel: string;   // 曜日（今日・明日・月〜日）
    weatherCode: number;
    maxTemp: number;
    minTemp: number;
    precipChance: number;
    uvMax: number;
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
    // 気圧
    pressure: number | null;
    pressureTrend: '↑ 上がってる' | '↓ 下がってる' | '→ 変化少ない' | null;
    lowPressureAlert: boolean;
    // UV
    uvIndex: number | null;
    uvLabel: string | null;
    // 通勤
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
    // 7日間予報
    weeklyForecast: DailyForecast[];
}
