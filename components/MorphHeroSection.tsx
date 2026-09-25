"use client";

import { Anton } from "next/font/google";
import MorphGallery from "@/components/ui/morph-gallery";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const ITEMS = [
  { src: "/1.jpg", alt: "Aramas Tur Destino 1" },
  { src: "/2.jpg", alt: "Aramas Tur Destino 2" },
  { src: "/3.jpg", alt: "Aramas Tur Destino 3" },
  { src: "/4.jpg", alt: "Aramas Tur Destino 4" },
  { src: "/5.jpg", alt: "Aramas Tur Destino 5" },
  { src: "/6.jpg", alt: "Aramas Tur Destino 6" },
];

export default function MorphHeroSection() {
  return (
    <div className="relative h-screen w-full">
      <MorphGallery
        items={ITEMS}
        autoplay={4500}
        height="100%"
        className="h-full w-full"
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30">
        {/* Main Title - Using Anton from Google Fonts */}
        <h1
          className={`animate-optimized-in-up text-6xl leading-none tracking-normal text-white opacity-0 drop-shadow-[0_15px_15px_rgba(0,0,0,0.9)] sm:text-8xl md:text-[10rem] lg:text-[12rem] ${anton.className}`}
        >
          ARAMAS TUR
        </h1>

        {/* Subtitle */}
        <p className="animate-optimized-in-up delay-500 mt-6 px-6 text-center text-sm font-medium tracking-[0.2em] text-white/80 uppercase opacity-0 drop-shadow-md sm:text-lg md:text-2xl">
          Mais de 30 anos de tradição, segurança e conforto
        </p>
      </div>
    </div>
  );
}
