'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// Types for connections
interface Connection {
  id: number;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  progress: number;
  speed: number;
  life: number;
  maxLife: number;
  active: boolean;
  color: THREE.Color;
  pulseSpeed: number;
  pulsePhase: number;
  pathPoints: THREE.Vector3[]; // Array of points defining the path
  packets: {
    progress: number;
    speed: number;
    size: number;
    trail: {
      position: THREE.Vector3;
      opacity: number;
      id: number; // Unique identifier for each trail point
    }[]; // Trail positions and opacities
  }[]; // Data packets traveling along the path
}

// Cosmic colors from tailwind config
type CosmicColorKey =
  | 'blue'
  | 'purple'
  | 'indigo'
  | 'cyan'
  | 'nebula'
  | 'starlight';

const cosmicColors: Record<CosmicColorKey, THREE.Color> = {
  blue: new THREE.Color('#0C4A6E'),
  purple: new THREE.Color('#581C87'),
  indigo: new THREE.Color('#3730A3'),
  cyan: new THREE.Color('#0E7490'),
  nebula: new THREE.Color('#7E22CE'),
  starlight: new THREE.Color('#6366F1')
};

// Atmosphere colors
const atmosphereDayColor = new THREE.Color('#4db2ff');
const atmosphereTwilightColor = new THREE.Color('#bc490b');

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [dayMap, nightMap, cloudsMap] = useTexture([
    '/textures/2k_earth_daymap.jpg',
    '/textures/2k_earth_nightmap.jpg',
    '/textures/2k_earth_clouds.jpg'
  ]);

  // Set proper texture properties
  useEffect(() => {
    [dayMap, nightMap, cloudsMap].forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    });
  }, [dayMap, nightMap, cloudsMap]);

  const position: [number, number, number] = [2, -1, 0];
  const earthScale = 1.5;
  const cloudsScale = earthScale * 1.01;
  const atmosphereScale = earthScale * 1.04;

  // Sun direction for lighting and atmosphere - adjusted to be more from the front
  const sunDirection = useMemo(
    () => new THREE.Vector3(1, 0, 5).normalize(),
    []
  );

  // Roughness values
  const roughnessLow = useMemo(() => 0.25, []);
  const roughnessHigh = useMemo(() => 0.35, []);

  // Track rotation for smooth animation
  const rotationRef = useRef({ earth: 0, clouds: 0 });

  // Use the clock for animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Ensure smooth rotation regardless of frame rate
    if (earthRef.current) {
      rotationRef.current.earth += 0.025 * 0.016; // Base rotation on a 60fps rate
      earthRef.current.rotation.y = rotationRef.current.earth;
    }

    if (cloudsRef.current) {
      rotationRef.current.clouds += 0.03 * 0.016; // Base rotation on a 60fps rate
      cloudsRef.current.rotation.y = rotationRef.current.clouds;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = rotationRef.current.earth;
    }

    // Update camera position in shader is not needed - cameraPosition is a built-in uniform
  });

  return (
    <group>
      {/* Directional light pointing at Earth (sun) */}
      <directionalLight position={[1, 0, 5]} intensity={2} color="#ffffff" />

      {/* Earth */}
      <mesh ref={earthRef} position={position} scale={earthScale}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          map={dayMap}
          emissiveMap={nightMap}
          emissive={new THREE.Color(0.3, 0.3, 0.3)}
          emissiveIntensity={0.8}
          bumpMap={cloudsMap}
          bumpScale={0.05}
          shininess={5}
          specular={new THREE.Color(0.2, 0.2, 0.2)}
        />
      </mesh>

      {/* Clouds layer */}
      <mesh ref={cloudsRef} position={position} scale={cloudsScale}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          alphaMap={cloudsMap}
          transparent={true}
          opacity={0.4}
          depthWrite={false}
          color="#ffffff"
        />
      </mesh>

      {/* Shader-based Atmosphere */}
      <mesh ref={atmosphereRef} position={position} scale={atmosphereScale}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPosition;
            
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
              vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPosition;
            
            uniform vec3 atmosphereDayColor;
            uniform vec3 atmosphereTwilightColor;
            uniform vec3 sunDirection;
            // cameraPosition is already a built-in uniform in Three.js
            
            void main() {
              // Fresnel effect (view angle)
              vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
              float fresnel = 1.0 - abs(dot(vNormal, viewDirection));
              fresnel = pow(fresnel, 2.0);
              
              // Sun orientation effect
              float sunOrientation = dot(vNormal, sunDirection);
              
              // Day/twilight transition based on sun orientation
              float dayStrength = smoothstep(-0.25, 0.75, sunOrientation);
              vec3 atmosphereColor = mix(atmosphereTwilightColor, atmosphereDayColor, dayStrength);
              
              // Atmosphere visibility based on sun orientation
              float atmosphereDayStrength = smoothstep(-0.5, 1.0, sunOrientation);
              float atmosphereMix = clamp(atmosphereDayStrength * fresnel, 0.0, 1.0);
              
              // Alpha calculation for atmosphere edge
              float alpha = pow(fresnel, 3.0);
              alpha = alpha * smoothstep(-0.5, 1.0, sunOrientation);
              
              gl_FragColor = vec4(atmosphereColor, alpha);
            }
          `}
          uniforms={{
            atmosphereDayColor: { value: atmosphereDayColor },
            atmosphereTwilightColor: { value: atmosphereTwilightColor },
            sunDirection: { value: sunDirection }
            // No need to define cameraPosition as it's built-in
          }}
        />
      </mesh>
    </group>
  );
}

function LensFlares() {
  const flaresRef = useRef<THREE.Group>(null);

  // Create more flares with different sizes and positions
  const flares = useMemo(() => {
    const flarePositions = [];

    // Main flares - larger and more prominent
    for (let i = 0; i < 3; i++) {
      // Position them more strategically around the Earth
      const angle = (i / 3) * Math.PI * 2;
      const distance = 6 + Math.random() * 2;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance * 0.5; // Elliptical distribution
      const z = -2 - Math.random() * 3;
      const size = 0.2 + Math.random() * 0.3; // Larger size

      // Use specific cosmic colors for main flares
      const colorKeys = ['cyan', 'nebula', 'starlight'] as CosmicColorKey[];
      const color = cosmicColors[colorKeys[i % colorKeys.length]];

      flarePositions.push({
        position: [x, y, z],
        size,
        color,
        rotation: Math.random() * Math.PI,
        pulseSpeed: 0.5 + Math.random() * 0.5,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    // Secondary flares - smaller and more numerous
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 4 + Math.random() * 8;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance * 0.6;
      const z = -3 - Math.random() * 5;
      const size = 0.05 + Math.random() * 0.15;

      // Use random cosmic colors for secondary flares
      const colorKeys = Object.keys(cosmicColors) as CosmicColorKey[];
      const randomColor =
        cosmicColors[colorKeys[Math.floor(Math.random() * colorKeys.length)]];

      flarePositions.push({
        position: [x, y, z],
        size,
        color: randomColor,
        rotation: Math.random() * Math.PI,
        pulseSpeed: 0.2 + Math.random() * 1.0,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    // Add some anamorphic lens flares (horizontal streaks)
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const distance = 5 + Math.random() * 3;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance * 0.4;
      const z = -2 - Math.random() * 3;

      // Anamorphic flares are wider than tall
      const width = 0.3 + Math.random() * 0.4;
      const height = 0.02 + Math.random() * 0.03;

      // Use cosmic colors with higher intensity
      const colorKeys = [
        'cyan',
        'nebula',
        'starlight',
        'indigo'
      ] as CosmicColorKey[];
      const color = cosmicColors[colorKeys[i % colorKeys.length]]
        .clone()
        .multiplyScalar(1.5);

      flarePositions.push({
        position: [x, y, z],
        size: width, // Store the width in size
        height, // Additional height property
        color,
        rotation: angle, // Align with angle for better effect
        pulseSpeed: 0.3 + Math.random() * 0.4,
        pulsePhase: Math.random() * Math.PI * 2,
        isAnamorphic: true
      });
    }

    return flarePositions;
  }, []);

  // Animate the flares
  useFrame((state) => {
    const delta = state.clock.getDelta();

    if (flaresRef.current) {
      // Slowly rotate the entire flare system
      flaresRef.current.rotation.z += delta * 0.05;

      // Update individual flares
      flaresRef.current.children.forEach((flare, index) => {
        if (index < flares.length) {
          const flareData = flares[index];

          // Update pulse phase
          flareData.pulsePhase =
            (flareData.pulsePhase + flareData.pulseSpeed * delta) %
            (Math.PI * 2);

          // Apply pulse to scale and opacity
          const pulse = 0.8 + 0.2 * Math.sin(flareData.pulsePhase);

          if (flareData.isAnamorphic) {
            // For anamorphic flares, only pulse the width
            flare.scale.set(pulse, 1, 1);
          } else {
            flare.scale.set(pulse, pulse, pulse);
          }

          // Update material opacity
          const material = (flare as THREE.Mesh)
            .material as THREE.MeshBasicMaterial;
          if (material) {
            material.opacity = 0.6 + 0.4 * Math.sin(flareData.pulsePhase);
          }
        }
      });
    }
  });

  return (
    <group ref={flaresRef}>
      {flares.map((flare, index) => {
        if (flare.isAnamorphic) {
          // Create an anamorphic lens flare (horizontal streak)
          return (
            <mesh
              key={index}
              position={flare.position as [number, number, number]}
              rotation={[0, 0, flare.rotation]}
            >
              <planeGeometry args={[flare.size, flare.height as number]} />
              <meshBasicMaterial
                color={flare.color}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        } else {
          // Create a circular lens flare
          return (
            <mesh
              key={index}
              position={flare.position as [number, number, number]}
              rotation={[0, 0, flare.rotation]}
            >
              <circleGeometry args={[flare.size / 2, 32]} />
              <meshBasicMaterial
                color={flare.color}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        }
      })}
    </group>
  );
}

// Utility function to safely interpolate vectors
function safeLerpVectors(
  v1: THREE.Vector3 | undefined,
  v2: THREE.Vector3 | undefined,
  alpha: number
): THREE.Vector3 {
  if (!v1 || !v2) {
    console.warn('Attempted to lerpVectors with undefined vectors', { v1, v2 });
    return new THREE.Vector3(); // Return a default vector to avoid breaking the render
  }
  return new THREE.Vector3().lerpVectors(v1, v2, alpha);
}

function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const linesRef = useRef<THREE.Group>(null);
  const earthCenter = useMemo(() => new THREE.Vector3(2, -1, 0), []);
  const earthRadius = 1.1;

  // Use a ref to keep track of the next connection ID
  const nextConnectionIdRef = useRef(1);

  // Use a ref to store geometries that need to be disposed
  const geometriesRef = useRef<THREE.BufferGeometry[]>([]);

  // Track the last time geometries were cleaned up
  const lastCleanupRef = useRef(Date.now());

  // Debug state to track connection creation
  const [debugInfo, setDebugInfo] = useState({ created: 0, active: 0 });

  // Create reusable geometries for common shapes
  const sharedGeometries = useMemo(() => {
    return {
      // Trail point geometries at different sizes
      trailPoints: Array.from({ length: 10 }).map(
        (_, i) => new THREE.SphereGeometry(0.025 * (1 - i * 0.08), 6, 6)
      ),
      // Packet geometry
      packet: new THREE.SphereGeometry(0.025, 8, 8),
      // Glow effect geometry
      glow: new THREE.SphereGeometry(0.075, 8, 8),
      // Point geometries
      point: new THREE.SphereGeometry(0.03, 16, 16),
      pointGlow: new THREE.SphereGeometry(0.06, 16, 16),
      // Debug sphere
      debug: new THREE.SphereGeometry(0.1, 16, 16)
    };
  }, []);

  // Add shared geometries to the disposal list
  useEffect(() => {
    Object.values(sharedGeometries).forEach((geometry) => {
      if (Array.isArray(geometry)) {
        geometry.forEach((g) => geometriesRef.current.push(g));
      } else {
        geometriesRef.current.push(geometry);
      }
    });
  }, [sharedGeometries]);

  // Function to clean up geometries
  const cleanupGeometries = useCallback(() => {
    // Dispose of all stored geometries
    geometriesRef.current.forEach((geometry) => {
      if (geometry && geometry.dispose) {
        try {
          geometry.dispose();
        } catch (e) {
          // Ignore errors during disposal
          console.debug('Error disposing geometry:', e);
        }
      }
    });
    geometriesRef.current = [];
    lastCleanupRef.current = Date.now();
  }, []);

  // Periodically clean up geometries to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupGeometries();
    }, 5000); // Clean up every 5 seconds

    return () => {
      clearInterval(cleanupInterval);
      cleanupGeometries(); // Final cleanup when component unmounts
    };
  }, [cleanupGeometries]);

  // Generate a random point on the sphere
  const getRandomPointOnSphere = (
    radius: number = earthRadius,
    centerPos: THREE.Vector3 = earthCenter
  ) => {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    // Increase the radius significantly to ensure connections are visible above the Earth's surface
    const actualRadius = radius * 1.2; // Increased from 1.05 to 1.2

    const x = centerPos.x + actualRadius * Math.sin(phi) * Math.cos(theta);
    const y = centerPos.y + actualRadius * Math.sin(phi) * Math.sin(theta);
    const z = centerPos.z + actualRadius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  };

  // Calculate a curved path between two points on a sphere
  const calculateArcPath = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    numPoints: number = 20
  ) => {
    const points: THREE.Vector3[] = [];

    // Calculate the midpoint between start and end
    const midPoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);

    // Calculate the distance from the center to the midpoint
    const midPointDistance = midPoint.distanceTo(earthCenter);

    // Normalize the midpoint direction and scale it to create an arc
    const midPointDir = midPoint.clone().sub(earthCenter).normalize();

    // Calculate the arc height based on the distance between start and end
    // Significantly increase the arc height to make connections more visible
    const arcHeight = start.distanceTo(end) * 0.5; // Increased from 0.5 to 0.8

    // For points that are far apart, make the arc higher
    const distanceFactor = Math.min(
      start.distanceTo(end) / (earthRadius * 2),
      1
    );
    const adjustedArcHeight = arcHeight * (1.0 + distanceFactor * 1.0); // Increased factors

    // Adjust the midpoint outward to create an arc
    midPoint
      .copy(earthCenter)
      .add(midPointDir.multiplyScalar(earthRadius + adjustedArcHeight));

    // Create a quadratic bezier curve
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);

      // Quadratic bezier curve
      const point = new THREE.Vector3();

      // P = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const oneMinusT = 1 - t;
      const oneMinusTSquared = oneMinusT * oneMinusT;
      const tSquared = t * t;

      point.x =
        oneMinusTSquared * start.x +
        2 * oneMinusT * t * midPoint.x +
        tSquared * end.x;
      point.y =
        oneMinusTSquared * start.y +
        2 * oneMinusT * t * midPoint.y +
        tSquared * end.y;
      point.z =
        oneMinusTSquared * start.z +
        2 * oneMinusT * t * midPoint.z +
        tSquared * end.z;

      points.push(point);
    }

    return points;
  };

  // Create a new connection
  const createConnection = () => {
    const startPoint = getRandomPointOnSphere();
    const endPoint = getRandomPointOnSphere();

    if (startPoint.distanceTo(endPoint) < earthRadius * 0.8) {
      return;
    }

    const pathPoints = calculateArcPath(startPoint, endPoint);

    const colorKeys = Object.keys(cosmicColors) as CosmicColorKey[];
    const baseColor =
      cosmicColors[colorKeys[Math.floor(Math.random() * colorKeys.length)]];
    // Multiply and manually clamp RGB values between 0 and 1
    const randomColor = baseColor.clone().multiplyScalar(4);
    randomColor.r = Math.min(1, Math.max(0, randomColor.r));
    randomColor.g = Math.min(1, Math.max(0, randomColor.g));
    randomColor.b = Math.min(1, Math.max(0, randomColor.b));

    const packets = [];
    const numPackets = 2; // Fixed number of packets for consistency
    const packetSpacing = 1 / numPackets;

    for (let i = 0; i < numPackets; i++) {
      packets.push({
        progress: i * -packetSpacing, // Evenly spaced negative start for smooth entry
        speed: 0.5, // Fixed speed for smooth, predictable movement
        size: 0.01, // Fixed size
        trail: []
      });
    }

    const newConnection: Connection = {
      id: nextConnectionIdRef.current++,
      startPoint,
      endPoint,
      progress: 0,
      speed: 0.5, // Fixed speed for smoothness
      life: 0,
      maxLife: 2, // Consistent lifetime
      active: true,
      color: randomColor,
      pulseSpeed: 0.5,
      pulsePhase: 0,
      pathPoints,
      packets
    };

    setConnections((prev) => [...prev, newConnection]);
  };

  // Force create some initial connections
  useEffect(() => {
    // Create more initial connections
    for (let i = 0; i < 5; i++) {
      // Increased from 5 to 10
      createConnection();
    }
  }, []);

  // Periodically create new connections
  useEffect(() => {
    const interval = setInterval(() => {
      setConnections((prevConnections) => {
        if (prevConnections.length < 5) {
          createConnection();
        }
        return prevConnections;
      });
    }, 1000); // Create new connections every second

    return () => clearInterval(interval);
  }, []);

  // Update connections
  useFrame((state, delta) => {
    const newLife = connections.map((conn) => {
      const newLife = conn.life + delta;

      // Update packets smoothly without pulsing
      const updatedPackets = conn.packets.map((packet) => {
        let newProgress = packet.progress + packet.speed * delta;

        // Loop packet progress smoothly
        if (newProgress > 1) {
          newProgress -= 1;
        }

        // Calculate exact position along the path
        const pathLength = conn.pathPoints.length - 1;
        const exactPathIndex = Math.floor(newProgress * pathLength);
        const nextPathIndex = (exactPathIndex + 1) % pathLength;
        const pathT = (newProgress * pathLength) % 1;

        const packetPos = safeLerpVectors(
          conn.pathPoints[exactPathIndex],
          conn.pathPoints[nextPathIndex],
          pathT
        );

        return {
          ...packet,
          progress: newProgress,
          trail: [
            {
              position: packetPos,
              opacity: 1,
              id: packet.trail[0]?.id || Math.random()
            }
          ]
        };
      });

      return {
        ...conn,
        life: newLife,
        packets: updatedPackets,
        pulsePhase: 0 // Remove pulsing entirely
      };
    });

    setConnections(newLife);
  });

  return (
    <group ref={linesRef}>
      {/* Debug sphere to show Earth position - only show in debug mode */}
      {debugInfo && (
        <mesh
          position={earthCenter.toArray()}
          geometry={sharedGeometries.debug}
        >
          <meshBasicMaterial color="red" />
        </mesh>
      )}

      {connections.map((conn) => {
        // Calculate opacity based on life
        const baseOpacity =
          conn.life < 0.5
            ? conn.life / 0.5 // Fade in
            : conn.life > conn.maxLife - 0.5
              ? (conn.maxLife - conn.life) / 0.5 // Fade out
              : 1; // Full opacity

        // Convert path points to a format suitable for THREE.js BufferGeometry
        const linePoints = [];
        for (const point of conn.pathPoints) {
          linePoints.push(point.x, point.y, point.z);
        }

        return (
          <group key={`connection-${conn.id}`}>
            {/* Path line */}
            {(() => {
              const lineGeometry = new THREE.BufferGeometry();
              lineGeometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(
                  new Float32Array(linePoints),
                  3
                )
              );
              geometriesRef.current.push(lineGeometry);

              // Main line
              const lineMaterial = new THREE.LineBasicMaterial({
                color: conn.color,
                transparent: true,
                opacity: 0.9, // consistently high opacity
                blending: THREE.AdditiveBlending // additive blending for glow effect
              });

              // Glow line
              const glowMaterial = new THREE.LineBasicMaterial({
                color: conn.color.clone().multiplyScalar(2),
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending
              });

              return (
                <group>
                  <primitive
                    object={new THREE.Line(lineGeometry, glowMaterial)}
                  />
                  <primitive
                    object={new THREE.Line(lineGeometry, lineMaterial)}
                  />
                </group>
              );
            })()}

            {/* Data packets traveling along the path */}
            {conn.packets.map((packet, packetIndex) => {
              if (packet.progress <= 0 || conn.pathPoints.length < 2)
                return null;

              // Get the position along the path
              const pathIndex = Math.min(
                Math.floor(packet.progress * (conn.pathPoints.length - 1)),
                conn.pathPoints.length - 2
              );

              // Interpolate between path points for smooth movement
              const pathT =
                (packet.progress * (conn.pathPoints.length - 1)) % 1;
              const packetPos = safeLerpVectors(
                conn.pathPoints[pathIndex],
                conn.pathPoints[pathIndex + 1],
                pathT
              );

              // Add a glow effect to the packet
              return (
                <group key={`packet-${conn.id}-${packetIndex}`}>
                  {/* Trail effect */}
                  {packet.trail.map((trailPoint, trailIndex) => {
                    // Use the appropriate shared geometry based on index
                    const trailGeometryIndex = Math.min(trailIndex, 9);

                    return (
                      <mesh
                        key={`trail-${trailPoint.id}`}
                        position={[
                          trailPoint.position.x,
                          trailPoint.position.y,
                          trailPoint.position.z
                        ]}
                        geometry={
                          sharedGeometries.trailPoints[trailGeometryIndex]
                        }
                        scale={packet.size / 0.025} // Scale based on packet size
                      >
                        <meshBasicMaterial
                          color={conn.color}
                          transparent
                          opacity={baseOpacity * trailPoint.opacity * 0.7} // Increased opacity
                          blending={THREE.AdditiveBlending}
                        />
                      </mesh>
                    );
                  })}

                  {/* Main packet */}
                  <mesh
                    position={[packetPos.x, packetPos.y, packetPos.z]}
                    geometry={sharedGeometries.packet}
                    scale={packet.size / 0.025} // Scale based on packet size
                  >
                    <meshBasicMaterial
                      color={conn.color}
                      transparent
                      opacity={baseOpacity}
                      blending={THREE.AdditiveBlending}
                    />
                  </mesh>

                  {/* Glow effect */}
                  <mesh
                    position={[packetPos.x, packetPos.y, packetPos.z]}
                    geometry={sharedGeometries.glow}
                    scale={packet.size / 0.025}
                  >
                    <meshBasicMaterial
                      color={conn.color.clone().multiplyScalar(10)}
                      transparent
                      opacity={1.0}
                      blending={THREE.AdditiveBlending}
                    />
                  </mesh>
                </group>
              );
            })}

            {/* Source point with glow */}
            <group>
              {/* Main point */}
              <mesh
                position={[
                  conn.startPoint.x,
                  conn.startPoint.y,
                  conn.startPoint.z
                ]}
                geometry={sharedGeometries.point}
              >
                <meshBasicMaterial
                  color={conn.color}
                  transparent
                  opacity={baseOpacity * 0.9} // Increased opacity
                  blending={THREE.AdditiveBlending}
                />
              </mesh>

              {/* Glow effect */}
              <mesh
                position={[
                  conn.startPoint.x,
                  conn.startPoint.y,
                  conn.startPoint.z
                ]}
                geometry={sharedGeometries.pointGlow}
              >
                <meshBasicMaterial
                  color={conn.color}
                  transparent
                  opacity={baseOpacity * 0.5} // Increased opacity
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </group>

            {/* Destination point with glow */}
            <group>
              {/* Main point */}
              <mesh
                position={[conn.endPoint.x, conn.endPoint.y, conn.endPoint.z]}
                geometry={sharedGeometries.point}
              >
                <meshBasicMaterial
                  color={conn.color}
                  transparent
                  opacity={baseOpacity * 0.9} // Increased opacity
                  blending={THREE.AdditiveBlending}
                />
              </mesh>

              {/* Glow effect */}
              <mesh
                position={[conn.endPoint.x, conn.endPoint.y, conn.endPoint.z]}
                geometry={sharedGeometries.pointGlow}
              >
                <meshBasicMaterial
                  color={conn.color}
                  transparent
                  opacity={baseOpacity * 0.5} // Increased opacity
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

export default function Hero({ children }: { children?: React.ReactNode }) {
  // Track time for consistent rotation
  const timeRef = useRef(0);

  // Debug state
  const [debug, setDebug] = useState(false);

  // Toggle debug mode with 'd' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd') {
        setDebug((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="relative h-[60vh] md:h-[80vh] overflow-hidden">
      <Canvas camera={{ position: [7, 4, 6], fov: 35 }}>
        <ambientLight intensity={0.8} />
        <Connections />
        <Earth />
        {/* <LensFlares /> */}
        {debug && (
          <>
            <axesHelper args={[5]} />
            <gridHelper args={[10, 10]} />
          </>
        )}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.6} // Increased to reduce blooming of darker areas
            luminanceSmoothing={0.2} // Reduced for sharper bloom edges
            intensity={0.8} // Reduced overall bloom intensity
            radius={0.4} // Added to control bloom radius
            mipmapBlur={true}
            levels={3} // Added to control bloom quality
          />
        </EffectComposer>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="container mx-auto px-4 md:px-6">{children}</div>
      </div>
    </section>
  );
}
