import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stars, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';
import { WeatherCondition } from '../../types';
import { Platform } from './Platform';
import { Particles } from './Particles';

interface WeatherSceneProps {
  condition: WeatherCondition;
  isDay: boolean;
  temperature: number;
  cityName: string;
  windIntensity: number; // Added wind/mic input
  remoteOrientation?: { beta: number, gamma: number };
}

// --- 3D ASSETS ---

// Shared Weather Moments: Fireflies representing other users' cursors
const Fireflies = () => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 25;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      t: Math.random() * 100,
      radius: 10.5 + Math.random() * 5, // Orbit outside the glass
      speed: 0.1 + Math.random() * 0.2,
      yOffset: (Math.random() - 0.5) * 12
    }));
  }, []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();

    particles.forEach((p, i) => {
      // Elliptical orbit logic
      const angle = (t * p.speed) + p.t;
      const x = Math.cos(angle) * p.radius;
      const z = Math.sin(angle) * p.radius;
      const y = Math.sin(t * 0.5 + p.t) * 3 + p.yOffset;

      dummy.position.set(x, y, z);
      const s = 0.05 + Math.sin(t * 3 + i) * 0.03; // Pulse size
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#ffdd88" transparent opacity={0.8} toneMapped={false} />
    </instancedMesh>
  );
};

// Low Poly Cloud -> High Quality Cloud
const PolyCloud = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0.7, -0.2, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[-0.7, -0.1, 0.2]} castShadow receiveShadow>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0.3, 0.4, 0.3]} castShadow receiveShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  );
};

// Sun Model
const SunModel = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshBasicMaterial 
          color="#FFD700" 
          toneMapped={false}
        />
      </mesh>
      <pointLight intensity={3} distance={30} color="#FFD700" decay={2} castShadow shadow-mapSize={[2048, 2048]} />
    </group>
  );
};

// Logic to detect "Shake" via OrbitControls velocity or DeviceMotion
const ShakeDetector = ({ onShake }: { onShake: (intensity: number) => void }) => {
  const lastAngle = useRef(0);
  const lastTime = useRef(0);
  const velocityRef = useRef(0);

  // Desktop Shake (OrbitControls)
  useFrame((state) => {
    const azimuth = state.camera.rotation.y; 
    const now = state.clock.getElapsedTime();
    const dt = now - lastTime.current;

    if (dt > 0.1) {
      const delta = Math.abs(azimuth - lastAngle.current);
      const speed = delta / dt;
      
      // Threshold for "Shake"
      if (speed > 3) {
        velocityRef.current = Math.min(speed * 0.5, 5);
      } else {
        velocityRef.current *= 0.9; // Decay
      }
      
      onShake(velocityRef.current);

      lastAngle.current = azimuth;
      lastTime.current = now;
    }
  });

  return null;
}

// Component to apply remote orientation to the entire scene group
const SceneGroup = ({ remoteOrientation, children }: { remoteOrientation?: { beta: number, gamma: number }, children: React.ReactNode }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && remoteOrientation) {
      // Map beta (front/back tilt) to X axis rotation
      // Map gamma (left/right tilt) to Z axis rotation
      // Clamp values to prevent flipping the globe completely upside down
      const targetX = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(remoteOrientation.beta || 0), -Math.PI/4, Math.PI/4);
      const targetZ = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(remoteOrientation.gamma || 0), -Math.PI/4, Math.PI/4);
      
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.1);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, -targetZ, 0.1);
    } else if (groupRef.current) {
        // Return to center if no remote orientation
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.05);
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

export const WeatherScene: React.FC<WeatherSceneProps> = ({ condition, isDay, temperature, cityName, windIntensity, remoteOrientation }) => {
  const [shakeIntensity, setShakeIntensity] = useState(0);

  // Lighting adjustment based on time of day
  const ambientIntensity = isDay ? 0.4 : 0.1;
  const sunIntensity = isDay ? 2.5 : 0.2;
  
  const isCloudy = condition === WeatherCondition.Clouds || 
                   condition === WeatherCondition.Rain || 
                   condition === WeatherCondition.Thunderstorm || 
                   condition === WeatherCondition.Drizzle;
  
  const isClear = condition === WeatherCondition.Clear;

  // Mobile Shake Listener
  useEffect(() => {
    const handleDevicemotion = (event: DeviceMotionEvent) => {
       const acc = event.accelerationIncludingGravity;
       if (!acc) return;
       // Simple shake detection
       const totalForce = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
       if (totalForce > 25) {
           setShakeIntensity(prev => Math.min(prev + 2, 8));
       }
    };
    
    if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleDevicemotion);
    }
    return () => {
        if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
            window.removeEventListener('devicemotion', handleDevicemotion);
        }
    }
  }, []);

  // Smooth decay of shake intensity
  useEffect(() => {
    if (shakeIntensity > 0) {
      const timer = setTimeout(() => setShakeIntensity(prev => Math.max(0, prev - 0.1)), 100);
      return () => clearTimeout(timer);
    }
  }, [shakeIntensity]);

  return (
    <div className="w-full h-full relative z-0">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}>
        <PerspectiveCamera makeDefault position={[22, 14, 22]} fov={35} />
        
        {/* Controls with Physics Inertia (Damping) */}
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={15}
          maxDistance={40}
          minPolarAngle={Math.PI / 6} 
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={!remoteOrientation} // Disable auto-rotate when phone is connected
          autoRotateSpeed={0.3}
          enableDamping={true} // Physics-based inertia
          dampingFactor={0.05} // Weight feeling
          rotateSpeed={0.5}
        />

        <ShakeDetector onShake={(val) => {
            if (val > shakeIntensity) setShakeIntensity(val);
        }} />

        {/* Global Lighting */}
        <ambientLight intensity={ambientIntensity} />
        <directionalLight 
          position={[15, 25, 10]} 
          intensity={sunIntensity} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-bias={-0.0001}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={isDay ? "#88bbee" : "#223344"} />

        {/* Dynamic Background Elements */}
        {!isDay && <Stars radius={100} depth={50} count={8000} factor={4} saturation={0.5} fade speed={1} />}
        
        {/* Shared Weather Moments (Fireflies) */}
        <Fireflies />

        {/* --- MAIN SCENE --- */}
        <SceneGroup remoteOrientation={remoteOrientation}>
            {/* The Snow Globe Platform */}
            <Platform condition={condition} temperature={temperature} cityName={cityName} isDay={isDay} />
            
            {/* Contact Shadows for realism */}
            <ContactShadows position={[0, -4.05, 0]} opacity={0.6} scale={25} blur={2} far={10} />

            {/* Weather Effects Group (Aligned with Platform at y=-4) */}
            <group position={[0, -4, 0]}>
            
            {/* Particles (Rain/Snow) - Reacts to Shake AND Wind */}
            <Particles condition={condition} shakeIntensity={shakeIntensity} windIntensity={windIntensity} />

            {/* Internal Elements (Sun / Clouds) */}
            <group position={[0, 6.5, 0]}> 
                {isClear && isDay && (
                <SunModel position={[3, 2, -2]} />
                )}

                {isCloudy && (
                <group>
                    <PolyCloud position={[2, 2, 2]} scale={1.5} />
                    <PolyCloud position={[-3, 1, -1]} scale={1.2} />
                    <PolyCloud position={[1, 3, -3]} scale={1.0} />
                    <PolyCloud position={[-1, 2.5, 3]} scale={0.8} />
                    
                    {condition === WeatherCondition.Thunderstorm && (
                    <pointLight position={[0, 2, 0]} intensity={5} color="#8888ff" distance={15} decay={2} castShadow />
                    )}
                </group>
                )}
            </group>
            </group>
        </SceneGroup>

        <Environment preset={isDay ? "city" : "night"} blur={0.6} background={false} />
        <fog attach="fog" args={[isDay ? '#87CEEB' : '#0a0a1a', 25, 70]} />

        {/* Post Processing */}
        <EffectComposer disableNormalPass multisampling={4}>
          <DepthOfField focusDistance={0.02} focalLength={0.05} bokehScale={3} height={480} />
          <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <ToneMapping />
        </EffectComposer>
      </Canvas>
    </div>
  );
};