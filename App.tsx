import React, { useState, useEffect, useRef } from 'react';
import { WeatherScene } from './components/Scene/WeatherScene';
import { Interface } from './components/UI/Interface';
import { MobileController } from './components/Mobile/MobileController';
import { fetchWeather } from './services/weatherService';
import { WeatherData, CityOption, WeatherCondition } from './types';
import { INITIAL_CITY } from './constants';
import { Peer } from 'peerjs';

const App: React.FC = () => {
  // --- ROUTING: CHECK IF WE ARE MOBILE CONTROLLER ---
  const [isControllerMode, setIsControllerMode] = useState(false);
  const [hostIdParam, setHostIdParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'controller') {
      setIsControllerMode(true);
      setHostIdParam(params.get('host'));
    }
  }, []);

  const [currentCity, setCurrentCity] = useState<CityOption>(INITIAL_CITY);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Digital Sim Mode State
  const [isSimMode, setIsSimMode] = useState(false);
  const [simCondition, setSimCondition] = useState<WeatherCondition>(WeatherCondition.Clear);
  const [simTemperature, setSimTemperature] = useState<number>(20);

  // Multi-Modal Interaction State
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [micWindIntensity, setMicWindIntensity] = useState(0);
  
  // PeerJS State
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remoteWindIntensity, setRemoteWindIntensity] = useState(0);
  const [remoteOrientation, setRemoteOrientation] = useState({ beta: 0, gamma: 0 });

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const windNodeRef = useRef<OscillatorNode | null>(null);
  const windGainRef = useRef<GainNode | null>(null);
  const rainNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  
  // Microphone Refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleCityChange = (city: CityOption) => {
    setCurrentCity(city);
  };

  // --- PEERJS HOST SETUP (Main App Only) ---
  useEffect(() => {
    if (isControllerMode) return;

    const peer = new Peer();
    
    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        if (data.type === 'shake') {
           // Create artificial "Mic" wind intensity from shake to create turbulence
           setRemoteWindIntensity(prev => Math.min(prev + data.intensity, 10));
        }
        if (data.type === 'wind') {
           setRemoteWindIntensity(data.intensity);
        }
        if (data.type === 'orientation') {
           setRemoteOrientation({ beta: data.beta, gamma: data.gamma });
        }
      });
    });

    return () => {
      peer.destroy();
    };
  }, [isControllerMode]);

  // Decay remote wind intensity
  useEffect(() => {
      if(remoteWindIntensity > 0) {
          const timer = setTimeout(() => {
              setRemoteWindIntensity(prev => Math.max(0, prev - 0.2));
          }, 100);
          return () => clearTimeout(timer);
      }
  }, [remoteWindIntensity]);


  useEffect(() => {
    if (isControllerMode) return;
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
  }, [currentCity, isControllerMode]);

  // Determine what to show in the scene
  const displayCondition = isSimMode ? simCondition : (weather?.condition || WeatherCondition.Clear);
  const displayIsDay = isSimMode ? true : (weather?.isDay ?? true);
  const displayTemperature = isSimMode ? simTemperature : (weather?.temperature ?? 20);
  const displayWindSpeed = isSimMode ? 10 : (weather?.windSpeed ?? 5);

  // --- AUDIO ENGINE ---
  useEffect(() => {
    if (isControllerMode) return;
    if (!isAudioEnabled) {
      if (audioContextRef.current) audioContextRef.current.suspend();
      return;
    }

    const initAudio = async () => {
       if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
       }
       const ctx = audioContextRef.current;
       if (ctx.state === 'suspended') ctx.resume();

       // --- Pink Noise Generator (Wind/Rain Base) ---
       const bufferSize = 2 * ctx.sampleRate;
       const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
       const output = noiseBuffer.getChannelData(0);
       let lastOut = 0;
       for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
       }

       // Setup Wind
       if (!windNodeRef.current) {
           const windSource = ctx.createBufferSource();
           windSource.buffer = noiseBuffer;
           windSource.loop = true;
           const windFilter = ctx.createBiquadFilter();
           windFilter.type = 'lowpass';
           windFilter.frequency.value = 400;
           const windGain = ctx.createGain();
           windGain.gain.value = 0.0; // Start silent

           windSource.connect(windFilter);
           windFilter.connect(windGain);
           windGain.connect(ctx.destination);
           windSource.start();
           
           windNodeRef.current = windSource as any;
           windGainRef.current = windGain;
       }

       // Setup Rain
       if (!rainNodeRef.current) {
           const rainSource = ctx.createBufferSource();
           rainSource.buffer = noiseBuffer;
           rainSource.loop = true;
           const rainFilter = ctx.createBiquadFilter();
           rainFilter.type = 'highpass';
           rainFilter.frequency.value = 800; 
           const rainGain = ctx.createGain();
           rainGain.gain.value = 0.0;

           rainSource.connect(rainFilter);
           rainFilter.connect(rainGain);
           rainGain.connect(ctx.destination);
           rainSource.start();

           rainNodeRef.current = rainSource;
           rainGainRef.current = rainGain;
       }
    };

    initAudio();
  }, [isAudioEnabled, isControllerMode]);

  // Modulate Audio based on Weather
  useEffect(() => {
    if (isControllerMode) return;
    if (!audioContextRef.current || !isAudioEnabled) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const totalWind = Math.max(micWindIntensity, remoteWindIntensity);

    // Wind Logic
    if (windGainRef.current) {
        // Base volume on reported wind speed OR Mic wind intensity
        const baseVol = Math.min(displayWindSpeed / 50, 0.5); 
        const micVol = totalWind * 0.2;
        windGainRef.current.gain.setTargetAtTime(baseVol + micVol, now, 1);
    }

    // Rain Logic
    if (rainGainRef.current) {
        let targetVol = 0;
        if (displayCondition === WeatherCondition.Rain) targetVol = 0.2;
        if (displayCondition === WeatherCondition.Thunderstorm) targetVol = 0.4;
        if (displayCondition === WeatherCondition.Drizzle) targetVol = 0.1;
        rainGainRef.current.gain.setTargetAtTime(targetVol, now, 2);
    }

  }, [displayCondition, displayWindSpeed, micWindIntensity, remoteWindIntensity, isAudioEnabled, isControllerMode]);


  // --- MICROPHONE WIND INPUT ---
  useEffect(() => {
    if (isControllerMode) return;

    if (isMicEnabled) {
       navigator.mediaDevices.getUserMedia({ audio: true, video: false })
       .then((stream) => {
          micStreamRef.current = stream;
          if (!audioContextRef.current) audioContextRef.current = new AudioContext();
          const ctx = audioContextRef.current;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          micIntervalRef.current = setInterval(() => {
             analyser.getByteFrequencyData(dataArray);
             // Calculate average volume
             let sum = 0;
             for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
             const avg = sum / dataArray.length;
             
             // Threshold for "Blowing"
             // Typically blowing produces low-mid frequency noise
             if (avg > 30) {
                // Map 30-100 range to 0-5 wind force
                const force = Math.min((avg - 30) / 10, 8);
                setMicWindIntensity(prev => prev + (force - prev) * 0.1); // Smooth
             } else {
                setMicWindIntensity(prev => Math.max(0, prev - 0.2)); // Decay
             }
          }, 50);

       }).catch(e => {
          console.error("Mic access denied", e);
          setIsMicEnabled(false);
       });
    } else {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (micIntervalRef.current) clearInterval(micIntervalRef.current);
        setMicWindIntensity(0);
    }
    
    return () => {
        if (micIntervalRef.current) clearInterval(micIntervalRef.current);
    };
  }, [isMicEnabled, isControllerMode]);


  // --- Visceral Haptics Engine ---
  useEffect(() => {
    if (!navigator.vibrate || isControllerMode) return;

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
                 
                 // Play Sound Effect if enabled
                 if (isAudioEnabled && audioContextRef.current) {
                    const ctx = audioContextRef.current;
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(100, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);
                    g.gain.setValueAtTime(1, ctx.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
                    osc.connect(g);
                    g.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 1);
                 }
             } else if (r > 0.6) {
                 navigator.vibrate(8);
             }
        }, 100);
    }

    return () => {
        if (interval) clearInterval(interval);
        navigator.vibrate(0); 
    };
  }, [displayCondition, isAudioEnabled, isControllerMode]);

  // RENDER CONTROLLER IF IN MOBILE MODE
  if (isControllerMode && hostIdParam) {
    return <MobileController hostId={hostIdParam} />;
  }

  return (
    <main className="w-full h-screen bg-neutral-900 relative overflow-hidden">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <WeatherScene 
          condition={displayCondition} 
          isDay={displayIsDay}
          temperature={displayTemperature}
          cityName={currentCity.name}
          windIntensity={Math.max(micWindIntensity, remoteWindIntensity)}
          remoteOrientation={remoteOrientation}
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
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
        isMicEnabled={isMicEnabled}
        onToggleMic={() => setIsMicEnabled(!isMicEnabled)}
        peerId={peerId}
      />
    </main>
  );
};

export default App;