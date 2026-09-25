"use client";

import { useLayoutEffect, useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const InfiniteGallery = dynamic(
  () => import("@/components/ui/3d-gallery-photography"),
  { ssr: false },
);

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const CLIENT_IMAGES = Array.from({ length: 9 }, (_, i) => ({
  src: `/clientes-${i + 1}.jpg`,
  alt: `Grupo de clientes Aramas Tur ${i + 1}`,
}));

// Single pass through the full client set while pinned
const galleryImages = CLIENT_IMAGES.map((item, index) => ({
  ...item,
  id: String(index + 1),
}));

/** Scroll distance while pinned — one full image-set reveal, then release */
const PIN_SCROLL_DISTANCE = 1200;

export default function HistoryGallerySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: `+=${PIN_SCROLL_DISTANCE}`,
      pin: true,
      pinSpacing: true,
      scrub: 0.85,
      anticipatePin: 1,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
      onRefresh: (self) => {
        progressRef.current = self.progress;
      },
    });

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    // Dynamic WebGL gallery can shift layout after mount
    const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 400);

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener("resize", handleResize);
      trigger.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden bg-white"
    >
      <InfiniteGallery
        images={galleryImages}
        speed={1.0}
        zSpacing={3}
        visibleCount={12}
        falloff={{ near: 0.8, far: 14 }}
        scrollProgressRef={progressRef}
        scrollPhases={1}
        fadeSettings={{
          fadeIn: { start: 0.04, end: 0.2 },
          fadeOut: { start: 0.62, end: 0.82 },
        }}
        blurSettings={{
          blurIn: { start: 0.0, end: 0.14 },
          blurOut: { start: 0.62, end: 0.82 },
          maxBlur: 5.5,
        }}
        className="h-screen w-full"
      />

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 text-center">
        <h1 className="relative z-20 max-w-[16ch] font-serif text-4xl font-medium tracking-tight text-gray-950 drop-shadow-[0_2px_24px_rgba(255,255,255,0.95)] md:text-6xl lg:text-7xl">
          Venha fazer parte da nossa história também.
        </h1>
      </div>
    </section>
  );
}
