"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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
  type Equatorial,
} from "@/lib/sky-math";
import { DEFAULT_OBSERVER, type ObserverLocation } from "@/lib/observer";
import {
  BASE_PICK_THRESHOLD,
  RESET_FOV,
  applyView,
  canResolveTarget,
  pickThresholdForFov,
  readView,
  rotateSpeedForFov,
  skyDirection,
  stopMomentum,
  viewAt,
  viewForTarget,
  type CameraTarget,
  type CameraView,
} from "@/lib/camera-director";
import { stopDirection } from "@/lib/tours";
import Horizon from "./Horizon";
import MilkyWay from "./MilkyWay";

const SPHERE_RADIUS = 50;
const SOLAR_RADIUS = 49;
const MESSIER_RADIUS = 49.5;
const HIGHLIGHT_RADIUS = 48.5;
const DEG = Math.PI / 180;

// Applied once, when the canvas creates its camera. After that the camera
// director owns the FOV, OrbitControls owns the position.
const CAMERA_OPTIONS = {
  position: [0, -0.00004, 0.0001] as [number, number, number],
  fov: RESET_FOV,
  near: 0.00001,
  far: 1000,
};

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
  /**
   * What the view is pointed and zoomed at. Changing it eases the view there
   * (a cut with reduced motion) and highlights it. Null or absent zooms back
   * out to the default FOV, leaving the direction where it is.
   */
  focus?: CameraTarget | null;
}

export default function SkyCanvas({
  observer = DEFAULT_OBSERVER,
  when,
  onSelectStar,
  onSelectPlanet,
  onSelectMessier,
  focus = null,
}: SkyCanvasProps) {
  const stars = useLoaded(loadCatalog, "star catalog");
  const lines = useLoaded(loadConstellationLines, "constellation lines");
  return (
    <Canvas
      camera={CAMERA_OPTIONS}
      gl={{ antialias: true }}
      style={{ width: "100vw", height: "100vh", background: "#000011" }}
      onCreated={({ raycaster }) => {
        if (raycaster.params.Points) {
          raycaster.params.Points.threshold = BASE_PICK_THRESHOLD;
        }
      }}
    >
      <color attach="background" args={["#000011"]} />
      <MilkyWay observer={observer} when={when} radius={SPHERE_RADIUS} />
      <StarField stars={stars} observer={observer} when={when} onSelectStar={onSelectStar} />
      <ConstellationLineLayer lines={lines} observer={observer} when={when} />
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
      <FocusHighlight
        focus={focus}
        stars={stars}
        lines={lines}
        observer={observer}
        when={when}
      />
      <Horizon radius={SPHERE_RADIUS} />
      {/* rotateSpeed is set by CameraDirector, which scales it with the FOV. */}
      <OrbitControls makeDefault enableZoom={false} enablePan={false} target={[0, 0, 0]} />
      <CameraDirector
        focus={focus}
        stars={stars}
        lines={lines}
        observer={observer}
        when={when}
      />
    </Canvas>
  );
}

/** Load a catalog once on mount; null until it arrives. */
function useLoaded<T>(load: () => Promise<T>, what: string): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    let cancelled = false;
    load().then(
      (loaded) => {
        if (!cancelled) setValue(loaded);
      },
      (err) => {
        console.error(`Failed to load ${what}`, err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [load, what]);
  return value;
}

/** A stable identity for a target, so a fresh object for the same target is not a new move. */
function targetKey(target: CameraTarget | null): string | null {
  if (!target) return null;
  if (target.kind === "horizontal") return `horizontal:${target.alt},${target.az},${target.fov}`;
  return `${target.kind}:${target.id}`;
}

interface FocusProps {
  focus: CameraTarget | null;
  stars: Star[] | null;
  lines: ConstellationLines | null;
  observer: ObserverLocation;
  when?: Date;
}

interface Transition {
  from: CameraView;
  to: CameraView;
  startMs: number;
  reducedMotion: boolean;
}

/**
 * Eases the camera to `focus` whenever it changes, then hands control back to
 * OrbitControls. Drag is disabled only while a move is running, and every
 * move starts from wherever the view is now, including where the user has
 * dragged it. Also keeps drag speed and the pick threshold matched to the FOV.
 */
function CameraDirector({ focus, stars, lines, observer, when }: FocusProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const raycaster = useThree((s) => s.raycaster);

  // Read at the moment a move starts; a time tick alone never starts a move.
  const latest = useRef({ focus, observer, when });
  latest.current = { focus, observer, when };

  /** The move to start on the next frame; given the view it starts from. */
  const pending = useRef<((from: CameraView) => CameraView) | null>(null);
  const transition = useRef<Transition | null>(null);
  /** The key of the target last started: undefined before the first render. */
  const startedKey = useRef<string | null | undefined>(undefined);

  const key = targetKey(focus);

  useEffect(() => {
    if (startedKey.current === key) return;
    const target = latest.current.focus;
    if (!target) {
      // Nothing to undo on first mount; otherwise zoom back out in place.
      if (startedKey.current !== undefined) {
        pending.current = (from) => ({ direction: from.direction, fov: RESET_FOV });
      }
      startedKey.current = null;
      return;
    }
    // Wait only for the catalog this target is looked up in.
    if (!canResolveTarget(target, { stars, lines })) return;
    startedKey.current = key;
    const { observer: obs, when: at } = latest.current;
    const catalogs = { stars: stars ?? [], lines: lines ?? {} };
    const to = viewForTarget(target, catalogs, obs, at ?? new Date(), camera.aspect);
    if (to) pending.current = () => to;
  }, [key, stars, lines, camera]);

  useEffect(() => {
    if (controls) controls.rotateSpeed = rotateSpeedForFov(camera.fov);
  }, [controls, camera]);

  useFrame(() => {
    if (pending.current) {
      const from = readView(camera);
      const to = pending.current(from);
      pending.current = null;
      if (controls) {
        stopMomentum(controls);
        controls.enabled = false;
      }
      transition.current = {
        from,
        to,
        startMs: performance.now(),
        reducedMotion: prefersReducedMotion(),
      };
    }

    const t = transition.current;
    if (!t) return;
    const { view, done } = viewAt(t.from, t.to, performance.now() - t.startMs, {
      reducedMotion: t.reducedMotion,
    });
    applyView(camera, view);
    if (raycaster.params.Points) {
      raycaster.params.Points.threshold = pickThresholdForFov(view.fov);
    }
    if (done) {
      transition.current = null;
      if (controls) {
        controls.rotateSpeed = rotateSpeedForFov(view.fov);
        controls.enabled = true;
        controls.update();
      }
    }
  });

  return null;
}

/**
 * Marks the current target: a ring round a star or Messier object, brightened
 * lines for a constellation. Follows the sky as time moves. Has no click
 * handlers, so it never gets in the way of picking.
 */
function FocusHighlight({ focus, stars, lines, observer, when }: FocusProps) {
  if (!focus || focus.kind === "horizontal") return null;
  if (focus.kind === "constellation") {
    const figure = lines?.[focus.id];
    if (!figure) return null;
    return <ConstellationHighlight id={focus.id} figure={figure} observer={observer} when={when} />;
  }
  if (focus.kind === "star" && !stars) return null;
  const eq = stopDirection(focus, { stars: stars ?? [], lines: lines ?? {} });
  if (!eq) return null;
  return <TargetRing eq={eq} observer={observer} when={when} />;
}

const RING_SIZE_PX = 40;

function TargetRing({
  eq,
  observer,
  when,
}: {
  eq: Equatorial;
  observer: ObserverLocation;
  when?: Date;
}) {
  const { ra, dec } = eq;
  const geometry = useMemo(() => {
    const d = skyDirection({ ra, dec }, observer, when ?? new Date());
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([d.x * HIGHLIGHT_RADIUS, d.y * HIGHLIGHT_RADIUS, d.z * HIGHLIGHT_RADIUS]),
        3
      )
    );
    return g;
  }, [ra, dec, observer, when]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: `
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = ${RING_SIZE_PX.toFixed(1)};
          }
        `,
        fragmentShader: `
          void main() {
            float r = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.34, 0.38, r) * (1.0 - smoothstep(0.44, 0.48, r));
            if (a <= 0.0) discard;
            gl_FragColor = vec4(1.0, 0.86, 0.5, a * 0.9);
          }
        `,
      }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <points geometry={geometry} material={material} renderOrder={10} />;
}

function ConstellationHighlight({
  id,
  figure,
  observer,
  when,
}: {
  id: string;
  figure: ConstellationLines[string];
  observer: ObserverLocation;
  when?: Date;
}) {
  const geometry = useMemo(() => {
    const positions = buildConstellationLineAttributes(
      { [id]: figure },
      observer,
      when ?? new Date(),
      SPHERE_RADIUS
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [id, figure, observer, when]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#b8ceff"),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <lineSegments geometry={geometry} material={material} renderOrder={10} />;
}

interface StarFieldProps {
  stars: Star[] | null;
  observer: ObserverLocation;
  when?: Date;
  onSelectStar?: (star: Star) => void;
}

function StarField({ stars, observer, when, onSelectStar }: StarFieldProps) {
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
  lines: ConstellationLines | null;
  observer: ObserverLocation;
  when?: Date;
}

function ConstellationLineLayer({ lines, observer, when }: ConstellationLineLayerProps) {
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
