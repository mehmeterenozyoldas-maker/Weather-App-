import { CityOption } from './types';

// Festive / Winter Palette for the Snow Globe Design
export const COLORS = {
  background: '#0f172a', // Dark blue night sky
  platform: {
    top: '#ffffff', // Snow floor
    side: '#451a03', // Dark Wood base
    accent: '#d4af37', // Gold trim
  },
  rain: '#8ECAE6',
  snow: '#FFFFFF',
  sun: '#FFB703',
  text: '#FFFFFF'
};

export const CITIES: CityOption[] = [
  { name: 'London', lat: 51.5074, lon: -0.1278 }, // Often rainy
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 }, // Hot/Clear
  { name: 'Reykjavik', lat: 64.1466, lon: -21.9426 }, // Cold/Snowy
  { name: 'Stockholm', lat: 59.3293, lon: 18.0686 }, // Sweden
  { name: 'Nicosia', lat: 35.1856, lon: 33.3823 }, // Cyprus
];

export const INITIAL_CITY = CITIES[0];
