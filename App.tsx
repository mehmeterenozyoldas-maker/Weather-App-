import React, { useState, useEffect, useRef } from 'react';
import { WeatherScene } from './components/Scene/WeatherScene';
import { Interface } from './components/UI/Interface';
import { fetchWeather } from './services/weatherService';
import { WeatherData, CityOption, WeatherCondition } from './types';
import { INITIAL_CITY } from './constants';

const App: React.FC = () => {
  const [currentCity, setCurrentCity] = useState<CityOption>(INITIAL_CITY);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Digital Sim Mode State
  const [isSimMode, setIsSimMode] = useState(false);
  const [simCondition, setSimCondition] = useState<WeatherCondition>(WeatherCondition.Clear);
  const [simTemperature, setSimTemperature] = useState<number>(20);

  const handleCityChange = (city: CityOption) => {
    setCurrentCity(city);
  };

  useEffect(() => {
    let mounted = true;
    
    const getData = async () => {
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 600)); 
        const data = await fetchWeather(currentCity.lat, currentCity.lon, currentCity.name);
        
        if (mounted) {
          setWeather(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load weather", err);
        setLoading(false);
      }
    };

    getData();

    return () => { mounted = false; };
  }, [currentCity]);

  // Determine what to show in the scene
  const displayCondition = isSimMode ? simCondition : (weather?.condition || WeatherCondition.Clear);
  const displayIsDay = isSimMode ? true : (weather?.isDay ?? true);
  const displayTemperature = isSimMode ? simTemperature : (weather?.temperature ?? 20);

  // --- Visceral Haptics Engine ---
  // Triggers device vibrations based on weather to "feel" the storm
  useEffect(() => {
    if (!navigator.vibrate) return;

    let interval: ReturnType<typeof setInterval>;

    if (displayCondition === WeatherCondition.Rain || displayCondition === WeatherCondition.Drizzle) {
        // Pitter-patter: random short pulses
        interval = setInterval(() => {
            if (Math.random() > 0.7) navigator.vibrate(5);
        }, 150);
    } else if (displayCondition === WeatherCondition.Thunderstorm) {
        // Heavy: Rumble occasionally
        interval = setInterval(() => {
             const r = Math.random();
             if (r > 0.95) {
                 // Thunder crack
                 navigator.vibrate([30, 50, 10, 50]);
             } else if (r > 0.6) {
                 // Rain
                 navigator.vibrate(8);
             }
        }, 100);
    }

    return () => {
        if (interval) clearInterval(interval);
        navigator.vibrate(0); // Stop vibration on unmount/change
    };
  }, [displayCondition]);

  return (
    <main className="w-full h-screen bg-neutral-900 relative overflow-hidden">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <WeatherScene 
          condition={displayCondition} 
          isDay={displayIsDay}
          temperature={displayTemperature}
          cityName={currentCity.name}
        />
      </div>

      {/* UI Overlay Layer */}
      <Interface 
        weather={weather} 
        loading={loading} 
        onCitySelect={handleCityChange}
        selectedCity={currentCity.name}
        isSimMode={isSimMode}
        onToggleSim={() => setIsSimMode(!isSimMode)}
        simCondition={simCondition}
        onSimConditionChange={setSimCondition}
        simTemperature={simTemperature}
        onSimTemperatureChange={setSimTemperature}
      />
    </main>
  );
};

export default App;