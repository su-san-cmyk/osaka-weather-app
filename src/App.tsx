import { useState, useEffect } from 'react';
import './App.css';
import { fetchWeather } from './api';
import { getCommuteAdvice, getOneLiner } from './advice';
import { getWeatherTheme, type Theme } from './weatherTheme';
import type { ProcessedWeather } from './types';

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
    // Attempt geolocation on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          loadData(latitude, longitude, '現在地');
        },
        (err) => {
          console.log("Geolocation failed or denied, falling back to Osaka.", err);
          loadData(); // Default to Osaka
          setError('位置情報が取得できなかったため、大阪の天気を表示しています');
        }
      );
    } else {
      loadData(); // Default if not supported
      setError('お使いのブラウザは位置情報をサポートしていません（大阪を表示中）');
    }
  }, []);

  // Update body background color based on theme
  useEffect(() => {
    document.body.style.backgroundColor = theme.bgColor;
  }, [theme]);

  // Handler for manual update
  const handleUpdate = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          loadData(latitude, longitude, '現在地');
          setError(null); // Clear fallback message
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
          <div className="one-liner">
            <p>{oneLiner}</p>
          </div>

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
          </div>

          <div className="rain-zone">
            <p>{weather.rainTimeRanges}</p>
          </div>

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

export default App;
