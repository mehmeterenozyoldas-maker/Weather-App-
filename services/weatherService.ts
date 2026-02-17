import { WeatherData, WeatherCondition, CityOption } from '../types';

// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs
const getConditionFromCode = (code: number): WeatherCondition => {
  if (code === 0 || code === 1) return WeatherCondition.Clear;
  if (code === 2 || code === 3) return WeatherCondition.Clouds;
  if ([45, 48].includes(code)) return WeatherCondition.Clouds; // Fog as clouds for simplicity
  if ([51, 53, 55, 56, 57].includes(code)) return WeatherCondition.Drizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return WeatherCondition.Rain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return WeatherCondition.Snow;
  if ([95, 96, 99].includes(code)) return WeatherCondition.Thunderstorm;
  return WeatherCondition.Clear;
};

const getDescriptionFromCode = (code: number): string => {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return map[code] || `Unknown condition (${code})`;
};

export const fetchWeather = async (lat: number, lon: number, cityName: string): Promise<WeatherData> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`
    );
    
    if (!response.ok) throw new Error('Weather fetch failed');

    const data = await response.json();
    const current = data.current;

    return {
      city: cityName,
      temperature: current.temperature_2m,
      condition: getConditionFromCode(current.weather_code),
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      isDay: current.is_day === 1,
      description: getDescriptionFromCode(current.weather_code),
      timezone: data.timezone,
      utcOffsetSeconds: data.utc_offset_seconds
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    // Fallback mock data
    return {
      city: cityName,
      temperature: 20,
      condition: WeatherCondition.Clear,
      humidity: 50,
      windSpeed: 10,
      isDay: true,
      description: "Data unavailable",
      timezone: "UTC",
      utcOffsetSeconds: 0
    };
  }
};

export const searchCities = async (query: string): Promise<CityOption[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.results) return [];

    return data.results.map((item: any) => ({
      name: item.name,
      lat: item.latitude,
      lon: item.longitude,
      country: item.country, // Optional, for display
    }));
  } catch (error) {
    console.error("Geocoding failed", error);
    return [];
  }
};