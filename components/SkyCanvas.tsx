"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  computeSolarBodies,
  type SolarBody,
  type SolarBodyId,
} from "@/lib/solar-system";
import {
  MESSIER_CATALOG,
  buildMessierFieldAttributes,
  type MessierObject,
} from "@/lib/messier";
import {
  equatorialToHorizontal,
  horizontalToVec3,
  localSiderealTime,
} from "@/lib/sky-math";
import { DEFAULT_OBSERVER, type ObserverLocation } from "@/lib/observer";
import Horizon from "./Horizon";
import MilkyWay from "./MilkyWay";

const SPHERE_RADIUS = 50;
const POINT_PICK_THRESHOLD = 1.2;
const SOLAR_RADIUS = 49;
const MESSIER_RADIUS = 49.5;
const DEG = Math.PI / 180;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface SkyCanvasProps {
  observer?: ObserverLocation;
  when?: Date;
  /** Called when the user clicks a star. */
  onSelectStar?: (star: Star) => void;
  /** Called when the user clicks the Sun, Moon, or a planet. */
  onSelectPlanet?: (body: SolarBody) => void;
  /** Called when the user clicks a Messier deep-sky object. */
  onSelectMessier?: (object: MessierObject) => void;
}

export default function SkyCanvas({
  observer = DEFAULT_OBSERVER,
  when,
  onSelectStar,
  onSelectPlanet,
  onSelectMessier,
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
      <MilkyWay observer={observer} when={when} radius={SPHERE_RADIUS} />
      <StarField observer={observer} when={when} onSelectStar={onSelectStar} />
      <ConstellationLineLayer observer={observer} when={when} />
      <MessierLayer
        observer={observer}
        when={when}
        onSelectMessier={onSelectMessier}
      />
      <SolarSystemLayer
        observer={observer}
        when={when}
        onSelectPlanet={onSelectPlanet}
      />
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
    // Stable per-star twinkle phase so a star keeps its rhythm across
    // recomputes; depends only on the catalog, not observer/time.
    const phases = new Float32Array(stars.length);
    for (let i = 0; i < stars.length; i++) {
      phases[i] = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    }
    g.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    return g;
  }, [stars, observer, when]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uTwinkleAmp: { value: prefersReducedMotion() ? 0 : 0.35 },
        },
        vertexShader: `
          attribute float size;
          attribute float brightness;
          attribute float phase;
          varying float vBrightness;
          varying float vPhase;
          void main() {
            vBrightness = brightness;
            vPhase = phase;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uTwinkleAmp;
          varying float vBrightness;
          varying float vPhase;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float r2 = dot(c, c);
            if (r2 > 0.25) discard;
            float falloff = 1.0 - smoothstep(0.0, 0.25, r2);
            // Faint stars scintillate more than bright ones; phase keeps
            // each star's flicker independent.
            float amp = uTwinkleAmp * (1.0 - vBrightness);
            float tw = 1.0 - amp + amp *
              sin(uTime * 3.0 + vPhase * 6.2831853);
            gl_FragColor = vec4(vec3(1.0), falloff * vBrightness * tw);
          }
        `,
      }),
    []
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

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

interface SolarSystemLayerProps {
  observer: ObserverLocation;
  when?: Date;
  onSelectPlanet?: (body: SolarBody) => void;
}

interface RenderedSolarBody {
  body: SolarBody;
  position: [number, number, number];
}

const SOLAR_STYLE: Record<
  SolarBodyId,
  { color: string; radius: number; halo?: { color: string; radius: number; opacity: number } }
> = {
  sun: {
    color: "#ffd766",
    radius: 0.72,
    halo: { color: "#ffe9a8", radius: 1.5, opacity: 0.22 },
  },
  moon: { color: "#f4ecd9", radius: 0.55 },
  mercury: { color: "#b3a99a", radius: 0.2 },
  venus: { color: "#f1ddae", radius: 0.34 },
  mars: { color: "#d65f3a", radius: 0.24 },
  jupiter: { color: "#d6b06a", radius: 0.44 },
  saturn: { color: "#dbc790", radius: 0.38 },
  uranus: { color: "#9be0e4", radius: 0.28 },
  neptune: { color: "#4f7dde", radius: 0.26 },
};

function SolarSystemLayer({ observer, when, onSelectPlanet }: SolarSystemLayerProps) {
  // Recompute body positions only when observer or when changes (per
  // time tick), not per frame. Phase 6 perf budget.
  const rendered = useMemo<RenderedSolarBody[]>(() => {
    const at = when ?? new Date();
    const bodies = computeSolarBodies(observer, at);
    const lst = localSiderealTime(at, observer.lng * DEG);
    const latRad = observer.lat * DEG;
    return bodies.map((body) => {
      const { alt, az } = equatorialToHorizontal(body.ra, body.dec, latRad, lst);
      const v = horizontalToVec3(alt, az, SOLAR_RADIUS);
      return { body, position: [v.x, v.y, v.z] };
    });
  }, [observer, when]);

  const handleClick = useCallback(
    (body: SolarBody) => (event: ThreeEvent<MouseEvent>) => {
      if (!onSelectPlanet) return;
      event.stopPropagation();
      onSelectPlanet(body);
    },
    [onSelectPlanet]
  );

  return (
    <group>
      {rendered.map(({ body, position }) => {
        const style = SOLAR_STYLE[body.id];
        return (
          <group key={body.id} position={position}>
            {style.halo && (
              <mesh>
                <sphereGeometry args={[style.halo.radius, 24, 24]} />
                <meshBasicMaterial
                  color={style.halo.color}
                  transparent
                  opacity={style.halo.opacity}
                  depthWrite={false}
                />
              </mesh>
            )}
            <mesh onClick={handleClick(body)}>
              <sphereGeometry args={[style.radius, 24, 24]} />
              <meshBasicMaterial color={style.color} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

interface MessierLayerProps {
  observer: ObserverLocation;
  when?: Date;
  onSelectMessier?: (object: MessierObject) => void;
}

function MessierLayer({ observer, when, onSelectMessier }: MessierLayerProps) {
  const geometry = useMemo(() => {
    const attrs = buildMessierFieldAttributes(
      MESSIER_CATALOG,
      observer,
      when ?? new Date(),
      MESSIER_RADIUS
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(attrs.positions, 3));
    g.setAttribute("size", new THREE.BufferAttribute(attrs.sizes, 1));
    return g;
  }, [observer, when]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float size;
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
          }
        `,
        fragmentShader: `
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float r2 = dot(c, c);
            if (r2 > 0.25) discard;
            // Soft falloff with a fuzzier core than stars to read as "diffuse"
            float falloff = 1.0 - smoothstep(0.0, 0.25, r2);
            falloff = pow(falloff, 1.6);
            // Pinkish-blue tint distinguishes DSOs from white stars
            vec3 tint = vec3(0.85, 0.78, 1.0);
            gl_FragColor = vec4(tint, falloff * 0.78);
          }
        `,
      }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!onSelectMessier) return;
      const sorted = event.intersections
        .filter((i) => i.index !== undefined)
        .sort((a, b) => (a.distanceToRay ?? 0) - (b.distanceToRay ?? 0));
      const hit = sorted[0];
      if (hit && hit.index !== undefined) {
        const obj = MESSIER_CATALOG[hit.index];
        if (obj) {
          event.stopPropagation();
          onSelectMessier(obj);
        }
      }
    },
    [onSelectMessier]
  );

  return <points geometry={geometry} material={material} onClick={handleClick} />;
}
