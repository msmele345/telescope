"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  buildHorizonStarFieldAttributes,
  loadCatalog,
  type Star,
} from "@/lib/star-catalog";
import {
  buildConstellationLineAttributes,
  loadConstellationLines,
  type ConstellationLines,
} from "@/lib/constellation";
import { DEFAULT_OBSERVER, type ObserverLocation } from "@/lib/observer";
import Horizon from "./Horizon";

const SPHERE_RADIUS = 50;
const POINT_PICK_THRESHOLD = 1.2; // world-units around each star → generous hit-test

export interface SkyCanvasProps {
  observer?: ObserverLocation;
  when?: Date;
  /** Called when the user clicks a star. */
  onSelectStar?: (star: Star) => void;
}

export default function SkyCanvas({
  observer = DEFAULT_OBSERVER,
  when,
  onSelectStar,
}: SkyCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, -0.00004, 0.0001], fov: 75, near: 0.00001, far: 1000 }}
      gl={{ antialias: true }}
      style={{ width: "100vw", height: "100vh", background: "#000011" }}
      onCreated={({ raycaster }) => {
        if (raycaster.params.Points) {
          raycaster.params.Points.threshold = POINT_PICK_THRESHOLD;
        }
      }}
    >
      <color attach="background" args={["#000011"]} />
      <StarField observer={observer} when={when} onSelectStar={onSelectStar} />
      <ConstellationLineLayer observer={observer} when={when} />
      <Horizon radius={SPHERE_RADIUS} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={-0.4}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

interface StarFieldProps {
  observer: ObserverLocation;
  when?: Date;
  onSelectStar?: (star: Star) => void;
}

function StarField({ observer, when, onSelectStar }: StarFieldProps) {
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
    const attrs = buildHorizonStarFieldAttributes(
      stars,
      observer,
      when ?? new Date(),
      SPHERE_RADIUS
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(attrs.positions, 3));
    g.setAttribute("size", new THREE.BufferAttribute(attrs.sizes, 1));
    g.setAttribute("brightness", new THREE.BufferAttribute(attrs.brightness, 1));
    return g;
  }, [stars, observer, when]);

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

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!stars || !onSelectStar) return;
      // Multiple stars may share screen pixels — pick the closest to the camera ray.
      const sorted = event.intersections
        .filter((i) => i.index !== undefined)
        .sort((a, b) => (a.distanceToRay ?? 0) - (b.distanceToRay ?? 0));
      const hit = sorted[0];
      if (hit && hit.index !== undefined) {
        const star = stars[hit.index];
        if (star) {
          event.stopPropagation();
          onSelectStar(star);
        }
      }
    },
    [stars, onSelectStar]
  );

  if (!geometry) return null;
  return (
    <points geometry={geometry} material={material} onClick={handleClick} />
  );
}

interface ConstellationLineLayerProps {
  observer: ObserverLocation;
  when?: Date;
}

function ConstellationLineLayer({ observer, when }: ConstellationLineLayerProps) {
  const [lines, setLines] = useState<ConstellationLines | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadConstellationLines().then(
      (loaded) => {
        if (!cancelled) setLines(loaded);
      },
      (err) => {
        console.error("Failed to load constellation lines", err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const geometry = useMemo(() => {
    if (!lines) return null;
    const positions = buildConstellationLineAttributes(
      lines,
      observer,
      when ?? new Date(),
      SPHERE_RADIUS
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [lines, observer, when]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#7aa3ff"),
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
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
  return <lineSegments geometry={geometry} material={material} />;
}
