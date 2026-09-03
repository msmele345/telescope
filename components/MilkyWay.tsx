"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  equatorialToHorizontal,
  galacticToEquatorial,
  horizontalToVec3,
  localSiderealTime,
} from "@/lib/sky-math";
import type { ObserverLocation } from "@/lib/observer";

const DEG = Math.PI / 180;

export interface MilkyWayProps {
  observer: ObserverLocation;
  when?: Date;
  radius: number;
}

interface GalacticSample {
  l: number;
  b: number;
  /** Per-point base intensity — brighter toward the galactic centre. */
  weight: number;
}

// Deterministic PRNG so the band doesn't reshuffle every recompute.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_COUNT = 3600;

// One fixed cloud of (l, b) samples forming a soft band along the galactic
// equator, denser and brighter toward the galactic centre (l≈0). Computed
// once; only the projection onto the local sky changes with time/observer.
function buildSamples(): GalacticSample[] {
  const rand = mulberry32(0x5eed1);
  const samples: GalacticSample[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const l = rand() * 2 * Math.PI;
    // Sum-of-uniforms ≈ Gaussian latitude scatter; tighter band, soft halo.
    const g = (rand() + rand() + rand() + rand() - 2) / 2;
    const b = g * 13 * DEG;
    // Brighten the bulge around the galactic centre, dim the anticentre.
    const centreBoost = 0.55 + 0.45 * Math.cos(l);
    const weight = centreBoost * (1 - Math.min(1, Math.abs(g)));
    samples.push({ l, b, weight });
  }
  return samples;
}

/**
 * Subtle Milky Way backdrop. Each sample is converted galactic → equatorial
 * → horizontal with the same pipeline as the star field, so the band tracks
 * the observer and time scrubbing exactly as the real sky would.
 */
export default function MilkyWay({ observer, when, radius }: MilkyWayProps) {
  const samples = useMemo(buildSamples, []);

  const geometry = useMemo(() => {
    const at = when ?? new Date();
    const lst = localSiderealTime(at, observer.lng * DEG);
    const latRad = observer.lat * DEG;
    const positions = new Float32Array(samples.length * 3);
    const sizes = new Float32Array(samples.length);
    const alphas = new Float32Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      const { l, b, weight } = samples[i];
      const { ra, dec } = galacticToEquatorial(l, b);
      const { alt, az } = equatorialToHorizontal(ra, dec, latRad, lst);
      const v = horizontalToVec3(alt, az, radius);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      sizes[i] = 26 + weight * 34;
      alphas[i] = 0.012 + weight * 0.05;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
    return g;
  }, [samples, observer, when, radius]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float size;
          attribute float alpha;
          varying float vAlpha;
          void main() {
            vAlpha = alpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float r2 = dot(c, c);
            if (r2 > 0.25) discard;
            float falloff = 1.0 - smoothstep(0.0, 0.25, r2);
            falloff = pow(falloff, 2.2);
            vec3 tint = vec3(0.78, 0.82, 1.0);
            gl_FragColor = vec4(tint, falloff * vAlpha);
          }
        `,
      }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}
