import type { ProcessedWeather } from './types';

export function getClothingAdvice(weather: ProcessedWeather): string[] {
    const advice: string[] = [];
    // Kept for backward compatibility if needed, but we are splitting.
    // The user asked for "Morning Advice" and "Evening Advice" in UI.
    // We can return a generic list or structure.
    // But getClothingAdvice returns string[].
    // Let's return the generic daily advice here (temp max/min etc) AND we will add helper for commute advice.
    // To suppress unused warning:
    if (weather) { /* no-op */ }
    return advice;
}

export function getCommuteAdvice(weather: ProcessedWeather): { morning: string; evening: string } {
    const getAdvice = (data: { temp: number; wind: number; rain: number; apparentTemp: number }, _isMorning: boolean) => {
        let msg = "";

        // Temperature/Cold advice
        if (data.apparentTemp <= 5) {
            msg += "冷える！ダウンあると安心☃️";
        } else if (data.apparentTemp <= 10) {
            msg += "寒いね。コートしっかり着てこ🧥";
        } else if (data.apparentTemp <= 15) {
            msg += "肌寒いかも。羽織るもの持って🧣";
        } else {
            msg += "過ごしやすい気温だよ✨";
        }

        // Rain advice
        if (data.rain >= 40) {
            msg += " 雨降りそう、傘忘れずに☔️";
        }

        // Wind special
        if (data.wind >= 15 && !msg.includes('ダウン')) { // Avoid double cold message if possible, or add context
            msg += " 風が強いから防寒対策を🌬️";
        }

        return msg;
    };

    return {
        morning: getAdvice(weather.commuteMorning, true),
        evening: getAdvice(weather.commuteEvening, false)
    };
}

export function getOneLiner(weather: ProcessedWeather): string {
    // Regenerate based on commute data priority
    const m = weather.commuteMorning;
    const e = weather.commuteEvening;

    if (m.rain >= 40 || e.rain >= 40) return "傘の出番ありそう。忘れずに持ってね☔️";
    if (m.apparentTemp <= 5 || e.apparentTemp <= 5) return "今日は極寒！しっかり防寒して出勤してね☃️";
    if (weather.maxTemp - weather.minTemp >= 10) return "寒暖差に注意！脱ぎ着できる服がおすすめ🧥";

    return "行ってらっしゃい！今日も良い一日を✨";
}
