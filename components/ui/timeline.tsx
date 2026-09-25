// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function useGSAP(
  callback: () => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  },
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => {}, el ?? undefined);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
  }, deps);
}

const monthOrder = {
  Janeiro: 1,
  Fevereiro: 2,
  Março: 3,
  Abril: 4,
  Maio: 5,
  Junho: 6,
  Julho: 7,
  Agosto: 8,
  Setembro: 9,
  Outubro: 10,
  Novembro: 11,
  Dezembro: 12,
} as const;

type Month = keyof typeof monthOrder;

type JourneyItem = {
  id: string;
  year: string;
  month: Month;
  content: string;
};

export type TimelineProps = {
  title?: string;
  periodLabel?: string;
  textColor?: string;
  mutedTextColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  duration?: number;
  scrollDuration?: number;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

function parseYear(year: string): number {
  const n = Number(year);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

const topJourneyData: JourneyItem[] = [
  {
    id: "1990-janeiro",
    year: "1990",
    month: "Janeiro",
    content:
      "A visão de Cleuza dá o primeiro passo. Excursões de compras seguras para o Brás e Santa Catarina.",
  },
  {
    id: "2000-janeiro",
    year: "2000",
    month: "Janeiro",
    content:
      "Nasce a Aramas Tur. O nome 'Sarama' invertido marca a expansão e consolida o DNA familiar.",
  },
  {
    id: "2005-janeiro",
    year: "2005",
    month: "Janeiro",
    content:
      "Aquisição do 2º veículo. A empresa passa a focar exclusivamente em turismo rodoviário de excelência.",
  },
];

const bottomJourneyData: JourneyItem[] = [
  {
    id: "1994-janeiro",
    year: "1994",
    month: "Janeiro",
    content:
      "Expansão para o turismo de lazer. É o ano da conquista do primeiro ônibus próprio da agência.",
  },
  {
    id: "2004-janeiro",
    year: "2004",
    month: "Janeiro",
    content:
      "A história ganha força com a chegada de Cleonice, agregando união e experiência à equipe.",
  },
  {
    id: "2026-janeiro",
    year: "2026",
    month: "Janeiro",
    content:
      "Mais de 20 mil viagens realizadas. Clientes fiéis viajam e constroem memórias conosco há mais de 25 anos.",
  },
];

const allJourneyItems: JourneyItem[] = [
  ...topJourneyData,
  ...bottomJourneyData,
].sort((a, b) => {
  const yearDiff = parseYear(a.year) - parseYear(b.year);
  if (yearDiff !== 0) return yearDiff;
  return monthOrder[a.month] - monthOrder[b.month];
});

export default function Timeline({
  title = "A Nossa História",
  periodLabel = "1990 — 2026",
  textColor = "var(--color-foreground, #000000)",
  mutedTextColor = "var(--color-muted-foreground, #3f3f46)",
  activeColor = "#ff5f00",
  backgroundColor = "var(--color-background, #ffffff)",
  imageUrl = "/destino-1.jpg",
  imageAlt = "História da Aramas Tur",
  duration,
  scrollDuration = 1.2,
}: TimelineProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const wholeSliderRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);

  const sectionStyle: CSSProperties = {
    color: textColor,
    backgroundColor,
  };
  const activeStyle: CSSProperties = {
    backgroundColor: activeColor,
  };
  const mutedTextStyle: CSSProperties = {
    color: mutedTextColor,
  };

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const isMobile = window.innerWidth < 600;
      const slidePercent = isMobile ? -57 : -65;
      const lineWidth = isMobile ? "65%" : "98%";
      const slideEnd = isMobile ? "82% 50%" : "92% bottom";

      // Master timeline para o movimento horizontal com suavização de scrub
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: slideEnd,
          scrub: 0.5, // Adicionado amortecimento leve para suavizar o scroll
          anticipatePin: 1,
        },
        defaults: { ease: "power1.out", force3D: true },
      });

      tl.fromTo(
        wholeSliderRef.current,
        { xPercent: 0 },
        { xPercent: slidePercent }
      );

      if (reducedMotion) {
        gsap.set(".journey-line", { width: lineWidth });
        return;
      }

      gsap.to(".journey-line", {
        width: lineWidth,
        ease: "power1.out",
        force3D: true,
        scrollTrigger: {
          trigger: section,
          start: isMobile ? "top 30%" : "top 25%",
          end: slideEnd,
          scrub: 0.5,
        },
      });
    },
    { dependencies: [reducedMotion], scope: sectionRef },
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const items = allJourneyItems;

      if (reducedMotion) {
        items.forEach((item) => {
          gsap.set(`.jl-${item.id}`, { scaleY: 1 });
          gsap.set(`.jd-${item.id}`, { scale: 1 });
          gsap.set(`.title-${item.id}`, { opacity: 1, clearProps: "transform" });
          gsap.set(`.description-${item.id}`, { opacity: 1, clearProps: "transform" });
        });
        return;
      }

      items.forEach((item) => {
        gsap.set(`.jl-${item.id}`, {
          scaleY: 0,
          transformOrigin: "bottom bottom",
          force3D: true,
        });
        gsap.set(`.jd-${item.id}`, { scale: 0, force3D: true });
        gsap.set(`.title-${item.id}`, { opacity: 0, y: 30, force3D: true });
        gsap.set(`.description-${item.id}`, { opacity: 0, y: 30, force3D: true });
      });

      const positions: ReadonlyArray<readonly [number, number]> =
        window.innerWidth < 600
          ? [
              [22, 32],
              [28, 38],
              [36, 46],
              [45, 55],
              [52, 62],
              [60, 70],
              [69, 79],
            ]
          : [
              [6, 26],
              [16, 36],
              [26, 46],
              [35, 55],
              [45, 65],
              [55, 75],
              [65, 85],
            ];

      items.forEach((item, index) => {
        const [startPos, endPos] = positions[index] ?? positions[positions.length - 1];
        const lineSelector = `.jl-${item.id}`;
        const dotSelector = `.jd-${item.id}`;
        const titleSelector = `.title-${item.id}`;
        const descriptionSelector = `.description-${item.id}`;

        const isTop = topJourneyData.some((topItem) => topItem.id === item.id);
        if (!isTop) {
          gsap.set(lineSelector, { transformOrigin: "top top" });
        }

        // Usar um único ScrollTrigger consolidado por item com scrub amortecido
        gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: `${startPos}% 30%`,
            end: `${endPos}% 50%`,
            scrub: 0.5, // Suaviza o movimento de entrada dos textos e linhas
          },
          defaults: { ease: "power2.out", force3D: true },
        })
        .to(lineSelector, { scaleY: 1, duration: 1 })
        .to(dotSelector, { scale: 1, duration: 1 }, "<")
        .to(titleSelector, { y: 0, opacity: 1, duration: 1 }, "<")
        .to(descriptionSelector, { y: 0, opacity: 1, duration: 1 }, "<0.1");
      });

      const handleResize = () => {
        ScrollTrigger.refresh();
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    },
    { dependencies: [normalizedDuration, reducedMotion], scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="journey"
      className="h-[200vw] max-[600px]:h-[400vh] w-full relative will-change-transform"
      style={sectionStyle}
    >
      <div className="h-screen w-screen sticky top-[0%] pt-[10%] overflow-hidden max-[600px]:top-[5%]">
        <div
          ref={wholeSliderRef}
          className="mr-[2vw] flex h-[30vw] w-[240vw] items-center gap-[5vw] px-[5vw] max-[600px]:h-[80vh] max-[600px]:w-[800vw] max-[600px]:px-[7vw]"
        >
          <div className="h-full w-[30vw] overflow-hidden rounded-[1vw] max-[600px]:h-[65vw] max-[600px]:w-[85vw] max-[600px]:rounded-[5vw]">
            <img
              src={imageUrl}
              alt={imageAlt}
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="relative h-full w-full">
            <div className="w-full absolute left-0 top-[49%] -translate-y-1/2 flex items-center h-fit">
              <div
                className="h-[.8vw] max-[600px]:h-[2vw] max-[600px]:w-[2vw] w-[.8vw] rounded-full"
                style={activeStyle}
              ></div>
              <div
                className="h-px w-[0%] rounded-full journey-line"
                style={activeStyle}
              ></div>
              <div
                className="h-[.8vw] max-[600px]:h-[2vw] max-[600px]:w-[2vw] w-[.8vw] rounded-full"
                style={activeStyle}
              ></div>
            </div>

            <div className="flex h-1/2 w-full items-center justify-start gap-[.5vw]">
              <div className="h-full w-[20%] pt-[2vw] max-[600px]:h-fit max-[600px]:pt-[5vw]">
                <h2 className="w-[65%] text-[3vw] leading-[0.95] max-[600px]:text-[8.5vw]">
                  {title}
                </h2>
              </div>

              <div className="w-full flex h-full gap-x-[15vw] max-[600px]:gap-x-[40vw]">
                {topJourneyData.map((item) => (
                  <div
                    key={`top-${item.id}`}
                    className="relative h-full w-[30vw] px-[3vw] max-[600px]:flex max-[600px]:w-[70vw] max-[600px]:flex-col max-[600px]:px-[7vw]"
                  >
                    <div className="w-full absolute left-0 bottom-0 top-0 h-full">
                      <div
                        className={`size-[1vw] max-[600px]:size-[2.5vw] -translate-x-1/2 relative aspect-square rounded-full jd-${item.id}`}
                        style={activeStyle}
                      ></div>
                      <div
                        className={`h-[94%] w-px origin-bottom rounded-full jl-${item.id}`}
                        style={activeStyle}
                      ></div>
                    </div>

                    <div className="mt-[-1vw] space-y-[1vw] max-[600px]:mt-[-2vw]">
                      <h4
                        className={`title-${item.id} text-[2.5vw] leading-none max-[600px]:text-[6.4vw]`}
                      >
                        {item.year}
                      </h4>
                      <p
                        className={`description-${item.id} w-[90%] text-[1.5vw] leading-[1.15] max-[600px]:w-[90%] max-[600px]:text-[4.8vw]`}
                        style={mutedTextStyle}
                      >
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-1/2 flex items-center justify-start w-full">
              <div className="w-[34%] pt-[2vw] max-[600px]:pt-[5vw] max-[600px]:w-[30%] h-full">
                <p
                  className="text-[1.65vw] leading-none max-[600px]:text-[4.2vw]"
                  style={mutedTextStyle}
                >
                  {periodLabel}
                </p>
              </div>

              <div className="w-full flex h-full gap-x-[20vw] ml-[7vw] max-[600px]:gap-x-[40vw] max-[600px]:ml-[7vw]">
                {bottomJourneyData.map((item) => (
                  <div
                    key={`bottom-${item.id}`}
                    className="relative h-full w-[25vw] px-[3vw] max-[600px]:w-[70vw] max-[600px]:px-[7vw]"
                  >
                    <div className="w-full absolute left-0 bottom-[-1%] h-full">
                      <div
                        className={`h-[94%] origin-top w-px rounded-full max-[600px]:h-full jl-${item.id}`}
                        style={activeStyle}
                      ></div>
                      <div
                        className={`size-[1vw] max-[600px]:size-[2.5vw] -translate-x-1/2 relative w-auto aspect-square rounded-full jd-${item.id}`}
                        style={activeStyle}
                      ></div>
                    </div>

                    <div className="flex h-full w-full flex-col justify-end space-y-[1vw]">
                      <h4
                        className={`title-${item.id} text-[2.5vw] leading-none max-[600px]:text-[6.4vw]`}
                      >
                        {item.year}
                      </h4>
                      <p
                        className={`description-${item.id} w-[90%] text-[1.5vw] leading-[1.15] max-[600px]:w-[90%] max-[600px]:text-[4.8vw]`}
                        style={mutedTextStyle}
                      >
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}