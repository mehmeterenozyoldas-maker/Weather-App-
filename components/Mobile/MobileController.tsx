import React, { useState, useEffect, useRef } from 'react';
import { Peer } from 'peerjs';
import { Smartphone, Wind, Rotate3d, Wifi, WifiOff, Zap } from 'lucide-react';

interface MobileControllerProps {
  hostId: string;
}

export const MobileController: React.FC<MobileControllerProps> = ({ hostId }) => {
  const [connected, setConnected] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [status, setStatus] = useState('Connecting to host...');
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- 1. CONNECT TO DESKTOP ---
  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setStatus(`Peer ID: ${id}. Connecting to Host...`);
      const conn = peer.connect(hostId);
      
      conn.on('open', () => {
        setConnected(true);
        setStatus('Connected via Quantum Link');
        connRef.current = conn;
        // Ping to keep alive
        setInterval(() => {
            if(conn.open) conn.send({ type: 'ping' });
        }, 1000);
      });

      conn.on('close', () => {
        setConnected(false);
        setStatus('Host Disconnected');
      });

      connRef.current = conn;
    });

    return () => {
      peer.destroy();
    };
  }, [hostId]);

  // --- 2. SENSOR LOGIC (IOS REQUIREMENT) ---
  const requestPermissions = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          // Also request orientation if needed
          if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
             await (DeviceOrientationEvent as any).requestPermission();
          }
          setPermissionGranted(true);
          startSensors();
        } else {
          setStatus('Permission Denied');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Android / Desktop
      setPermissionGranted(true);
      startSensors();
    }
  };

  const startSensors = () => {
    // --- GYRO (TILT) ---
    window.addEventListener('deviceorientation', (e) => {
      if (!connRef.current?.open) return;
      // Send simplified tilt data
      connRef.current.send({
        type: 'orientation',
        beta: e.beta, // X-axis tilt (front/back)
        gamma: e.gamma // Y-axis tilt (left/right)
      });
    });

    // --- ACCELEROMETER (SHAKE) ---
    let lastX = 0, lastY = 0, lastZ = 0;
    window.addEventListener('devicemotion', (e) => {
      if (!connRef.current?.open) return;
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const delta = Math.abs(acc.x! - lastX) + Math.abs(acc.y! - lastY) + Math.abs(acc.z! - lastZ);
      lastX = acc.x!; lastY = acc.y!; lastZ = acc.z!;

      if (delta > 15) { // Shake Threshold
         connRef.current.send({ type: 'shake', intensity: Math.min(delta / 5, 10) });
         // Haptic feedback on phone
         if (navigator.vibrate) navigator.vibrate(50);
      }
    });

    // --- MICROPHONE (WIND) ---
    initMic();
  };

  const initMic = async () => {
     try {
         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
         const ctx = audioContextRef.current;
         const source = ctx.createMediaStreamSource(stream);
         const analyser = ctx.createAnalyser();
         analyser.fftSize = 64;
         source.connect(analyser);
         const dataArray = new Uint8Array(analyser.frequencyBinCount);

         setInterval(() => {
             if (!connRef.current?.open) return;
             analyser.getByteFrequencyData(dataArray);
             let sum = 0;
             for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
             const avg = sum / dataArray.length;
             
             if (avg > 30) {
                 connRef.current.send({ type: 'wind', intensity: (avg - 30) / 10 });
             }
         }, 100);
     } catch (e) {
         console.log("Mic failed", e);
     }
  };

  if (!permissionGranted) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6 text-center">
              <Smartphone size={64} className="mb-6 text-cyan-400 animate-pulse" />
              <h1 className="text-2xl font-light mb-4 tracking-widest uppercase">IsoWeather Controller</h1>
              <p className="text-white/50 mb-8 text-sm">Grant access to sensors to control the simulation.</p>
              <button 
                  onClick={requestPermissions}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full font-bold shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-95 transition-transform"
              >
                  INITIALIZE LINK
              </button>
          </div>
      )
  }

  return (
    <div className="flex flex-col items-center justify-between h-screen bg-neutral-900 text-white p-8 overflow-hidden relative">
        {/* Background Visuals */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="z-10 w-full flex justify-between items-center">
            <span className="text-xs font-mono text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded">
                LINK_ACTIVE
            </span>
            {connected ? <Wifi size={20} className="text-green-500"/> : <WifiOff size={20} className="text-red-500"/>}
        </div>

        <div className="z-10 flex flex-col items-center gap-8 text-center">
            <div className="w-40 h-40 rounded-full border border-white/10 bg-white/5 flex items-center justify-center relative">
                <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin duration-[3s]"></div>
                <Rotate3d size={48} className="text-white/20" />
                <div className="absolute text-xs text-cyan-400 font-bold tracking-widest mt-16">TILT ACTIVE</div>
            </div>
            
            <div className="space-y-2">
                <p className="text-sm font-medium text-white/80">Gestures Active</p>
                <div className="flex gap-4 justify-center text-[10px] text-white/40 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Zap size={10}/> Shake</span>
                    <span className="flex items-center gap-1"><Wind size={10}/> Blow</span>
                </div>
            </div>
        </div>

        <div className="z-10 w-full">
            <button className="w-full py-6 bg-white/5 border border-white/10 rounded-2xl text-white/40 text-sm font-mono tracking-widest active:bg-white/10 transition-colors">
                TAP TO INTERACT
            </button>
        </div>
    </div>
  );
};