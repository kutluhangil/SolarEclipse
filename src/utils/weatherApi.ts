/**
 * Open-Meteo Weather API integration for Solar Eclipse 2026
 * Fetches real historical/forecast weather data — no API key required.
 * https://open-meteo.com/en/docs
 */

export interface WeatherHourData {
  hour: number; // 0-23 UTC hour
  tempC: number;
  cloudCoverPercent: number;
  relativeHumidityPercent: number;
  solarIrradianceWm2: number; // shortwave radiation W/m2
}

export interface WeatherForecastData {
  stationId: string;
  lat: number;
  lon: number;
  fetchedAt: number; // Date.now()
  hourlyData: WeatherHourData[];
  eclipseWindowAvgCloudCover: number; // avg cloud cover 17-19 UTC
  eclipseWindowAvgTemp: number; // avg temp 17-19 UTC
  dataSource: 'open-meteo';
}

// In-memory cache keyed by stationId or 'custom-lat-lon'
const weatherCache = new Map<string, WeatherForecastData>();

/**
 * Fetch hourly weather data for August 12, 2026 from Open-Meteo.
 * Uses the free API (no auth required). Falls back gracefully on error.
 */
export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  cacheKey: string
): Promise<WeatherForecastData | null> {
  // Return cached data if available (avoids repeated API calls)
  if (weatherCache.has(cacheKey)) {
    return weatherCache.get(cacheKey)!;
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lon.toFixed(4));
    url.searchParams.set('hourly', 'temperature_2m,cloudcover,relative_humidity_2m,shortwave_radiation');
    url.searchParams.set('timezone', 'UTC');
    url.searchParams.set('start_date', '2026-08-12');
    url.searchParams.set('end_date', '2026-08-12');
    url.searchParams.set('wind_speed_unit', 'kmh');

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const hourly = json.hourly;

    if (!hourly || !hourly.time) {
      throw new Error('Invalid Open-Meteo response shape');
    }

    const hourlyData: WeatherHourData[] = hourly.time.map((timeStr: string, i: number) => {
      const hour = new Date(timeStr).getUTCHours();
      return {
        hour,
        tempC: Math.round((hourly.temperature_2m[i] ?? 20) * 10) / 10,
        cloudCoverPercent: Math.round(hourly.cloudcover[i] ?? 40),
        relativeHumidityPercent: Math.round(hourly.relative_humidity_2m[i] ?? 60),
        solarIrradianceWm2: Math.round(hourly.shortwave_radiation[i] ?? 500),
      };
    });

    // Eclipse window: 17:00 - 19:00 UTC
    const eclipseWindow = hourlyData.filter(h => h.hour >= 17 && h.hour <= 19);
    const eclipseWindowAvgCloudCover = eclipseWindow.length > 0
      ? Math.round(eclipseWindow.reduce((s, h) => s + h.cloudCoverPercent, 0) / eclipseWindow.length)
      : 40;
    const eclipseWindowAvgTemp = eclipseWindow.length > 0
      ? Math.round(eclipseWindow.reduce((s, h) => s + h.tempC, 0) / eclipseWindow.length * 10) / 10
      : 20;

    const data: WeatherForecastData = {
      stationId: cacheKey,
      lat,
      lon,
      fetchedAt: Date.now(),
      hourlyData,
      eclipseWindowAvgCloudCover,
      eclipseWindowAvgTemp,
      dataSource: 'open-meteo',
    };

    weatherCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.warn('[WeatherAPI] Open-Meteo fetch failed:', err);
    return null;
  }
}

/**
 * Get weather data for a specific UTC hour from forecast.
 * Returns null if no data available.
 */
export function getWeatherAtHour(
  forecast: WeatherForecastData | null,
  utcHour: number
): WeatherHourData | null {
  if (!forecast) return null;
  return forecast.hourlyData.find(h => h.hour === utcHour) ?? null;
}

/**
 * Compute clear sky probability from cloud cover percentage.
 */
export function cloudCoverToClearSkyProb(cloudCoverPercent: number): number {
  return Math.max(0, Math.round(100 - cloudCoverPercent * 1.15));
}
