import React, { useState, useEffect, useRef } from 'react';
import { WeatherData, WeatherCondition, CityOption } from '../../types';
import { CITIES } from '../../constants';
import { searchCities } from '../../services/weatherService';
import { Cloud, CloudRain, Sun, Snowflake, CloudLightning, Wind, MapPin, Droplets, Moon, Cpu, Thermometer, Radio, Clock, Send, Search, X, Loader2, CheckCircle2, Aperture, Square, Download, Trash2, Film, Gift } from 'lucide-react';

interface InterfaceProps {
  weather: WeatherData | null;
  loading: boolean;
  onCitySelect: (city: CityOption) => void;
  selectedCity: string;
  isSimMode: boolean;
  onToggleSim: () => void;
  simCondition: WeatherCondition;
  onSimConditionChange: (c: WeatherCondition) => void;
  simTemperature: number;
  onSimTemperatureChange: (t: number) => void;
}

// Reusable Glass Panel Component
const GlassPanel = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-2xl ${className}`}>
    {children}
  </div>
);

const WeatherIcon = ({ condition, isDay, className }: { condition: WeatherCondition, isDay: boolean, className?: string }) => {
  if (condition === WeatherCondition.Thunderstorm) return <CloudLightning className={className} />;
  if (condition === WeatherCondition.Rain || condition === WeatherCondition.Drizzle) return <CloudRain className={className} />;
  if (condition === WeatherCondition.Snow) return <Snowflake className={className} />;
  if (condition === WeatherCondition.Clouds) return <Cloud className={className} />;
  return isDay ? <Sun className={className} /> : <Moon className={className} />;
};

interface TooltipProps {
  children?: React.ReactNode;
  content: React.ReactNode;
}

const Tooltip = ({ children, content }: TooltipProps) => {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-max max-w-[220px] px-4 py-3 bg-neutral-900/60 border border-white/10 rounded-xl text-xs text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 pointer-events-none backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {content}
        {/* Triangle arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white/10"></div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-neutral-900/60 -mt-[1px]"></div>
      </div>
    </div>
  );
};

// --- GIFT RECORDER MODAL ---
const GiftModal = ({ videoUrl, onClose, onDownload, cityName, condition }: { videoUrl: string, onClose: () => void, onDownload: () => void, cityName: string, condition: string }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-neutral-900/90 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
        
        <div className="flex items-center gap-2 mb-6 text-yellow-400">
          <Gift size={24} />
          <h2 className="text-xl font-light tracking-widest uppercase">Weather Gift</h2>
        </div>

        <div className="relative w-full aspect-video bg-black/50 rounded-xl overflow-hidden mb-6 border border-white/5 shadow-inner group">
          <video 
            src={videoUrl} 
            autoPlay 
            loop 
            muted 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="bg-black/50 px-3 py-1 rounded-full text-[10px] text-white/70 uppercase tracking-widest backdrop-blur-md">
                Preview
             </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-white text-lg font-medium">{cityName}</p>
          <p className="text-white/40 text-sm uppercase tracking-wide">{condition}</p>
        </div>

        <div className="flex gap-3 w-full">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Trash2 size={16} /> Discard
          </button>
          <button 
            onClick={onDownload}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(234,179,8,0.3)]"
          >
            <Download size={16} /> Save Moment
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SMART MESSENGER COMPONENT ---
const SmartMessenger = ({ weather }: { weather: WeatherData }) => {
  const [message, setMessage] = useState('');
  const [localTimeStr, setLocalTimeStr] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [timeDiff, setTimeDiff] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!weather) return;

    const updateTime = () => {
      // Create date object for current time
      const now = new Date();
      
      // Calculate target time using timezone from API
      let targetDate;
      try {
        targetDate = new Date(now.toLocaleString("en-US", { timeZone: weather.timezone }));
      } catch (e) {
        // Fallback to offset based calculation if timezone string fails
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        targetDate = new Date(utc + (1000 * weather.utcOffsetSeconds));
      }

      setLocalTimeStr(targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Check if it's late (Between 10 PM and 7 AM)
      const hour = targetDate.getHours();
      const late = hour >= 22 || hour < 7;
      setIsLate(late);

      // Calculate approximate difference in hours
      const diffMs = targetDate.getTime() - now.getTime();
      const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
      setTimeDiff(diffHrs);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [weather]);

  const handleSend = () => {
    if (!message.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage('');
    }, 2000);
  };

  // Empathic UI styling: If late, reduce contrast, desaturate, and make it feel "quiet"
  const containerClass = isLate 
    ? "mt-4 p-4 rounded-xl bg-black/40 border border-white/5 grayscale opacity-70 transition-all duration-700 hover:opacity-100 hover:grayscale-0"
    : "mt-4 p-4 rounded-xl bg-white/5 border border-white/5 transition-all duration-700";

  const placeholderText = isLate 
    ? `Shhh... it's late in ${weather.city}...`
    : `Message ${weather.city}...`;

  return (
    <div className={containerClass}>
      {/* Time Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-white/80">
          <Clock size={16} className={isLate ? "text-white/40" : "text-cyan-400"}/>
          <span className="font-mono text-sm tracking-wide">{localTimeStr}</span>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
           {timeDiff === 0 ? 'Same Time' : `${timeDiff > 0 ? '+' : ''}${timeDiff} HRS`}
        </div>
      </div>

      {/* Input Area */}
      <div className="relative">
        <input 
          type="text" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholderText}
          className={`w-full bg-black/20 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none transition-colors placeholder:text-white/20 ${isLate ? 'focus:border-white/20' : 'focus:border-cyan-500/50'}`}
        />
        <button 
          onClick={handleSend}
          disabled={!message || sent}
          className={`absolute right-1.5 top-1.5 p-1.5 rounded-md transition-all duration-300 ${sent ? 'bg-green-500 text-white' : 'bg-white/10 text-white/60 hover:bg-cyan-500 hover:text-white'}`}
        >
          {sent ? <CheckCircle2 size={16} /> : <Send size={16} />}
        </button>
      </div>
      
      {isLate && (
        <div className="mt-2 text-[10px] text-white/20 text-center italic">
          Quiet Mode Active
        </div>
      )}
    </div>
  );
};


export const Interface: React.FC<InterfaceProps> = ({ 
  weather, 
  loading, 
  onCitySelect, 
  selectedCity,
  isSimMode,
  onToggleSim,
  simCondition,
  onSimConditionChange,
  simTemperature,
  onSimTemperatureChange
}) => {
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const MAX_RECORDING_TIME = 10; // seconds

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchCities(val);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const selectSearchResult = (city: CityOption) => {
    onCitySelect(city);
    setSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // --- RECORDING LOGIC ---
  const startRecording = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const stream = canvas.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setRecordedChunks([]);
        setIsRecording(false);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
  };

  // Timer for recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
        interval = setInterval(() => {
            setRecordingTime((prev) => {
                if (prev >= MAX_RECORDING_TIME) {
                    stopRecording();
                    return prev;
                }
                return prev + 1;
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, mediaRecorder]);

  const downloadVideo = () => {
      if (!videoUrl) return;
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `IsoWeather_${selectedCity}_${isSimMode ? simCondition : weather?.condition || 'Live'}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setVideoUrl(null); // Close modal
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col md:flex-row p-6 md:p-12 gap-6 z-10 overflow-hidden font-sans">
        
        {/* Modal Overlay */}
        {videoUrl && (
            <div className="pointer-events-auto">
                <GiftModal 
                    videoUrl={videoUrl} 
                    onClose={() => setVideoUrl(null)} 
                    onDownload={downloadVideo}
                    cityName={selectedCity}
                    condition={isSimMode ? simCondition : weather?.description || 'Weather'}
                />
            </div>
        )}

        {/* LEFT SECTION: Main Weather Card */}
        <div className="flex-1 flex flex-col justify-end md:justify-center items-start">
            <div className="pointer-events-auto w-full md:w-auto">
                <GlassPanel className="rounded-[2rem] p-8 min-w-full md:min-w-[420px] transition-all duration-500 ease-out">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
                        <div>
                            <h1 className="text-2xl font-light tracking-[0.2em] text-white/90">
                                ISO<span className="font-bold text-yellow-400">WEATHER</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`w-2 h-2 rounded-full ${isSimMode ? 'bg-cyan-400 animate-pulse' : 'bg-green-500'}`}></div>
                                <span className="text-[10px] text-white/40 tracking-widest font-medium uppercase">
                                    {isSimMode ? 'SIMULATION MODE' : 'LIVE DATA FEED'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Sim Toggle Small */}
                         <Tooltip content={isSimMode ? "Disable Simulation" : "Enable Simulation Mode"}>
                            <button 
                                onClick={onToggleSim}
                                className={`p-3 rounded-full transition-all duration-300 border ${isSimMode ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Cpu size={18} strokeWidth={isSimMode ? 2.5 : 1.5} />
                            </button>
                         </Tooltip>
                    </div>

                    {/* Main Content */}
                    {(loading && !isSimMode) ? (
                        <div className="py-12 flex flex-col items-center justify-center text-white/30 animate-pulse">
                            <Cloud size={48} className="mb-4 opacity-50" strokeWidth={1} />
                            <span className="text-xs tracking-[0.3em] uppercase">Synchonizing...</span>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700 fade-in">
                             {/* Big Temp & Icon */}
                             <div className="flex items-center gap-8">
                                <Tooltip content={<span className="text-white/80">{isSimMode ? 'Simulated Condition' : weather?.description}</span>}>
                                     <div className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-500
                                        ${isSimMode 
                                            ? 'bg-cyan-500/10 border-cyan-400/20 shadow-[0_0_30px_rgba(34,211,238,0.15)]' 
                                            : 'bg-yellow-500/10 border-yellow-400/20 shadow-[0_0_30px_rgba(250,204,21,0.15)]'
                                        }
                                     `}>
                                        <WeatherIcon 
                                            condition={isSimMode ? simCondition : weather!.condition} 
                                            isDay={isSimMode ? true : weather!.isDay} 
                                            className={`w-14 h-14 ${isSimMode ? 'text-cyan-400' : 'text-yellow-400'}`} 
                                        />
                                     </div>
                                </Tooltip>
                                
                                <div className="flex flex-col">
                                    <span className="text-8xl font-thin tracking-tighter text-white drop-shadow-2xl leading-[0.8]">
                                        {isSimMode ? simTemperature : Math.round(weather!.temperature)}°
                                    </span>
                                    <span className="text-white/50 text-sm tracking-[0.2em] uppercase font-medium pl-2 mt-3">
                                        {isSimMode ? simCondition : weather?.condition}
                                    </span>
                                </div>
                             </div>

                             {/* Stats Grid */}
                             {!isSimMode && (
                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4 hover:bg-white/10 transition-colors">
                                         <div className="p-2.5 bg-white/5 rounded-full text-blue-300"><Wind size={18} strokeWidth={1.5}/></div>
                                         <div>
                                             <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-0.5">Wind</div>
                                             <div className="text-white text-lg font-light tracking-wide">{weather?.windSpeed} <span className="text-xs text-white/40 font-normal">km/h</span></div>
                                         </div>
                                     </div>
                                     <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4 hover:bg-white/10 transition-colors">
                                         <div className="p-2.5 bg-white/5 rounded-full text-indigo-300"><Droplets size={18} strokeWidth={1.5}/></div>
                                         <div>
                                             <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-0.5">Humidity</div>
                                             <div className="text-white text-lg font-light tracking-wide">{weather?.humidity}<span className="text-xs text-white/40 font-normal">%</span></div>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* Sim Controls Area */}
                             {isSimMode && (
                                 <div className="bg-cyan-950/40 rounded-2xl p-5 border border-cyan-500/20 space-y-5">
                                     
                                     {/* Condition Selector */}
                                     <div>
                                        <div className="text-[10px] text-cyan-400/70 tracking-widest uppercase font-bold mb-3 flex items-center gap-2">
                                            <Radio size={12} /> Condition Override
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[WeatherCondition.Clear, WeatherCondition.Rain, WeatherCondition.Snow, WeatherCondition.Thunderstorm, WeatherCondition.Clouds, WeatherCondition.Drizzle].map(cond => (
                                                <button
                                                    key={cond}
                                                    onClick={() => onSimConditionChange(cond)}
                                                    className={`
                                                        text-[10px] uppercase font-bold py-2.5 px-2 rounded-lg transition-all duration-200
                                                        ${simCondition === cond 
                                                            ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105' 
                                                            : 'bg-black/40 text-cyan-200/50 hover:bg-cyan-500/20 hover:text-cyan-200 border border-transparent hover:border-cyan-500/30'}
                                                    `}
                                                >
                                                    {cond === WeatherCondition.Thunderstorm ? 'Storm' : cond}
                                                </button>
                                            ))}
                                        </div>
                                     </div>

                                     {/* Temperature Slider */}
                                     <div>
                                         <div className="flex justify-between items-center text-[10px] text-cyan-400/70 tracking-widest uppercase font-bold mb-3">
                                            <span className="flex items-center gap-2"><Thermometer size={12}/> Temperature</span>
                                            <span className="font-mono text-cyan-300">{simTemperature}°C</span>
                                         </div>
                                         <div className="relative h-6 flex items-center">
                                            <div className="absolute w-full h-1 bg-cyan-900/50 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500/30" style={{ width: `${((simTemperature + 20) / 70) * 100}%` }}></div>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="-20" 
                                                max="50" 
                                                value={simTemperature}
                                                onChange={(e) => onSimTemperatureChange(parseInt(e.target.value))}
                                                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div 
                                                className="absolute h-4 w-4 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] border-2 border-black pointer-events-none transition-all duration-75"
                                                style={{ left: `calc(${((simTemperature + 20) / 70) * 100}% - 8px)` }}
                                            ></div>
                                         </div>
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                </GlassPanel>
            </div>
        </div>

        {/* CENTER BOTTOM: Recorder Trigger */}
        <div className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
             {isRecording && (
                 <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 backdrop-blur border border-red-500/30 rounded-full animate-pulse">
                     <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                     <span className="text-[10px] font-bold text-red-200 tracking-widest">REC {recordingTime}s</span>
                 </div>
             )}
             
             <Tooltip content={isRecording ? "Stop Recording" : "Record Gift (10s)"}>
                 <button 
                     onClick={isRecording ? stopRecording : startRecording}
                     className={`relative w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.5)]
                         ${isRecording 
                             ? 'bg-red-500/10 border-red-500 text-red-500 scale-110' 
                             : 'bg-white/10 border-white/30 text-white/50 hover:bg-white/20 hover:text-white hover:border-white hover:scale-105'
                         }
                     `}
                 >
                     {/* Progress Ring for Recording */}
                     {isRecording && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="289" strokeDashoffset={289 - (289 * (recordingTime / MAX_RECORDING_TIME))} className="transition-[stroke-dashoffset] duration-1000 linear text-red-500" />
                        </svg>
                     )}
                     
                     {isRecording ? <Square fill="currentColor" size={24} /> : <Aperture size={28} />}
                 </button>
             </Tooltip>
        </div>

        {/* RIGHT SECTION: Navigation & Messaging */}
        <div className="flex-none flex flex-col justify-between items-end pointer-events-auto w-full md:w-[320px] h-full">
            
            {/* Top Right: Location Selection */}
            {!isSimMode && (
                <GlassPanel className="rounded-3xl p-3 md:p-6 backdrop-blur-2xl w-full mb-6">
                     <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-white/40"/>
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                                {searchMode ? 'Global Search' : 'Select Location'}
                            </span>
                        </div>
                        <button 
                            onClick={() => setSearchMode(!searchMode)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            {searchMode ? <X size={14}/> : <Search size={14}/>}
                        </button>
                     </div>

                     {searchMode ? (
                        <div className="animate-in fade-in duration-300">
                             <div className="relative mb-2">
                                <Search className="absolute left-3 top-2.5 text-white/30" size={14} />
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Search city..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-white/20"
                                />
                                {isSearching && <Loader2 className="absolute right-3 top-2.5 text-white/30 animate-spin" size={14} />}
                             </div>
                             <div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-hide">
                                {searchResults.map((city, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => selectSearchResult(city)}
                                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/10 text-sm text-white/80 transition-colors flex justify-between items-center"
                                    >
                                        <span>{city.name}</span>
                                        {(city as any).country && <span className="text-[10px] text-white/30 uppercase font-bold">{(city as any).country}</span>}
                                    </button>
                                ))}
                                {searchQuery.length > 1 && !isSearching && searchResults.length === 0 && (
                                    <div className="text-center py-4 text-xs text-white/30">No cities found</div>
                                )}
                             </div>
                        </div>
                     ) : (
                         <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide animate-in fade-in duration-300">
                             {CITIES.map(city => (
                                 <button 
                                    key={city.name}
                                    onClick={() => onCitySelect(city)}
                                    className={`group relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 min-w-[200px] md:min-w-full text-left border
                                        ${selectedCity === city.name 
                                            ? 'bg-white/10 border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                                            : 'bg-transparent border-transparent hover:bg-white/5'
                                        }
                                    `}
                                 >
                                    <div className={`w-1.5 h-10 rounded-full transition-all duration-500 
                                        ${selectedCity === city.name 
                                            ? 'bg-gradient-to-b from-yellow-300 to-orange-500 shadow-[0_0_15px_rgba(250,204,21,0.6)] scale-y-100' 
                                            : 'bg-white/10 scale-y-50 group-hover:bg-white/30 group-hover:scale-y-75'}`} 
                                    />
                                    <div className="flex-1">
                                        <div className={`text-base font-medium tracking-wide transition-colors duration-300 ${selectedCity === city.name ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
                                            {city.name}
                                        </div>
                                        <div className="text-[10px] text-white/30 font-mono tracking-wider mt-0.5 group-hover:text-white/40">
                                            {Math.abs(city.lat).toFixed(2)}°N, {Math.abs(city.lon).toFixed(2)}°{city.lon > 0 ? 'E' : 'W'}
                                        </div>
                                    </div>
                                    {selectedCity === city.name && (
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></div>
                                    )}
                                 </button>
                             ))}
                         </div>
                     )}
                </GlassPanel>
            )}

            {/* Bottom Right: Smart Messenger (Only in Live Mode) */}
            {!isSimMode && weather && (
                <div className="w-full">
                   <GlassPanel className="rounded-2xl p-4 backdrop-blur-2xl">
                      <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-2 flex items-center gap-2">
                        <Radio size={12} /> Live Comm-Link
                      </div>
                      <SmartMessenger weather={weather} />
                   </GlassPanel>
                </div>
            )}
        </div>
        
     </div>
  );
};