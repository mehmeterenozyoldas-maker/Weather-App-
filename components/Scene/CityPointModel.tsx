import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CityPointModelProps {
  cityName: string;
  isDay: boolean;
}

// --- CITY DNA CONFIGURATION ---
const CITY_STYLES: Record<string, any> = {
  'London': {
    palette: ['#8b4513', '#a0522d', '#696969', '#dcdcdc'],
    waterBias: 0.3,
    layout: 'organic',
    heightScale: 1.5,
    roadColor: '#e5e5e5', // Lighter for snow globe
    hasRedBuses: true,
    roofStyle: 'varied'
  },
  'New York': {
    palette: ['#1f2937', '#374151', '#9ca3af', '#bfdbfe'],
    waterBias: -0.5,
    layout: 'grid',
    heightScale: 4.0,
    roadColor: '#e5e5e5',
    hasYellowTaxis: true,
    centralPark: true
  },
  'Tokyo': {
    palette: ['#1a1a1a', '#2d2d2d', '#e5e5e5', '#3b82f6'],
    waterBias: 0.1,
    layout: 'dense',
    heightScale: 2.5,
    roadColor: '#e5e5e5',
    neon: true
  },
  'Dubai': {
    palette: ['#e0f2fe', '#f0f9ff', '#94a3b8'],
    groundColor: '#fef3c7', // Pale sand
    waterBias: 0.0,
    layout: 'sparse',
    heightScale: 5.0,
    roadColor: '#f3f4f6'
  },
  'Reykjavik': {
    palette: ['#ef4444', '#22c55e', '#3b82f6', '#fcd34d', '#ffffff'],
    waterBias: 0.4,
    layout: 'village',
    heightScale: 0.6,
    roadColor: '#f3f4f6',
    snowy: true
  },
  'Stockholm': {
    palette: ['#e4c594', '#d69e6e', '#c46d50', '#8c4b38', '#e9e4d8'], 
    waterBias: 0.5,
    layout: 'organic',
    heightScale: 1.2,
    roadColor: '#f3f4f6', // Very light for snow
    hasBoats: true,
    spire: true
  },
  'Nicosia': {
    palette: ['#d6c096', '#eaddcf', '#a8a29e'],
    groundColor: '#e7e5e4',
    waterBias: -1.0,
    layout: 'walled',
    heightScale: 0.8,
    roadColor: '#e7e5e4'
  }
};

const DEFAULT_STYLE = {
  palette: ['#9ca3af', '#d1d5db', '#4b5563'],
  waterBias: 0.0,
  layout: 'organic',
  heightScale: 1.0,
  roadColor: '#e5e5e5'
};

// Procedural Textures
const generateTextures = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#888'; // Lighter concrete for snow vibe
    ctx.fillRect(0, 0, 64, 128);
    ctx.fillStyle = '#ddd'; 
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 4; x++) {
        if (Math.random() > 0.1) ctx.fillRect(4 + x * 15, 2 + y * 8, 8, 5);
      }
    }
  }
  const buildingTex = new THREE.CanvasTexture(canvas);
  buildingTex.magFilter = THREE.NearestFilter;

  if (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 64, 128);
    ctx.fillStyle = '#fff';
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 4; x++) {
        if (Math.random() > 0.6) ctx.fillRect(4 + x * 15, 2 + y * 8, 8, 5);
      }
    }
  }
  const emissiveTex = new THREE.CanvasTexture(canvas);
  emissiveTex.magFilter = THREE.NearestFilter;

  return { buildingTex, emissiveTex };
};

export const CityPointModel: React.FC<CityPointModelProps> = ({ cityName, isDay }) => {
  const buildingRef = useRef<THREE.InstancedMesh>(null);
  const terrainRef = useRef<THREE.InstancedMesh>(null);
  const propsRef = useRef<THREE.InstancedMesh>(null);
  const presenceRef = useRef<THREE.InstancedMesh>(null); // New ref for user presence lights
  
  const { buildingTex, emissiveTex } = useMemo(() => generateTextures(), []);

  const { buildings, terrain, props, presenceLights } = useMemo(() => {
    const style = CITY_STYLES[cityName] || DEFAULT_STYLE;
    const tempBuildings = [];
    const tempTerrain = [];
    const tempProps = [];
    const tempPresence = [];
    const dummy = new THREE.Object3D();

    let seed = cityName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const rand = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const size = 18; 
    const half = size / 2;
    const blockSize = 0.8;
    const gap = 0.1;

    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        const dist = Math.sqrt(x*x + z*z);
        if (dist > half - 1) continue;

        const posX = x * (blockSize + gap);
        const posZ = z * (blockSize + gap);
        let noise = Math.sin(x * 0.4) + Math.cos(z * 0.4) + rand() * 0.5;
        
        if (style.centralPark && x > -2 && x < 2 && z > -4 && z < 4) noise = 1.5;
        if (style.layout === 'grid' && (x % 3 === 0 || z % 3 === 0)) noise = 0.5;

        const isWater = noise < -1.2 + style.waterBias;
        const isPark = !isWater && noise > 1.3;
        const isRoad = !isWater && !isPark && (rand() > (style.layout === 'dense' ? 0.85 : 0.6));

        dummy.rotation.set(0, 0, 0);
        
        if (isWater) {
          dummy.position.set(posX, 0.0, posZ);
          dummy.scale.set(blockSize, 0.1, blockSize);
          dummy.updateMatrix();
          tempTerrain.push({ matrix: dummy.matrix.clone(), color: new THREE.Color('#bfdbfe') });

          if (style.hasBoats && rand() > 0.95) {
             dummy.position.set(posX, 0.1, posZ);
             dummy.scale.set(0.3, 0.2, 0.6);
             dummy.rotation.set(0, rand() * Math.PI, 0);
             dummy.updateMatrix();
             tempProps.push({ matrix: dummy.matrix.clone(), color: new THREE.Color('#fdfbf7') });
          }

        } else if (isPark) {
          dummy.position.set(posX, 0.1, posZ);
          dummy.scale.set(blockSize, 0.2, blockSize);
          dummy.updateMatrix();
          tempTerrain.push({ matrix: dummy.matrix.clone(), color: new THREE.Color('#d1fae5') });

          if (rand() > 0.3) {
             dummy.position.set(posX + (rand()-0.5)*0.3, 0.35, posZ + (rand()-0.5)*0.3);
             dummy.scale.set(0.2, 0.4 + rand()*0.3, 0.2);
             dummy.updateMatrix();
             tempProps.push({ matrix: dummy.matrix.clone(), color: new THREE.Color('#064e3b') }); 
          }
        } else if (isRoad) {
           const jitterY = rand() * 0.03;
           dummy.position.set(posX, 0.05 + jitterY, posZ);
           dummy.scale.set(blockSize, 0.1, blockSize);
           dummy.updateMatrix();
           tempTerrain.push({ matrix: dummy.matrix.clone(), color: new THREE.Color(style.groundColor || style.roadColor) });

           if (rand() > 0.8) {
               dummy.position.set(posX + 0.3, 0.5, posZ + 0.3);
               dummy.scale.set(0.05, 1.0, 0.05);
               dummy.updateMatrix();
               tempProps.push({ matrix: dummy.matrix.clone(), color: new THREE.Color('#fbbf24'), isLight: true });
           } else if (style.hasYellowTaxis && rand() > 0.85) {
               dummy.position.set(posX, 0.15, posZ);
               dummy.scale.set(0.4, 0.15, 0.2);
               dummy.rotation.set(0, rand() * Math.PI, 0);
               dummy.updateMatrix();
               tempProps.push({ matrix: dummy.matrix.clone(), color: new THREE.Color('#fbbf24') });
           } else if (style.hasRedBuses && rand() > 0.9) {
               dummy.position.set(posX, 0.25, posZ);
               dummy.scale.set(0.25, 0.3, 0.6);
               dummy.rotation.set(0, rand() * Math.PI, 0);
               dummy.updateMatrix();
               tempProps.push({ matrix: dummy.matrix.clone(), color: new THREE.Color('#dc2626') });
           }
        } else {
          // Buildings
          const centerFactor = 1 - Math.min(dist / (half * 0.8), 1);
          let height = 0.5 + (rand() * 4 * (centerFactor * centerFactor));
          height *= style.heightScale;
          
          let isSpire = false;
          if (style.spire && dist < 1.5 && rand() > 0.85) {
               height = 7 + rand() * 2;
               isSpire = true;
          }

          if (height < 0.4) height = 0.4;

          dummy.position.set(posX, height / 2 + 0.1, posZ);
          dummy.scale.set(blockSize, height, blockSize);
          if (isSpire) dummy.scale.set(blockSize * 0.8, height, blockSize * 0.8);

          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();

          let colorHex = style.palette[Math.floor(rand() * style.palette.length)];
          if (isSpire) colorHex = '#2f3e46';
          const color = new THREE.Color(colorHex);

          tempBuildings.push({ matrix: dummy.matrix.clone(), color });

          // AMBIENT PRESENCE: Randomly assign a "User" light to some building windows
          // These represent other people looking at the app
          if (rand() > 0.96) {
             // Place a small light box slightly outside the building wall
             dummy.scale.set(0.2, 0.2, 0.2);
             dummy.position.set(posX + (rand() > 0.5 ? 0.3 : -0.3), height * rand(), posZ);
             dummy.updateMatrix();
             tempPresence.push({ matrix: dummy.matrix.clone(), phase: rand() * Math.PI * 2 });
          }
        }
      }
    }
    return { buildings: tempBuildings, terrain: tempTerrain, props: tempProps, presenceLights: tempPresence };
  }, [cityName]);

  // Animation loop for User Presence Lights
  useFrame((state) => {
    if (!presenceRef.current) return;
    const t = state.clock.getElapsedTime();
    
    presenceLights.forEach((data, i) => {
      // Gentle pulsing to indicate "life"
      const intensity = 0.5 + Math.sin(t * 2 + data.phase) * 0.5;
      const color = new THREE.Color('#ffaa55').multiplyScalar(intensity * 2 + 1); // Warm orange
      presenceRef.current!.setColorAt(i, color);
    });
    
    if (presenceRef.current.instanceColor) presenceRef.current.instanceColor.needsUpdate = true;
  });

  useEffect(() => {
    if (!buildingRef.current || !terrainRef.current || !propsRef.current || !presenceRef.current) return;

    buildings.forEach((data, i) => {
      buildingRef.current!.setMatrixAt(i, data.matrix);
      const c = data.color.clone();
      if (!isDay) c.multiplyScalar(0.25);
      buildingRef.current!.setColorAt(i, c);
    });
    buildingRef.current.instanceMatrix.needsUpdate = true;
    if (buildingRef.current.instanceColor) buildingRef.current.instanceColor.needsUpdate = true;

    terrain.forEach((data, i) => {
      terrainRef.current!.setMatrixAt(i, data.matrix);
      const c = data.color.clone();
      if (!isDay) c.multiplyScalar(0.4); 
      terrainRef.current!.setColorAt(i, c);
    });
    terrainRef.current.instanceMatrix.needsUpdate = true;
    if (terrainRef.current.instanceColor) terrainRef.current.instanceColor.needsUpdate = true;

    props.forEach((data, i) => {
      propsRef.current!.setMatrixAt(i, data.matrix);
      let c = data.color.clone();
      if (!isDay) {
          if ((data as any).isLight) c = new THREE.Color('#fff7ed'); 
          else c.multiplyScalar(0.2);
      }
      propsRef.current!.setColorAt(i, c);
    });
    propsRef.current.instanceMatrix.needsUpdate = true;
    if (propsRef.current.instanceColor) propsRef.current.instanceColor.needsUpdate = true;

    presenceLights.forEach((data, i) => {
       presenceRef.current!.setMatrixAt(i, data.matrix);
       // Initial color set in useFrame
    });
    presenceRef.current.instanceMatrix.needsUpdate = true;

  }, [buildings, terrain, props, presenceLights, isDay]);

  return (
    <group>
      <instancedMesh ref={buildingRef} args={[undefined, undefined, buildings.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
            map={buildingTex}
            emissiveMap={emissiveTex}
            emissive={isDay ? new THREE.Color(0x000000) : new THREE.Color(0xffaa00)}
            emissiveIntensity={isDay ? 0 : 0.8}
            roughness={0.3}
            metalness={0.2}
        />
      </instancedMesh>

      <instancedMesh ref={terrainRef} args={[undefined, undefined, terrain.length]} receiveShadow>
         <boxGeometry args={[1, 1, 1]} />
         <meshStandardMaterial roughness={0.9} metalness={0.0} />
      </instancedMesh>

      <instancedMesh ref={propsRef} args={[undefined, undefined, props.length]} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            roughness={0.5} 
            emissive={isDay ? new THREE.Color(0x000000) : new THREE.Color(0xffaa00)}
            emissiveIntensity={isDay ? 0 : 1}
          />
      </instancedMesh>

      {/* Ambient Presence Lights (Shared Weather Moments) */}
      <instancedMesh ref={presenceRef} args={[undefined, undefined, presenceLights.length]}>
         <sphereGeometry args={[1, 8, 8]} />
         <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};