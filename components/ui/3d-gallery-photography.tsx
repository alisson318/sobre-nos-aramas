"use client";

import type React from "react";
import {
  useRef,
  useMemo,
  useCallback,
  useState,
  useEffect,
  Suspense,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type ImageItem = string | { src: string; alt?: string };

interface FadeSettings {
  /** Fade in range as percentage of depth range (0-1) */
  fadeIn: {
    start: number;
    end: number;
  };
  /** Fade out range as percentage of depth range (0-1) */
  fadeOut: {
    start: number;
    end: number;
  };
}

interface BlurSettings {
  /** Blur in range as percentage of depth range (0-1) */
  blurIn: {
    start: number;
    end: number;
  };
  /** Blur out range as percentage of depth range (0-1) */
  blurOut: {
    start: number;
    end: number;
  };
  /** Maximum blur amount (0-10, higher values = more blur) */
  maxBlur: number;
}

interface InfiniteGalleryProps {
  images: ImageItem[];
  /** Speed multiplier applied to scroll delta (default: 1) */
  speed?: number;
  /** Spacing between images along Z in world units (default: 2.5) */
  zSpacing?: number;
  /** Number of visible planes (default: clamp to images.length, min 8) */
  visibleCount?: number;
  /** Near/far distances for opacity/blur easing (default: { near: 0.5, far: 12 }) */
  falloff?: { near: number; far: number };
  /** Fade in/out settings with ranges based on depth range percentage (default: { fadeIn: { start: 0.05, end: 0.15 }, fadeOut: { start: 0.85, end: 0.95 } }) */
  fadeSettings?: FadeSettings;
  /** Blur in/out settings with ranges based on depth range percentage (default: { blurIn: { start: 0.0, end: 0.1 }, blurOut: { start: 0.9, end: 1.0 }, maxBlur: 3.0 }) */
  blurSettings?: BlurSettings;
  /** Optional className for outer container */
  className?: string;
  /** Optional style for outer container */
  style?: React.CSSProperties;
  /** When set, depth travel is scrubbed from page scroll progress (0–1) */
  scrollProgressRef?: MutableRefObject<number>;
  /** Full depth cycles across progress 0→1 (default: 2) — drives multi-phase reveals */
  scrollPhases?: number;
}

interface PlaneData {
  index: number;
  z: number;
  /** Immutable slot along the depth track (before scroll offset) */
  slotZ: number;
  imageIndex: number;
  /** Starting image index for this plane slot */
  initialImageIndex: number;
  x: number;
  y: number;
}

const DEFAULT_DEPTH_RANGE = 90;
/** Wider spread so planes sit toward the frame edges */
const MAX_HORIZONTAL_OFFSET = 14;
const MAX_VERTICAL_OFFSET = 10;
/** Keep-out radius around the centered headline */
const CENTER_KEEP_OUT = 4.5;
/** Base plane size — ~2× prior size for larger floating cards */
const PLANE_BASE_SIZE = 5.2;

// Custom shader material for blur, opacity, and cloth folding effects
const createClothMaterial = () => {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      map: { value: null },
      opacity: { value: 1.0 },
      blurAmount: { value: 0.0 },
      scrollForce: { value: 0.0 },
      time: { value: 0.0 },
      isHovered: { value: 0.0 },
    },
    vertexShader: `
      uniform float scrollForce;
      uniform float time;
      uniform float isHovered;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vNormal = normal;
        
        vec3 pos = position;
        
        // Create smooth curving based on scroll force
        float curveIntensity = scrollForce * 0.3;
        
        // Base curve across the plane based on distance from center
        float distanceFromCenter = length(pos.xy);
        float curve = distanceFromCenter * distanceFromCenter * curveIntensity;
        
        // Add gentle cloth-like ripples
        float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
        float clothEffect = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;
        
        // Flag waving effect when hovered
        float flagWave = 0.0;
        if (isHovered > 0.5) {
          // Create flag-like wave from left to right
          float wavePhase = pos.x * 3.0 + time * 8.0;
          float waveAmplitude = sin(wavePhase) * 0.1;
          // Damping effect - stronger wave on the right side (free edge)
          float dampening = smoothstep(-0.5, 0.5, pos.x);
          flagWave = waveAmplitude * dampening;
          
          // Add secondary smaller waves for more realistic flag motion
          float secondaryWave = sin(pos.x * 5.0 + time * 12.0) * 0.03 * dampening;
          flagWave += secondaryWave;
        }
        
        // Apply Z displacement for curving effect (inverted) with cloth ripples and flag wave
        pos.z -= (curve + clothEffect + flagWave);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float blurAmount;
      uniform float scrollForce;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vec4 color = texture2D(map, vUv);
        
        // Simple blur approximation
        if (blurAmount > 0.0) {
          vec2 texelSize = 1.0 / vec2(textureSize(map, 0));
          vec4 blurred = vec4(0.0);
          float total = 0.0;
          
          for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
              vec2 offset = vec2(x, y) * texelSize * blurAmount;
              float weight = 1.0 / (1.0 + length(vec2(x, y)));
              blurred += texture2D(map, vUv + offset) * weight;
              total += weight;
            }
          }
          color = blurred / total;
        }
        
        // Add subtle lighting effect based on curving
        float curveHighlight = abs(scrollForce) * 0.05;
        color.rgb += vec3(curveHighlight * 0.1);
        
        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
  });
};

function ImagePlane({
  texture,
  position,
  scale,
  material,
}: {
  texture: THREE.Texture;
  position: [number, number, number];
  scale: [number, number, number];
  material: THREE.ShaderMaterial;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (material && texture) {
      material.uniforms.map.value = texture;
    }
  }, [material, texture]);

  useEffect(() => {
    if (material && material.uniforms) {
      material.uniforms.isHovered.value = isHovered ? 1.0 : 0.0;
    }
  }, [material, isHovered]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      material={material}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <planeGeometry args={[1, 1, 32, 32]} />
    </mesh>
  );
}

function GalleryScene({
  images,
  speed = 1,
  visibleCount = 8,
  fadeSettings = {
    fadeIn: { start: 0.05, end: 0.15 },
    fadeOut: { start: 0.85, end: 0.95 },
  },
  blurSettings = {
    blurIn: { start: 0.0, end: 0.1 },
    blurOut: { start: 0.9, end: 1.0 },
    maxBlur: 3.0,
  },
  scrollProgressRef,
  scrollPhases = 2,
}: Omit<InfiniteGalleryProps, "className" | "style">) {
  const { gl } = useThree();
  const [, setTick] = useState(0);
  const scrollDriven = Boolean(scrollProgressRef);
  const [autoPlay, setAutoPlay] = useState(!scrollDriven);
  const autoPlayRef = useRef(!scrollDriven);
  const lastInteraction = useRef(Date.now());
  // Spring-like velocity: wheel input hits the target, render loop lerps smoothly
  const targetVelocity = useRef(0);
  const smoothVelocity = useRef(0);
  /** Smoothed depth travel driven by ScrollTrigger progress */
  const scrollOffset = useRef(0);
  const prevScrollOffset = useRef(0);
  const appearScales = useRef<number[]>(
    Array.from({ length: visibleCount }, () => 1),
  );

  // Normalize images to objects
  const normalizedImages = useMemo(
    () =>
      images.map((img) =>
        typeof img === "string" ? { src: img, alt: "" } : img,
      ),
    [images],
  );

  // Load textures
  const textures = useTexture(normalizedImages.map((img) => img.src));

  // Create materials pool
  const materials = useMemo(
    () => Array.from({ length: visibleCount }, () => createClothMaterial()),
    [visibleCount],
  );

  const spatialPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];

    for (let i = 0; i < visibleCount; i++) {
      // Golden-angle ring distribution biased toward the edges
      const angle = (i * 2.399963) % (Math.PI * 2);
      // Radius from mid-outer band → outer edge (never near dead center)
      const t = (i % visibleCount) / Math.max(visibleCount, 1);
      const radiusNorm = 0.55 + 0.45 * ((t * 1.618) % 1);

      let x = Math.cos(angle) * radiusNorm * MAX_HORIZONTAL_OFFSET;
      let y = Math.sin(angle) * radiusNorm * MAX_VERTICAL_OFFSET;

      // Alternate slight push into corner quadrants for a more spacious feel
      const quadrantPush = 1.15 + (i % 2) * 0.35;
      x *= quadrantPush;
      y *= quadrantPush * (0.85 + (i % 3) * 0.1);

      // Enforce a clear keep-out zone over the headline
      const dist = Math.hypot(x, y);
      if (dist < CENTER_KEEP_OUT) {
        const scale = CENTER_KEEP_OUT / Math.max(dist, 0.001);
        x *= scale;
        y *= scale;
      }

      // Clamp to outer bounds so planes stay in frame
      x = Math.max(-MAX_HORIZONTAL_OFFSET, Math.min(MAX_HORIZONTAL_OFFSET, x));
      y = Math.max(-MAX_VERTICAL_OFFSET, Math.min(MAX_VERTICAL_OFFSET, y));

      positions.push({ x, y });
    }

    return positions;
  }, [visibleCount]);

  const totalImages = normalizedImages.length;
  const depthRange = DEFAULT_DEPTH_RANGE;

  // Initialize plane data
  const planesData = useRef<PlaneData[]>(
    Array.from({ length: visibleCount }, (_, i) => {
      const slotZ =
        visibleCount > 0 ? ((depthRange / visibleCount) * i) % depthRange : 0;
      const initialImageIndex = totalImages > 0 ? i % totalImages : 0;
      return {
        index: i,
        z: slotZ,
        slotZ,
        imageIndex: initialImageIndex,
        initialImageIndex,
        x: spatialPositions[i]?.x ?? 0,
        y: spatialPositions[i]?.y ?? 0,
      };
    }),
  );

  useEffect(() => {
    planesData.current = Array.from({ length: visibleCount }, (_, i) => {
      const slotZ =
        visibleCount > 0
          ? ((depthRange / Math.max(visibleCount, 1)) * i) % depthRange
          : 0;
      const initialImageIndex = totalImages > 0 ? i % totalImages : 0;
      return {
        index: i,
        z: slotZ,
        slotZ,
        imageIndex: initialImageIndex,
        initialImageIndex,
        x: spatialPositions[i]?.x ?? 0,
        y: spatialPositions[i]?.y ?? 0,
      };
    });
  }, [depthRange, spatialPositions, totalImages, visibleCount]);

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  // Handle scroll input — accumulate into target velocity (smoothed in useFrame)
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      targetVelocity.current += event.deltaY * 0.008 * speed;
      setAutoPlay(false);
      lastInteraction.current = Date.now();
    },
    [speed],
  );

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        targetVelocity.current -= 1.2 * speed;
        setAutoPlay(false);
        lastInteraction.current = Date.now();
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        targetVelocity.current += 1.2 * speed;
        setAutoPlay(false);
        lastInteraction.current = Date.now();
      }
    },
    [speed],
  );

  useEffect(() => {
    // Page ScrollTrigger owns input when scroll-driven; skip canvas wheel trap
    if (scrollDriven) return;

    const canvas = gl.domElement;
    canvas.addEventListener("wheel", handleWheel, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [gl, handleWheel, handleKeyDown, scrollDriven]);

  // Auto-play logic (disabled while scrubbed by ScrollTrigger)
  useEffect(() => {
    if (scrollDriven) {
      setAutoPlay(false);
      autoPlayRef.current = false;
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() - lastInteraction.current > 3000) {
        setAutoPlay(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [scrollDriven]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const totalRange = depthRange;
    const imageAdvance =
      totalImages > 0 ? visibleCount % totalImages || totalImages : 0;

    let scrollVelocity = 0;

    if (scrollProgressRef) {
      // Absolute scrub from ScrollTrigger: progress → multi-phase depth travel
      const targetOffset =
        scrollProgressRef.current * totalRange * Math.max(scrollPhases, 1);
      const follow = 1 - Math.exp(-9 * dt);
      scrollOffset.current += (targetOffset - scrollOffset.current) * follow;
      scrollVelocity =
        (scrollOffset.current - prevScrollOffset.current) / Math.max(dt, 0.001);
      // Soft-clamp cloth force so scrub spikes stay elegant
      scrollVelocity = Math.max(-4, Math.min(4, scrollVelocity * 0.08));
      prevScrollOffset.current = scrollOffset.current;
    } else {
      // Gentle auto-play impulse
      if (autoPlayRef.current) {
        targetVelocity.current += 0.22 * dt;
      }

      // Spring-style lerp toward target (frame-rate independent)
      const follow = 1 - Math.exp(-10 * dt);
      smoothVelocity.current +=
        (targetVelocity.current - smoothVelocity.current) * follow;

      // Ease-out damping on the target so wheel spikes settle smoothly
      targetVelocity.current *= Math.exp(-3.2 * dt);

      scrollVelocity = smoothVelocity.current;
    }

    // Update time uniform for all materials
    const time = state.clock.getElapsedTime();
    materials.forEach((material) => {
      if (material && material.uniforms) {
        material.uniforms.time.value = time;
        material.uniforms.scrollForce.value = scrollVelocity;
      }
    });

    // Update plane positions
    planesData.current.forEach((plane, i) => {
      if (scrollProgressRef) {
        const rawZ = plane.slotZ + scrollOffset.current;
        const wraps = Math.floor(rawZ / totalRange);
        const newZ = ((rawZ % totalRange) + totalRange) % totalRange;
        plane.z = newZ;
        if (imageAdvance > 0 && totalImages > 0) {
          const stepped = plane.initialImageIndex + wraps * imageAdvance;
          plane.imageIndex =
            ((stepped % totalImages) + totalImages) % totalImages;
        }
      } else {
        let newZ = plane.z + scrollVelocity * dt * 10;
        let wrapsForward = 0;
        let wrapsBackward = 0;

        if (newZ >= totalRange) {
          wrapsForward = Math.floor(newZ / totalRange);
          newZ -= totalRange * wrapsForward;
        } else if (newZ < 0) {
          wrapsBackward = Math.ceil(-newZ / totalRange);
          newZ += totalRange * wrapsBackward;
        }

        if (wrapsForward > 0 && imageAdvance > 0 && totalImages > 0) {
          plane.imageIndex =
            (plane.imageIndex + wrapsForward * imageAdvance) % totalImages;
        }

        if (wrapsBackward > 0 && imageAdvance > 0 && totalImages > 0) {
          const step = plane.imageIndex - wrapsBackward * imageAdvance;
          plane.imageIndex =
            ((step % totalImages) + totalImages) % totalImages;
        }

        plane.z = ((newZ % totalRange) + totalRange) % totalRange;
      }

      plane.x = spatialPositions[i]?.x ?? 0;
      plane.y = spatialPositions[i]?.y ?? 0;

      // Calculate opacity based on fade settings
      const normalizedPosition = plane.z / totalRange; // 0 to 1
      let opacity = 1;

      if (
        normalizedPosition >= fadeSettings.fadeIn.start &&
        normalizedPosition <= fadeSettings.fadeIn.end
      ) {
        // Fade in: opacity goes from 0 to 1 within the fade in range
        const fadeInProgress =
          (normalizedPosition - fadeSettings.fadeIn.start) /
          (fadeSettings.fadeIn.end - fadeSettings.fadeIn.start);
        opacity = fadeInProgress;
      } else if (normalizedPosition < fadeSettings.fadeIn.start) {
        // Before fade in starts: fully transparent
        opacity = 0;
      } else if (
        normalizedPosition >= fadeSettings.fadeOut.start &&
        normalizedPosition <= fadeSettings.fadeOut.end
      ) {
        // Fade out: opacity goes from 1 to 0 within the fade out range
        const fadeOutProgress =
          (normalizedPosition - fadeSettings.fadeOut.start) /
          (fadeSettings.fadeOut.end - fadeSettings.fadeOut.start);
        opacity = 1 - fadeOutProgress;
      } else if (normalizedPosition > fadeSettings.fadeOut.end) {
        // After fade out ends: fully transparent
        opacity = 0;
      }

      // Clamp opacity between 0 and 1
      opacity = Math.max(0, Math.min(1, opacity));

      // Graceful scale-in / scale-out with fade (ease toward full size when visible)
      const eased = opacity * opacity * (3 - 2 * opacity);
      appearScales.current[i] = 0.72 + 0.28 * eased;

      // Calculate blur based on blur settings
      let blur = 0;

      if (
        normalizedPosition >= blurSettings.blurIn.start &&
        normalizedPosition <= blurSettings.blurIn.end
      ) {
        // Blur in: blur goes from maxBlur to 0 within the blur in range
        const blurInProgress =
          (normalizedPosition - blurSettings.blurIn.start) /
          (blurSettings.blurIn.end - blurSettings.blurIn.start);
        blur = blurSettings.maxBlur * (1 - blurInProgress);
      } else if (normalizedPosition < blurSettings.blurIn.start) {
        // Before blur in starts: full blur
        blur = blurSettings.maxBlur;
      } else if (
        normalizedPosition >= blurSettings.blurOut.start &&
        normalizedPosition <= blurSettings.blurOut.end
      ) {
        // Blur out: blur goes from 0 to maxBlur within the blur out range
        const blurOutProgress =
          (normalizedPosition - blurSettings.blurOut.start) /
          (blurSettings.blurOut.end - blurSettings.blurOut.start);
        blur = blurSettings.maxBlur * blurOutProgress;
      } else if (normalizedPosition > blurSettings.blurOut.end) {
        // After blur out ends: full blur
        blur = blurSettings.maxBlur;
      }

      // Clamp blur to reasonable values
      blur = Math.max(0, Math.min(blurSettings.maxBlur, blur));

      // Update material uniforms
      const material = materials[i];
      if (material && material.uniforms) {
        material.uniforms.opacity.value = opacity;
        material.uniforms.blurAmount.value = blur;
        const texture = textures[plane.imageIndex];
        if (texture) {
          material.uniforms.map.value = texture;
        }
      }
    });

    // Keep React in sync for mesh positions without hammering setState on velocity
    setTick((t) => (t + 1) % 1_000_000);
  });

  if (normalizedImages.length === 0) return null;

  return (
    <>
      {planesData.current.map((plane, i) => {
        const texture = textures[plane.imageIndex];
        const material = materials[i];

        if (!texture || !material) return null;

        const worldZ = plane.z - depthRange / 2;

        // Scale preserves aspect ratio (no distortion — cover-style fit)
        const image = texture.image as
          | { width?: number; height?: number }
          | undefined;
        const aspect =
          image?.width && image?.height ? image.width / image.height : 1;
        const appear = appearScales.current[i] ?? 1;
        const scale: [number, number, number] =
          aspect > 1
            ? [PLANE_BASE_SIZE * aspect * appear, PLANE_BASE_SIZE * appear, 1]
            : [PLANE_BASE_SIZE * appear, (PLANE_BASE_SIZE / aspect) * appear, 1];

        return (
          <ImagePlane
            key={plane.index}
            texture={texture}
            position={[plane.x, plane.y, worldZ]} // Position planes relative to camera center
            scale={scale}
            material={material}
          />
        );
      })}
    </>
  );
}

// Fallback component for when WebGL is not available
function FallbackGallery({ images }: { images: ImageItem[] }) {
  const normalizedImages = useMemo(
    () =>
      images.map((img) =>
        typeof img === "string" ? { src: img, alt: "" } : img,
      ),
    [images],
  );

  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-100 p-4">
      <p className="mb-4 text-gray-600">
        WebGL not supported. Showing image list:
      </p>
      <div className="grid max-h-96 grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3">
        {normalizedImages.map((img, i) => (
          <img
            key={i}
            src={img.src || "/placeholder.svg"}
            alt={img.alt}
            className="h-32 w-full rounded object-cover"
          />
        ))}
      </div>
    </div>
  );
}

export default function InfiniteGallery({
  images,
  speed = 1,
  visibleCount = 8,
  className = "h-screen w-full",
  style,
  fadeSettings = {
    fadeIn: { start: 0.05, end: 0.25 },
    fadeOut: { start: 0.4, end: 0.43 },
  },
  blurSettings = {
    blurIn: { start: 0.0, end: 0.1 },
    blurOut: { start: 0.4, end: 0.43 },
    maxBlur: 8.0,
  },
  scrollProgressRef,
  scrollPhases = 2,
}: InfiniteGalleryProps) {
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
      }
    } catch (e) {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported) {
    return (
      <div className={className} style={style}>
        <FallbackGallery images={images} />
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <Canvas
        camera={{ position: [0, 0, 0], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <Suspense fallback={null}>
          <GalleryScene
            images={images}
            speed={speed}
            visibleCount={visibleCount}
            fadeSettings={fadeSettings}
            blurSettings={blurSettings}
            scrollProgressRef={scrollProgressRef}
            scrollPhases={scrollPhases}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
