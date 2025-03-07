// src/components/PeerToPeerVisualization.tsx
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { safeLerpVectors } from '@/components/Hero';
import { Smartphone } from 'lucide-react';
import { Html } from '@react-three/drei';

// Types
interface Node {
  position: THREE.Vector3;
  type: 'offline' | 'online';
  label: string;
}

interface Connection {
  from: Node;
  to: Node;
  pathPoints: THREE.Vector3[];
  color: THREE.Color;
  packets: { progress: number; speed: number }[];
}

// Generate clustered layout for nodes
const generateClusteredNodes = (): Node[] => {
  const nodes: Node[] = [];
  const numClusters = 9;
  const nodesPerCluster = 5;
  const clusterSpread = 1.5;
  const canvasBounds = 5; // Define canvas bounds to keep clusters within view

  const clusterCenters = Array.from(
    { length: numClusters },
    () =>
      new THREE.Vector3(
        (Math.random() - 0.5) * canvasBounds * 2,
        (Math.random() - 0.5) * canvasBounds * 2,
        0
      )
  );

  clusterCenters.forEach((center) => {
    for (let i = 0; i < nodesPerCluster; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * clusterSpread,
        (Math.random() - 0.5) * clusterSpread,
        0
      );
      const isOnline = Math.random() > 0.5;
      nodes.push({
        position: center.clone().add(offset),
        type: isOnline ? 'online' : 'offline',
        label: ''
      });
    }
  });

  return nodes;
};

const nodes = generateClusteredNodes();

// Updated Nodes component with Lucide icons and callouts
function Nodes() {
  return (
    <>
      {nodes.map((node, idx) => (
        <group key={idx} position={node.position}>
          <Html center>
            <div
              style={{
                textAlign: 'center',
                color: node.type === 'online' ? '#6366F1' : '#4ade80'
              }}
            >
              <Smartphone size={24} />
              <div style={{ fontSize: '0.6rem', marginTop: '4px' }}>
                {node.label}
              </div>
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

// Helper function to calculate arc paths
const calculateArcPath = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  numPoints = 20
) => {
  const points: THREE.Vector3[] = [];
  const midPoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5);
  midPoint.z += start.distanceTo(end) * 0.5; // Simple arc height adjustment

  const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
  points.push(...curve.getPoints(numPoints));
  return points;
};

// Helper function to determine connection color
const getConnectionColor = (from: Node, to: Node): THREE.Color => {
  if (from.type === 'online' && to.type === 'online')
    return new THREE.Color('#6366F1');
  if (from.type === 'offline' && to.type === 'offline')
    return new THREE.Color('#4ade80');
  return new THREE.Color('#F59E0B'); // online-offline
};

// Updated Connections component
function Connections() {
  const [dynamicConnections, setDynamicConnections] = useState<Connection[]>(
    []
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const onlineNodes = nodes;
      if (onlineNodes.length < 2) return;

      const connectionsToAdd: Connection[] = [];

      // Create multiple connections at once (e.g., 2 connections per interval)
      for (let i = 0; i < 2; i++) {
        const fromNode =
          onlineNodes[Math.floor(Math.random() * onlineNodes.length)];
        let toNode =
          onlineNodes[Math.floor(Math.random() * onlineNodes.length)];

        while (toNode === fromNode) {
          toNode = onlineNodes[Math.floor(Math.random() * onlineNodes.length)];
        }

        connectionsToAdd.push({
          from: fromNode,
          to: toNode,
          pathPoints: calculateArcPath(fromNode.position, toNode.position),
          packets: [{ progress: 0, speed: 0.5 }],
          color: getConnectionColor(fromNode, toNode)
        });
      }

      setDynamicConnections((prev) => [...prev, ...connectionsToAdd]);
    }, 1000); // every 1 second for more frequent connections

    return () => clearInterval(interval);
  }, []);

  useFrame((_, delta) => {
    setDynamicConnections((prevConnections) =>
      prevConnections
        .map((conn) => {
          const updatedPackets = conn.packets.map((packet) => ({
            ...packet,
            progress: packet.progress + packet.speed * delta
          }));
          return { ...conn, packets: updatedPackets };
        })
        .filter((conn) => conn.packets.some((packet) => packet.progress <= 1))
    );
  });

  return (
    <>
      {dynamicConnections.map((conn, idx) => (
        <group key={`dynamic-${idx}`}>
          <Line
            points={conn.pathPoints}
            color={conn.color}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            lineWidth={1}
          />
          {conn.packets.map((packet, packetIdx) => {
            const pathLength = conn.pathPoints.length - 1;
            const exactPathIndex = Math.floor(packet.progress * pathLength);
            const nextPathIndex = Math.min(exactPathIndex + 1, pathLength);
            const pathT = (packet.progress * pathLength) % 1;

            const packetPos = safeLerpVectors(
              conn.pathPoints[exactPathIndex],
              conn.pathPoints[nextPathIndex],
              pathT
            );

            return (
              <mesh
                key={`packet-dynamic-${idx}-${packetIdx}`}
                position={packetPos}
              >
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshBasicMaterial
                  color={conn.color}
                  transparent
                  opacity={1}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

// Main Visualization Component
export default function PeerToPeerVisualization() {
  return (
    <Canvas camera={{ position: [0, 0, 12], fov: 50 }}>
      <ambientLight intensity={1} />
      <Nodes />
      <Connections />
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} intensity={1.2} radius={0.4} />
      </EffectComposer>
    </Canvas>
  );
}
