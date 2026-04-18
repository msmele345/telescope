"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  buildStarFieldAttributes,
  loadCatalog,
  type Star,
} from "@/lib/star-catalog";

const SPHERE_RADIUS = 50;

export default function SkyCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 0.0001], fov: 75, near: 0.00001, far: 1000 }}
      gl={{ antialias: true }}
      style={{ width: "100vw", height: "100vh", background: "#000011" }}
    >
      <color attach="background" args={["#000011"]} />
      <StarField />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={-0.4}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

function StarField() {
  const [stars, setStars] = useState<Star[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then(
      (loaded) => {
        if (!cancelled) setStars(loaded);
      },
      (err) => {
        console.error("Failed to load star catalog", err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const geometry = useMemo(() => {
    if (!stars) return null;
    const attrs = buildStarFieldAttributes(stars, SPHERE_RADIUS);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(attrs.positions, 3));
    g.setAttribute("size", new THREE.BufferAttribute(attrs.sizes, 1));
    g.setAttribute("brightness", new THREE.BufferAttribute(attrs.brightness, 1));
    return g;
  }, [stars]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float size;
          attribute float brightness;
          varying float vBrightness;
          void main() {
            vBrightness = brightness;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
          }
        `,
        fragmentShader: `
          varying float vBrightness;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float r2 = dot(c, c);
            if (r2 > 0.25) discard;
            float falloff = 1.0 - smoothstep(0.0, 0.25, r2);
            gl_FragColor = vec4(vec3(1.0), falloff * vBrightness);
          }
        `,
      }),
    []
  );

  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry]
  );

  useEffect(() => () => material.dispose(), [material]);

  if (!geometry) return null;
  return <points geometry={geometry} material={material} />;
}
