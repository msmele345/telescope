"use client";

import { Canvas } from "@react-three/fiber";

export default function SkyCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 0.001], fov: 75 }}>
      <color attach="background" args={["#000011"]} />
      <ambientLight intensity={0.1} />
      <HardcodedStar />
    </Canvas>
  );
}

function HardcodedStar() {
  return (
    <mesh position={[0, 1, -5]}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
}
