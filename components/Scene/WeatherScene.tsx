import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { WeatherCondition } from '../../types';
import { Platform } from './Platform';
import { Particles } from './Particles';

interface WeatherSceneProps {
  condition: WeatherCondition;
  isDay: boolean;
  temperature: number;
  cityName: string;
}

// --- 3D ASSETS ---

// Shared Weather Moments: Fireflies representing other users' cursors
const Fireflies = () => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 15;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      t: Math.random() * 100,
      radius: 10 + Math.random() * 4, // Orbit outside the glass
      speed: 0.2 + Math.random() * 0.3,
      yOffset: (Math.random() - 0.5) * 10
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
      const y = Math.sin(t * 0.5 + p.t) * 2 + p.yOffset;

      dummy.position.set(x, y, z);
      const s = 0.1 + Math.sin(t * 3 + i) * 0.05; // Pulse size
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
    </instancedMesh>
  );
};

// Low Poly Cloud
const PolyCloud = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0.7, -0.2, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[-0.7, -0.1, 0.2]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0.3, 0.4, 0.3]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
    </group>
  );
};

// Sun Model
const SunModel = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial 
          color="#FDB813" 
          emissive="#FDB813"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <pointLight intensity={2} distance={15} color="#FDB813" decay={2} />
    </group>
  );
};

// Logic to detect "Shake" via OrbitControls velocity
const ShakeDetector = ({ onShake }: { onShake: (intensity: number) => void }) => {
  const lastAngle = useRef(0);
  const lastTime = useRef(0);
  const controlsRef = useRef<any>(null); // We need access to camera/controls

  useFrame((state) => {
    // We infer shake from camera movement speed since OrbitControls rotates the camera
    const azimuth = state.camera.rotation.y; 
    const now = state.clock.getElapsedTime();
    const dt = now - lastTime.current;

    if (dt > 0.1) {
      const delta = Math.abs(azimuth - lastAngle.current);
      const speed = delta / dt;
      
      // Threshold for "Shake"
      if (speed > 3) {
        onShake(Math.min(speed * 0.5, 5)); // Cap intensity
      } else {
        onShake(0);
      }

      lastAngle.current = azimuth;
      lastTime.current = now;
    }
  });

  return null;
}


export const WeatherScene: React.FC<WeatherSceneProps> = ({ condition, isDay, temperature, cityName }) => {
  const [shakeIntensity, setShakeIntensity] = useState(0);

  // Lighting adjustment based on time of day
  const ambientIntensity = isDay ? 0.6 : 0.2;
  const sunIntensity = isDay ? 1.5 : 0;
  
  const isCloudy = condition === WeatherCondition.Clouds || 
                   condition === WeatherCondition.Rain || 
                   condition === WeatherCondition.Thunderstorm || 
                   condition === WeatherCondition.Drizzle;
  
  const isClear = condition === WeatherCondition.Clear;

  // Smooth decay of shake intensity
  useEffect(() => {
    if (shakeIntensity > 0) {
      const timer = setTimeout(() => setShakeIntensity(prev => Math.max(0, prev - 0.1)), 100);
      return () => clearTimeout(timer);
    }
  }, [shakeIntensity]);

  return (
    <div className="w-full h-full relative z-0">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[18, 12, 18]} fov={40} />
        
        {/* Controls with Physics Inertia (Damping) */}
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={15}
          maxDistance={40}
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.2}
          autoRotate={true}
          autoRotateSpeed={0.5}
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
          position={[10, 20, 10]} 
          intensity={sunIntensity} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4a4a4a" />

        {/* Dynamic Background Elements */}
        {!isDay && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
        
        {/* Shared Weather Moments (Fireflies) */}
        <Fireflies />

        {/* --- MAIN SCENE --- */}
        
        {/* The Snow Globe Platform */}
        <Platform condition={condition} temperature={temperature} cityName={cityName} isDay={isDay} />
        
        {/* Weather Effects Group (Aligned with Platform at y=-4) */}
        <group position={[0, -4, 0]}>
          
          {/* Particles (Rain/Snow) - Reacts to Shake */}
          <Particles condition={condition} shakeIntensity={shakeIntensity} />

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
                  <pointLight position={[0, 2, 0]} intensity={2} color="#5555ff" distance={8} decay={2} />
                )}
              </group>
            )}
          </group>
        </group>

        <Environment preset={isDay ? "sunset" : "night"} blur={0.8} />
        <fog attach="fog" args={[isDay ? '#303030' : '#111111', 20, 60]} />
      </Canvas>
    </div>
  );
};