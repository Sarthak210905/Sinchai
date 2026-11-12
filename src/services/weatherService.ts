// ============================================================
// Weather Service using Open-Meteo (Free, No API Key Required)
// ============================================================

import * as Location from 'expo-location';

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  weatherCondition: 'rain' | 'heat' | 'normal';
  locationName: string;
}

// Default fallback coordinates (Central India / New Delhi)
const DEFAULT_LAT = 28.6139;
const DEFAULT_LON = 77.2090;

export async function fetchFarmWeather(): Promise<WeatherData> {
  let lat = DEFAULT_LAT;
  let lon = DEFAULT_LON;
  let locationName = 'Farm Area';

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;

      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lon,
        });
        if (geo?.city || geo?.region) {
          locationName = geo.city || geo.region || 'Local Farm';
        }
      } catch {
        // ignore geocode fallback
      }
    }
  } catch {
    // location permission denied or timed out, fallback gracefully
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const data = await res.json();

  const temp = Math.round(data?.current?.temperature_2m ?? 26);
  const humidity = Math.round(data?.current?.relative_humidity_2m ?? 55);
  const windSpeed = Math.round(data?.current?.wind_speed_10m ?? 8);
  const weatherCode = data?.current?.weather_code ?? 0;

  const maxTemp = Math.round(data?.daily?.temperature_2m_max?.[0] ?? temp + 4);
  const minTemp = Math.round(data?.daily?.temperature_2m_min?.[0] ?? temp - 6);
  const rainProbability = Math.round(data?.daily?.precipitation_probability_max?.[0] ?? 0);

  // Determine condition advisory
  // WMO rain codes: 51-67, 80-82, 95-99
  const isRainCode = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode);
  let weatherCondition: 'rain' | 'heat' | 'normal' = 'normal';

  if (rainProbability >= 40 || isRainCode) {
    weatherCondition = 'rain';
  } else if (temp >= 36) {
    weatherCondition = 'heat';
  }

  return {
    temperature: temp,
    humidity,
    windSpeed,
    rainProbability,
    maxTemp,
    minTemp,
    weatherCode,
    weatherCondition,
    locationName,
  };
}

