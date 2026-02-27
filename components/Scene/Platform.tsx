import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { COLORS } from '../../constants';
import { WeatherCondition } from '../../types';
import { CityPointModel } from './CityPointModel';

interface PlatformProps {
  condition: WeatherCondition;
  temperature: number;
  cityName: string;
  isDay: boolean;
}

export const Platform: React.FC<PlatformProps> = ({ condition, temperature, cityName, isDay }) => {
  const groupRef = useRef<Group>(null);
  const snowRef = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Very subtle idle rotation of the whole globe
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.05) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, -4, 0]}>
      
      {/* --- BASE OF THE SNOW GLOBE --- */}
      <group position={[0, 0, 0]}>
        {/* Main Wood Stand */}
        <mesh receiveShadow position={[0, 1.0, 0]}>
          <cylinderGeometry args={[9.5, 10.5, 2.5, 64]} />
          <meshStandardMaterial 
            color={COLORS.platform.side} 
            roughness={0.6} 
            metalness={0.1} 
          />
        </mesh>
        
        {/* Gold Trim Ring Bottom */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[10.6, 10.6, 0.2, 64]} />
          <meshStandardMaterial 
            color={COLORS.platform.accent} 
            metalness={1.0} 
            roughness={0.15} 
          />
        </mesh>

        {/* Gold Trim Ring Top */}
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[9.6, 9.6, 0.1, 64]} />
          <meshStandardMaterial 
            color={COLORS.platform.accent} 
            metalness={1.0} 
            roughness={0.15} 
          />
        </mesh>

        {/* Inner Snow Bed (Floor inside the glass) */}
        <mesh ref={snowRef} position={[0, 2.3, 0]} receiveShadow>
           <cylinderGeometry args={[9.2, 9.2, 0.2, 64]} />
           <meshStandardMaterial 
             color="#ffffff" 
             roughness={0.8} 
             metalness={0.1}
           />
        </mesh>
      </group>

      {/* --- THE CITY --- */}
      {/* Lifted to sit on top of the snow bed inside the glass */}
      <group position={[0, 2.4, 0]}>
          <CityPointModel cityName={cityName} isDay={isDay} />
      </group>

      {/* --- GLASS DOME --- */}
      <mesh position={[0, 6.5, 0]} castShadow receiveShadow>
        {/* Radius 10 to encapsulate city (radius ~9) */}
        <sphereGeometry args={[10, 64, 64]} />
        <meshPhysicalMaterial 
          thickness={0.5} 
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transmission={1} // High transmission
          transparent={true}
          opacity={1} // High opacity base for physical material
          ior={1.45} // Slightly lower IOR for less distortion
          color="#ffffff"
          side={2} // DoubleSide
        />
      </mesh>
      
      {/* Specular highlights helper light inside */}
      <pointLight position={[5, 10, 5]} intensity={0.5} color="#ffffff" distance={20} />

    </group>
  );
};
