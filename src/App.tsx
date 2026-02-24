import { useState, useEffect } from 'react';
import './App.css';
import { fetchWeather } from './api';
import { getCommuteAdvice, getOneLiner } from './advice';
import { getWeatherTheme, type Theme } from './weatherTheme';
import type { ProcessedWeather } from './types';

/** 数値を安全に表示 */
function fmt(val: number | null | undefined, digits = 0): string {
  if (val === null || val === undefined || isNaN(val as number)) return '—';
  return typeof val === 'number' ? val.toFixed(digits) : String(val);
}

/** 気圧 → 体調コメント */
function getPressureComment(pressure: number | null, trend: string | null): { emoji: string; line1: string; line2: string } {
  if (pressure !== null && pressure < 1005) {
    return { emoji: '🟠', line1: '今日は頭痛注意の気圧です', line2: '無理しない日' };
  }
  if (trend === '↓ 下がってる') {
    return { emoji: '🟡', line1: '気圧が下がり中', line2: 'だるさ・眠気出やすい日' };
  }
  return { emoji: '🟢', line1: '安定した気圧', line2: '過ごしやすい日' };
}

/** UV指数 → コメント */
function getUvComment(uv: number | null): { label: string; labelEmoji: string; comment: string; level: string } {
  if (uv === null) return { label: '—', labelEmoji: '', comment: '—', level: 'low' };
  if (uv <= 2) return { label: '弱い', labelEmoji: '☀️', comment: '日焼け止めは軽めでOK', level: 'low' };
  if (uv <= 5) return { label: '中', labelEmoji: '🌤', comment: 'できれば日焼け止めを', level: 'mid' };
  if (uv <= 7) return { label: '強い', labelEmoji: '⚠️', comment: '日焼け止め推奨', level: 'high' };
  if (uv <= 10) return { label: '非常に強い', labelEmoji: '🚨', comment: 'こまめに塗り直しを', level: 'extreme' };
  return { label: '危険レベル', labelEmoji: '🚨', comment: '外出は対策必須！', level: 'extreme' };
}

function App() {
  const [weather, setWeather] = useState<ProcessedWeather | null>(null);
  const [commuteAdvice, setCommuteAdvice] = useState<{ morning: string; evening: string } | null>(null);
  const [oneLiner, setOneLiner] = useState<string>('');
  const [theme, setTheme] = useState<Theme>({ icon: '☀️', bgColor: '#f3f5f7', name: 'default' });
  const [locationName, setLocationName] = useState<string>('大阪');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (lat?: number, lon?: number, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(lat, lon);
      setWeather(data);
      setCommuteAdvice(getCommuteAdvice(data));
      setOneLiner(getOneLiner(data));
      setTheme(getWeatherTheme(data.weatherCode, data.windSpeed));
      if (name) setLocationName(name);
    } catch (err) {
      setError('天気の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          loadData(latitude, longitude, '現在地');
        },
        (err) => {
          console.log('Geolocation failed or denied, falling back to Osaka.', err);
          loadData();
          setError('位置情報が取得できなかったため、大阪の天気を表示しています');
        }
      );
    } else {
      loadData();
      setError('お使いのブラウザは位置情報をサポートしていません（大阪を表示中）');
    }
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = theme.bgColor;
  }, [theme]);

  const handleUpdate = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          loadData(latitude, longitude, '現在地');
          setError(null);
        },
        () => {
          setError('位置情報の取得に失敗しました');
          setLoading(false);
        }
      );
    }
  };

  if (loading) return <div className="app-container"><p>読み込み中...</p></div>;

  return (
    <div className="app-container">
      <h1>{locationName}の天気</h1>
      {error && !weather && <p className="error">{error}</p>}
      {error && weather && <p className="location-msg">{error}</p>}

      <div className="update-btn-container">
        <button onClick={handleUpdate} className="update-btn">📍 現在地で更新</button>
      </div>

      {weather && (
        <>
          {/* 低気圧アラート */}
          {weather.lowPressureAlert && (
            <div className="low-pressure-alert">
              ⚠️ 低気圧注意 — 頭痛・だるさに気をつけて
            </div>
          )}

          <div className="one-liner">
            <p>{oneLiner}</p>
          </div>

          {/* メイン天気カード */}
          <div className="weather-card">
            <div className="current-weather">
              <div className="weather-icon">{theme.icon}</div>
              <h2>現在の気温</h2>
              <p className="temp">{weather.currentTemp !== null ? weather.currentTemp : '—'}°C</p>
              <div className="conditions">
                <p className="wind">風速: {weather.windSpeed} km/h</p>
                <p className="rain">降水確率: {weather.precipitationChance}%</p>
              </div>
            </div>

            <div className="daily-stats">
              <div className="stat-item">
                <span className="label">最高</span>
                <span className="value high">{weather.maxTemp}°C</span>
              </div>
              <div className="stat-item">
                <span className="label">最低</span>
                <span className="value low">{weather.minTemp}°C</span>
              </div>
            </div>

            <div className="hourly-highlight">
              <div className="hour-item">
                <span className="label">朝 (8:00)</span>
                <span className="value">{weather.temp8am}°C</span>
              </div>
              <div className="hour-item">
                <span className="label">夕 (18:00)</span>
                <span className="value">{weather.temp6pm}°C</span>
              </div>
            </div>

            {/* 気圧・UV セクション（2段×2カラム） */}
            <div className="health-grid">

              {/* ── 1段目：気圧 ── */}
              {/* 左：気圧データ */}
              <div className="hg-data">
                <span className="hg-icon">🌡</span>
                <div className="hg-content">
                  <span className="hg-label">気圧</span>
                  <span className="hg-value">
                    {weather.pressure !== null ? Math.round(weather.pressure) : '—'}
                    <span className="hg-unit">hPa</span>
                  </span>
                  {weather.pressureTrend && (
                    <span className={`pressure-trend ${weather.pressureTrend.startsWith('↑') ? 'up' : weather.pressureTrend.startsWith('↓') ? 'down' : 'stable'}`}>
                      {weather.pressureTrend.startsWith('↑') ? '↑ 上昇中' : weather.pressureTrend.startsWith('↓') ? '↓ 下降中' : '→ 変化なし'}
                    </span>
                  )}
                </div>
              </div>
              {/* 右：気圧コメント */}
              {(() => {
                const c = getPressureComment(weather.pressure, weather.pressureTrend);
                return (
                  <div className="hg-comment">
                    <span className="hg-comment-main">{c.emoji} {c.line1}</span>
                    <span className="hg-comment-sub">{c.line2}</span>
                  </div>
                );
              })()}

              {/* ── 2段目：UV ── */}
              {/* 左：UVデータ */}
              {(() => {
                const uv = getUvComment(weather.uvIndex);
                return (
                  <>
                    <div className="hg-data">
                      <span className="hg-icon">☀️</span>
                      <div className="hg-content">
                        <span className="hg-label">UV指数</span>
                        <span className="hg-value">
                          {fmt(weather.uvIndex)}
                        </span>
                        <span className={`uv-label uv-${uv.level}`}>
                          {uv.label} {uv.labelEmoji}
                        </span>
                      </div>
                    </div>
                    {/* 右：UVコメント */}
                    <div className="hg-comment">
                      <span className="hg-comment-main">紫外線：{uv.label} {uv.labelEmoji}</span>
                      <span className="hg-comment-sub">{uv.comment}</span>
                    </div>
                  </>
                );
              })()}

            </div>
          </div>

          <div className="rain-zone">
            <p>{weather.rainTimeRanges}</p>
          </div>

          {/* 7日間横スクロール予報 */}
          {weather.weeklyForecast.length > 0 && (
            <div className="weekly-section">
              <h3 className="section-title">📅 7日間予報</h3>
              <div className="weekly-scroll">
                {weather.weeklyForecast.map((day, i) => (
                  <div key={day.date} className={`weekly-card ${i === 0 ? 'today' : ''}`}>
                    <span className="weekly-day">{day.dayLabel}</span>
                    <span className="weekly-icon">{weatherCodeToIcon(day.weatherCode)}</span>
                    <span className="weekly-high">{day.maxTemp}°</span>
                    <span className="weekly-low">{day.minTemp}°</span>
                    <span className="weekly-rain">💧{day.precipChance}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 通勤アドバイス */}
          <div className="commute-section">
            <h3>通勤アドバイス</h3>

            <div className="commute-card">
              <div className="commute-header">
                <span>☀️ 朝 (08:00)</span>
                <span className="commute-temp">{weather.commuteMorning.temp}°C</span>
              </div>
              <div className="commute-details">
                <span>体感: {weather.commuteMorning.apparentTemp}°C</span>
                <span>降水: {weather.commuteMorning.rain}%</span>
              </div>
              <p className="commute-msg">{commuteAdvice?.morning}</p>
            </div>

            <div className="commute-card">
              <div className="commute-header">
                <span>🌙 帰り (19:00)</span>
                <span className="commute-temp">{weather.commuteEvening.temp}°C</span>
              </div>
              <div className="commute-details">
                <span>体感: {weather.commuteEvening.apparentTemp}°C</span>
                <span>降水: {weather.commuteEvening.rain}%</span>
              </div>
              <p className="commute-msg">{commuteAdvice?.evening}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



/** 天気コード → アイコン（App.tsx内でも使用） */
function weatherCodeToIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤';
  if (code <= 3) return '☁️';
  if (code <= 49) return '🌫';
  if (code <= 69) return '🌧';
  if (code <= 79) return '❄️';
  if (code <= 84) return '🌦';
  return '⛈';
}

export default App;
