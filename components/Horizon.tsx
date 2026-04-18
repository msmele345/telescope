"use client";

import { Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export interface HorizonProps {
  radius: number;
}

const CARDINALS: Array<{ label: "N" | "E" | "S" | "W"; az: number; color: string }> = [
  { label: "N", az: 0, color: "#6fa8ff" },
  { label: "E", az: Math.PI / 2, color: "#cfd4dc" },
  { label: "S", az: Math.PI, color: "#cfd4dc" },
  { label: "W", az: (3 * Math.PI) / 2, color: "#cfd4dc" },
];

// Horizon ring + N/E/S/W compass labels, drawn in the local horizontal frame
// (y=0 = horizon, -z = north, +x = east). The ring alone indicates the horizon;
// below-horizon stars remain visible so the sky fills the viewport.
export default function Horizon({ radius }: HorizonProps) {
  const ringGeometry = useMemo(
    () => new THREE.RingGeometry(radius * 0.995, radius * 1.001, 256),
    [radius]
  );

  const labelRadius = radius * 0.92;

  return (
    <group>
      {/* Horizon ring. */}
      <mesh geometry={ringGeometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#3a4666" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {CARDINALS.map(({ label, az, color }) => {
        const x = labelRadius * Math.sin(az);
        const z = -labelRadius * Math.cos(az);
        return (
          <Text
            key={label}
            position={[x, 0.4, z]}
            fontSize={radius * 0.04}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={radius * 0.003}
            outlineColor="#000"
          >
            {label}
          </Text>
        );
      })}
    </group>
  );
}
