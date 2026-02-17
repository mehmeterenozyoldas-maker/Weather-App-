import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WeatherCondition } from '../../types';
import { COLORS } from '../../constants';

interface ParticlesProps {
  condition: WeatherCondition;
  count?: number;
  shakeIntensity?: number; // New prop for somaesthetic shake input
}

export const Particles: React.FC<ParticlesProps> = ({ condition, count = 800, shakeIntensity = 0 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Snow Globe Radius constraints
  const GLOBE_RADIUS = 9.0; 
  const GLOBE_CENTER_Y = 2.5; 

  // Generate initial random positions
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * GLOBE_RADIUS; 

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      temp.push({ 
        x, y, z, 
        originalSpeed: 0.05 + Math.random() * 0.1, 
        speed: 0.05 + Math.random() * 0.1,
        swirlOffset: Math.random() * Math.PI * 2,
        velocity: new THREE.Vector3(0, 0, 0)
      });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    
    const t = state.clock.getElapsedTime();

    particles.forEach((particle, i) => {
      // --- Shake Physics ---
      // If shaking, add chaotic velocity
      if (shakeIntensity > 0) {
        particle.velocity.x += (Math.random() - 0.5) * shakeIntensity * 0.5;
        particle.velocity.y += (Math.random() - 0.5) * shakeIntensity * 0.5;
        particle.velocity.z += (Math.random() - 0.5) * shakeIntensity * 0.5;
      }

      // Apply drag to velocity (return to normal)
      particle.velocity.multiplyScalar(0.9);

      // --- Normal Movement ---
      let fallSpeed = particle.originalSpeed;
      if (condition === WeatherCondition.Rain || condition === WeatherCondition.Thunderstorm) {
        fallSpeed *= 3; 
      }
      
      // Combine normal fall with shake velocity
      particle.y -= (fallSpeed + particle.velocity.y);
      particle.x += particle.velocity.x;
      particle.z += particle.velocity.z;

      // Swirl Effect (simulating liquid)
      const swirlStrength = 0.02 + (shakeIntensity * 0.1); // Swirl faster when shaken
      particle.x += Math.cos(t + particle.swirlOffset) * swirlStrength;
      particle.z += Math.sin(t + particle.swirlOffset) * swirlStrength;

      // Check Bounds
      const distSq = particle.x*particle.x + particle.y*particle.y + particle.z*particle.z;
      
      // Reset logic
      if (particle.y < -5 || (distSq > GLOBE_RADIUS * GLOBE_RADIUS && particle.y < 0)) {
        // Respawn at top
        const r = (0.5 + Math.random() * 0.5) * GLOBE_RADIUS * 0.8; 
        particle.y = Math.abs(r); 
        particle.x = (Math.random() - 0.5) * GLOBE_RADIUS;
        particle.z = (Math.random() - 0.5) * GLOBE_RADIUS;
        // Reset velocity on respawn
        particle.velocity.set(0, 0, 0);
      }

      // Render
      dummy.position.set(particle.x, particle.y + GLOBE_CENTER_Y + 4, particle.z); 

      if (condition === WeatherCondition.Rain || condition === WeatherCondition.Thunderstorm) {
        dummy.scale.set(0.04, 0.4, 0.04);
        // Tilt rain based on movement
        dummy.rotation.set(particle.velocity.z * 2, 0, 0.1 + particle.velocity.x * 2);
      } else {
        dummy.scale.set(0.1, 0.1, 0.1);
        dummy.rotation.set(t + i + (shakeIntensity * 5), t + i, 0); 
      }

      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  if (condition === WeatherCondition.Clear || condition === WeatherCondition.Clouds) {
    return null; 
  }

  const particleColor = (condition === WeatherCondition.Snow || condition === WeatherCondition.Clear) ? COLORS.snow : COLORS.rain;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} position={[0, -4, 0]}>
      {condition === WeatherCondition.Rain || condition === WeatherCondition.Thunderstorm ? (
         <boxGeometry args={[1, 1, 1]} />
      ) : (
         <dodecahedronGeometry args={[1, 0]} />
      )}
      <meshStandardMaterial 
        color={particleColor} 
        emissive={particleColor}
        emissiveIntensity={0.8}
        roughness={0.1}
      />
    </instancedMesh>
  );
};