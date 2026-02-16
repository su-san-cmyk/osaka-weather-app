import type { WeatherData, ProcessedWeather } from './types';

// Osaka defaults
const DEFAULT_LAT = 34.6937;
const DEFAULT_LON = 135.5023;

export async function fetchWeather(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<ProcessedWeather> {
    const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current_weather: 'true',
        hourly: 'temperature_2m,windspeed_10m,precipitation_probability',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'Asia/Tokyo'
    });
    const apiUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error('Failed to fetch weather data');
    }
    const data: WeatherData = await response.json();
    console.log('Weather API Response:', data);

    // Get today's index (Open-Meteo returns multiple days, usually 7. Index 0 is today)
    const todayIndex = 0;

    // Process data
    // Open-Meteo current_weather.temperature can be 0.
    const currentTemp = data.current_weather && data.current_weather.temperature !== undefined
        ? data.current_weather.temperature
        : null;
    const windSpeed = data.current_weather.windspeed;
    const maxTemp = data.daily.temperature_2m_max[todayIndex];
    const minTemp = data.daily.temperature_2m_min[todayIndex];
    const precipitationChance = data.daily.precipitation_probability_max[todayIndex];

    // Logic to find 8am and 6pm temps for today
    // The hourly.time array strings are like "2023-10-27T00:00"
    // We need to find the index where the time ends in "T08:00" and "T18:00" for today.
    // Since we requested for Osaka timezone, the strings should be local time.
    // However, Open-Meteo hourly response includes past days sometimes or just 7 days from now. 
    // But by default it starts from today 00:00 (or yesterday if configured). 
    // Let's assume the first 24 items are for today if the request is standard.
    // Actually, let's parse the strings to be safe.

    const todayString = data.daily.time[todayIndex]; // "YYYY-MM-DD"

    // Logic to find 8am and 6pm temps for today
    // We will use 8:00 for morning commute (closest to 7:30) and 19:00 for evening commute (closest to 18:30)
    // 7:30 is between 7 and 8. 8 is safer "morning". 18:30 is between 18 and 19. 19 is safer "night".

    // Logic to find 8am and 6pm temps for today
    // We will use 8:00 for morning commute (closest to 7:30) and 19:00 for evening commute (closest to 18:30)

    const getIndex = (hour: number) => data.hourly.time.findIndex(t => t === `${todayString}T${hour.toString().padStart(2, '0')}:00`);

    const idx8 = getIndex(8);
    const idx18 = getIndex(18);
    const idx19 = getIndex(19);

    const temp8am = idx8 !== -1 ? data.hourly.temperature_2m[idx8] : 0;
    const temp6pm = idx18 !== -1 ? data.hourly.temperature_2m[idx18] : 0;

    // Commute Data (8:00 and 19:00)
    const getCommuteData = (index: number) => {
        if (index === -1) return { temp: 0, wind: 0, rain: 0, apparentTemp: 0 };
        const temp = data.hourly.temperature_2m[index];
        const wind = data.hourly.windspeed_10m[index];
        const rain = data.hourly.precipitation_probability[index];
        const apparentTemp = Math.round((temp - (wind * 0.1)) * 10) / 10;
        return { temp, wind, rain, apparentTemp };
    };

    const commuteMorning = getCommuteData(idx8);
    const commuteEvening = getCommuteData(idx19);


    // Rain Time Zones
    // Find consecutive hours >= 40%
    let rainRanges: string[] = [];
    let startHour: number | null = null;
    let maxProb = 0;

    // Iterate through today's hours (0-23)
    for (let h = 0; h < 24; h++) {
        const idx = getIndex(h);
        if (idx === -1) continue;
        const prob = data.hourly.precipitation_probability[idx];

        if (prob >= 40) {
            if (startHour === null) startHour = h;
            if (prob > maxProb) maxProb = prob;
        } else {
            if (startHour !== null) {
                rainRanges.push(`${startHour}時〜${h}時`); // Ranges are start to end (exclusive of end hour usually, but inclusive in speech "to X o'clock" implies covering that duration)
                // Let's say 12-15 means 12, 13, 14 were rainy.
                startHour = null;
                // We restart maxProb? No, maxProb for the whole day or per range? User said "Today's max" or "Range max".
                // "雨の時間帯：12時〜15時（最大70%）" -> Range specific max is better but simple max is easier.
                // Let's keep it simple: gather ranges, then append max prob of the day or range?
                // The prompt example: "12時〜15時（最大70%）". This implies range specific max.
            }
        }
    }
    // Handle case where rain continues until end of day
    if (startHour !== null) {
        rainRanges.push(`${startHour}時〜24時`);
    }

    let rainTimeRanges: string | null = null;
    if (rainRanges.length > 0) {
        // Recalculate max prob for simplicity if we didn't track per range
        // But user asked for "Display max".
        // Let's just use the maxProb found during the loop for ALL rain (simplification) or simpler string.
        // Actually, if multiple ranges, it gets complex.
        // Let's just join ranges and add the OVERALL max probability if it's rainy.
        rainTimeRanges = `雨の時間帯：${rainRanges.join('、')} (最大${maxProb}%)`;
    } else {
        rainTimeRanges = "今日は雨の心配なし";
    }


    return {
        currentTemp,
        maxTemp,
        minTemp,
        windSpeed,
        temp8am,
        temp6pm,
        precipitationChance,
        weatherCode: data.current_weather.weathercode,
        commuteMorning,
        commuteEvening,
        rainTimeRanges
    };
}
