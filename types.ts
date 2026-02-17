export enum WeatherCondition {
  Clear = 'Clear',
  Clouds = 'Clouds',
  Rain = 'Rain',
  Snow = 'Snow',
  Thunderstorm = 'Thunderstorm',
  Drizzle = 'Drizzle'
}

export interface WeatherData {
  temperature: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  city: string;
  description: string;
  isDay: boolean;
  timezone: string;
  utcOffsetSeconds: number;
}

export interface CityOption {
  name: string;
  lat: number;
  lon: number;
}