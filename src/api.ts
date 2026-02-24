import type { WeatherData, ProcessedWeather, DailyForecast } from './types';

// Osaka defaults
const DEFAULT_LAT = 34.6937;
const DEFAULT_LON = 135.5023;

/** UV指数 → ラベル */
function getUvLabel(uv: number): string {
    if (uv <= 2) return '弱い ☀️';
    if (uv <= 5) return '中 🌤';
    if (uv <= 7) return '強い ⚠️';
    return '非常に強い 🔴';
}

/** 曜日ラベル（今日・明日・月〜日） */
function getDayLabel(dateStr: string, index: number): string {
    if (index === 0) return '今日';
    if (index === 1) return '明日';
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()];
}

export async function fetchWeather(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<ProcessedWeather> {
    const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: 'temperature_2m,windspeed_10m,weathercode,surface_pressure,uv_index,relative_humidity_2m,precipitation_probability',
        hourly: 'temperature_2m,windspeed_10m,precipitation_probability,surface_pressure,apparent_temperature',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,uv_index_max',
        timezone: 'Asia/Tokyo'
    });
    const apiUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error('Failed to fetch weather data');
    }
    const data: WeatherData = await response.json();
    console.log('Weather API Response:', data);

    // ── current（今すぐ） ──
    const cur = data.current;
    const currentTemp = cur?.temperature_2m ?? null;
    const windSpeed = cur?.windspeed_10m ?? 0;
    const weatherCode = cur?.weathercode ?? 0;
    const pressure: number | null = cur?.surface_pressure ?? null;
    const uvIndex: number | null = cur?.uv_index ?? null;
    const uvLabel: string | null = uvIndex !== null ? getUvLabel(uvIndex) : null;

    // ── 気圧傾向（hourlyの直近3時間を使用） ──
    let pressureTrend: ProcessedWeather['pressureTrend'] = null;
    let lowPressureAlert = false;

    if (pressure !== null) {
        // 現在時刻に最も近いhourlyインデックスを探す
        const nowStr = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
        const nowIdx = data.hourly.time.findIndex(t => t.startsWith(nowStr));
        const idx3agoRaw = nowIdx !== -1 ? nowIdx - 3 : -1;
        const idx3ago = idx3agoRaw >= 0 ? idx3agoRaw : 0;

        if (nowIdx !== -1 && data.hourly.surface_pressure?.[nowIdx] !== undefined) {
            const pressureNow = data.hourly.surface_pressure[nowIdx];
            const pressure3hAgo = data.hourly.surface_pressure[idx3ago] ?? pressureNow;
            const diff = pressureNow - pressure3hAgo;

            if (diff >= 2) pressureTrend = '↑ 上がってる';
            else if (diff <= -2) pressureTrend = '↓ 下がってる';
            else pressureTrend = '→ 変化少ない';

            // 低気圧アラート判定
            if (pressure < 1005 || diff <= -2) lowPressureAlert = true;
        } else {
            // hourlyが使えない場合はcurrentのみで判断
            if (pressure < 1005) lowPressureAlert = true;
            pressureTrend = '→ 変化少ない';
        }
    }

    // ── daily（今日分） ──
    const todayIndex = 0;
    const maxTemp = data.daily.temperature_2m_max[todayIndex] ?? 0;
    const minTemp = data.daily.temperature_2m_min[todayIndex] ?? 0;
    const precipitationChance = data.daily.precipitation_probability_max[todayIndex] ?? 0;
    const todayString = data.daily.time[todayIndex];

    // ── hourly インデックス取得ヘルパー ──
    const getIndex = (hour: number) =>
        data.hourly.time.findIndex(t => t === `${todayString}T${hour.toString().padStart(2, '0')}:00`);

    const idx8 = getIndex(8);
    const idx18 = getIndex(18);
    const idx19 = getIndex(19);

    const temp8am = idx8 !== -1 ? data.hourly.temperature_2m[idx8] : 0;
    const temp6pm = idx18 !== -1 ? data.hourly.temperature_2m[idx18] : 0;

    // ── 通勤データ ──
    const getCommuteData = (index: number) => {
        if (index === -1) return { temp: 0, wind: 0, rain: 0, apparentTemp: 0 };
        const temp = data.hourly.temperature_2m[index] ?? 0;
        const wind = data.hourly.windspeed_10m[index] ?? 0;
        const rain = data.hourly.precipitation_probability[index] ?? 0;
        const apparentTemp = data.hourly.apparent_temperature?.[index] ?? Math.round((temp - wind * 0.1) * 10) / 10;
        return { temp, wind, rain, apparentTemp };
    };
    const commuteMorning = getCommuteData(idx8);
    const commuteEvening = getCommuteData(idx19);

    // ── 雨の時間帯 ──
    let rainRanges: string[] = [];
    let startHour: number | null = null;
    let maxProb = 0;
    for (let h = 0; h < 24; h++) {
        const idx = getIndex(h);
        if (idx === -1) continue;
        const prob = data.hourly.precipitation_probability[idx] ?? 0;
        if (prob >= 40) {
            if (startHour === null) startHour = h;
            if (prob > maxProb) maxProb = prob;
        } else {
            if (startHour !== null) {
                rainRanges.push(`${startHour}時〜${h}時`);
                startHour = null;
            }
        }
    }
    if (startHour !== null) rainRanges.push(`${startHour}時〜24時`);
    const rainTimeRanges = rainRanges.length > 0
        ? `雨の時間帯：${rainRanges.join('、')} (最大${maxProb}%)`
        : '今日は雨の心配なし';

    // ── 7日間予報 ──
    const weeklyForecast: DailyForecast[] = data.daily.time.map((dateStr, i) => ({
        date: dateStr,
        dayLabel: getDayLabel(dateStr, i),
        weatherCode: data.daily.weather_code?.[i] ?? 0,
        maxTemp: data.daily.temperature_2m_max[i] ?? 0,
        minTemp: data.daily.temperature_2m_min[i] ?? 0,
        precipChance: data.daily.precipitation_probability_max[i] ?? 0,
        uvMax: data.daily.uv_index_max?.[i] ?? 0,
    }));

    return {
        currentTemp,
        maxTemp,
        minTemp,
        windSpeed,
        temp8am,
        temp6pm,
        precipitationChance,
        weatherCode,
        pressure,
        pressureTrend,
        lowPressureAlert,
        uvIndex,
        uvLabel,
        commuteMorning,
        commuteEvening,
        rainTimeRanges,
        weeklyForecast,
    };
}
