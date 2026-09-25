"use client";

import { useEffect, useRef, useState } from "react";

export type SakuraEditorialKeyword = {
  label: string;
};

export type SakuraEditorialPosterProps = {
  title?: string;
  keywords?: SakuraEditorialKeyword[];
  headline?: string;
  body?: string;
  subheadline?: string;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
  socialHandle?: string;
  sceneSrc?: string;
  sceneSrcMobile?: string;
  sceneAlt?: string;
  foregroundSrc?: string | null;
  foregroundAlt?: string;
  height?: string;
  forceProgress?: number;
  preview?: boolean;
  className?: string;
};

const ASSET = "https://design-layer.com/dev/sakura-editorial-poster";

export const SAKURA_EDITORIAL_DEFAULT_KEYWORDS: SakuraEditorialKeyword[] = [
  { label: "Bloom" },
  { label: "Pause" },
  { label: "Return" },
];

const DEFAULT_BODY =
  "For a few still days the canopy turns pale pink, and the street below goes quiet. Walk while the color lasts — it is already leaving, petal by petal, into the wind.";

const FRAME_PAD_CLASS = "p-0";

function cn(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getScrollParent(el: HTMLElement): HTMLElement | Window {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    const canScroll =
      (oy === "auto" || oy === "scroll" || oy === "overlay") &&
      node.scrollHeight > node.clientHeight + 1;
    if (canScroll) {
      if (node === document.documentElement || node === document.body) {
        return window;
      }
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

function readScrollProgress(
  track: HTMLElement,
  scrollRoot: HTMLElement | Window,
): number {
  const useWindowScroll =
    !(scrollRoot instanceof HTMLElement) ||
    (typeof document !== "undefined" &&
      (scrollRoot === document.documentElement || scrollRoot === document.body));

  if (useWindowScroll) {
    const rect = track.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const scrollable = track.offsetHeight - vh;
    if (scrollable <= 0) return 1;
    return clamp01(-rect.top / scrollable);
  }

  const rootRect = scrollRoot.getBoundingClientRect();
  const trackRect = track.getBoundingClientRect();
  const scrollable = track.offsetHeight - scrollRoot.clientHeight;
  if (scrollable <= 0) return 1;
  return clamp01((rootRect.top - trackRect.top) / scrollable);
}

type TitleChar = {
  key: string;
  char: string;
  index: number;
  fromCenter: number;
};

function splitTitleChars(title: string): TitleChar[] {
  const chars = Array.from(title);
  const mid = Math.max(chars.length - 1, 1) / 2;
  return chars.map((char, index) => ({
    key: `${index}-${char === " " ? "sp" : char}`,
    char: char === " " ? "\u00A0" : char,
    index,
    fromCenter: mid <= 0 ? 0 : Math.abs(index - mid) / mid,
  }));
}

function charReveal(progress: number, fromCenter: number): number {
  const start = fromCenter * 0.55;
  const end = Math.min(1, start + 0.38);
  return clamp01((progress - start) / Math.max(0.001, end - start));
}

function SakuraFitTitle({
  title,
  revealProgress,
}: {
  title: string;
  revealProgress: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState<number | null>(null);
  const chars = splitTitleChars(title);
  const titleProgress = clamp01(revealProgress / 0.4);

  useEffect(() => {
    const wrap = wrapRef.current;
    const probe = probeRef.current;
    if (!wrap || !probe) return;

    const PROBE = 100;
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      const next = (wrap.clientWidth / Math.max(1, probe.scrollWidth)) * PROBE;
      if (!Number.isFinite(next) || next <= 0) return;
      setFontPx(next);
    };

    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const fonts = document.fonts;
    const onFonts = () => {
      void fonts?.ready.then(fit);
    };
    fonts?.addEventListener?.("loadingdone", onFonts);
    void (async () => {
      try {
        await fonts?.load?.("900 100px sans-serif");
      } catch {
        /* fallback metrics */
      }
      await fonts?.ready;
      fit();
    })();
    fit();

    return () => {
      cancelled = true;
      ro.disconnect();
      fonts?.removeEventListener?.("loadingdone", onFonts);
    };
  }, [title]);

  const titleStyle = {
    fontWeight: 900,
    letterSpacing: "-0.02em",
    WebkitFontSmoothing: "antialiased" as const,
    MozOsxFontSmoothing: "grayscale" as const,
    textRendering: "geometricPrecision" as const,
  };

  const metallicFill = {
    backgroundImage:
      "linear-gradient(185deg, #ffffff 0%, #f4f4f4 16%, #c5c5c5 38%, #ffffff 52%, #a8a8a8 72%, #e6e6e6 88%, #bdbdbd 100%)",
    WebkitBackgroundClip: "text" as const,
    backgroundClip: "text" as const,
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };

  return (
    <div
      ref={wrapRef}
      className="absolute inset-x-[4%] top-[19.5%] overflow-visible"
    >
      <span
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible absolute whitespace-nowrap font-sans font-black uppercase leading-none"
        style={{ ...titleStyle, fontSize: 100 }}
      >
        {title}
      </span>
      <h1
        className="m-0 overflow-visible whitespace-nowrap text-left font-sans font-black uppercase leading-none"
        style={{
          ...titleStyle,
          fontSize: fontPx != null ? `${fontPx}px` : "min(36cqw, 52cqh)",
          filter:
            "drop-shadow(0 1px 0 rgba(255,255,255,0.35)) drop-shadow(0 3px 6px rgba(0,0,0,0.45)) drop-shadow(0 14px 28px rgba(0,0,0,0.28))",
        }}
      >
        {chars.map((item) => {
          const t = charReveal(titleProgress, item.fromCenter);
          const y = (1 - t) * (18 + item.fromCenter * 24);
          const side = item.index < chars.length / 2 ? 1 : -1;
          const x =
            (1 - t) *
            (item.fromCenter > 0.01 ? item.fromCenter * 16 * side : 0);
          return (
            <span
              key={item.key}
              aria-hidden
              className="inline-block"
              style={{
                ...metallicFill,
                opacity: t,
                transform: `translate3d(${x}px, ${y}px, 0)`,
                WebkitTextStroke: "0.5px rgba(255,255,255,0.22)",
              }}
            >
              {item.char}
            </span>
          );
        })}
        <span className="sr-only">{title}</span>
      </h1>
    </div>
  );
}

function SakuraHeroVisual({
  title,
  sceneSrc,
  sceneSrcMobile,
  sceneAlt,
  foregroundSrc,
  foregroundAlt,
  revealProgress,
}: {
  title: string;
  sceneSrc: string;
  sceneSrcMobile?: string;
  sceneAlt: string;
  foregroundSrc: string | null;
  foregroundAlt: string;
  revealProgress: number;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Background collage — responsive desktop / mobile art */}
      <div className="absolute inset-0 z-0">
        <img
          src={sceneSrc}
          alt={sceneAlt}
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center",
            sceneSrcMobile ? "hidden md:block" : "block",
          )}
          draggable={false}
        />
        {sceneSrcMobile ? (
          <img
            src={sceneSrcMobile}
            alt={sceneAlt}
            className="absolute inset-0 block h-full w-full object-cover object-center md:hidden"
            draggable={false}
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Mid layer: title sits behind the bus */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <SakuraFitTitle title={title} revealProgress={revealProgress} />
      </div>

      {/* Foreground: bus overlaps the bottom tips of the title */}
      {foregroundSrc ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          <img
            src={foregroundSrc}
            alt={foregroundAlt}
            className="absolute inset-0 h-full w-full object-cover object-center"
            draggable={false}
          />
        </div>
      ) : null}
    </div>
  );
}

function SakuraEditorialCopy({
  keywordItems,
  headline,
  body,
  subheadline,
  footerLeft,
  footerCenter,
  footerRight,
  socialHandle,
}: {
  keywordItems: SakuraEditorialKeyword[];
  headline: string;
  body: string;
  subheadline: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  socialHandle?: string;
}) {
  return (
    <div className="relative flex min-h-[42%] flex-col border-0 bg-transparent p-[clamp(1.25rem,4.5cqw,2.5rem)] font-sans text-white">
      {/* Extends above the panel so the fade starts before the keyword row,
          keeping the text legible without a visible seam at the panel edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-[50%] bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
      />
      <div className="relative z-10 flex items-start justify-between gap-3 text-sm font-medium tracking-[0.16em] text-white/70 md:text-base">
        {keywordItems.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>

      <h2 className="relative z-10 mt-4 max-w-[90%] text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
        {headline}
      </h2>

      <p className="relative z-10 mt-3 max-w-[70%] text-lg font-normal leading-relaxed text-white/90 md:text-xl">
        {body}
      </p>

      <p className="relative z-10 mt-4 text-xl font-semibold leading-snug text-white md:text-2xl">
        {subheadline}
      </p>

      <div className="relative z-10 mt-auto flex items-end justify-between gap-3 pt-5 text-sm font-medium tracking-[0.08em] text-white/80 md:text-base">
        <span>{footerLeft}</span>
        <span>{footerCenter}</span>
        <span>{footerRight}</span>
      </div>

      {socialHandle ? (
        <span className="absolute bottom-3 right-[clamp(0.75rem,4.5cqw,2.5rem)] z-10 text-sm font-medium tracking-[0.04em] text-white/50 md:text-base">
          {socialHandle}
        </span>
      ) : null}
    </div>
  );
}

export function SakuraEditorialPoster({
  title = "SAKURA",
  keywords = SAKURA_EDITORIAL_DEFAULT_KEYWORDS,
  headline = "Petals Hold the Light | 花びらが光を抱く。",
  body = DEFAULT_BODY,
  subheadline = "Stay for the fall. 散るまで、見ていて。",
  footerLeft = "DesignLayer",
  footerCenter = "Vol. 01",
  footerRight = "03.26 2026",
  socialHandle = "@designlayer",
  sceneSrc = `${ASSET}/hero-scene-bg.jpg`,
  sceneSrcMobile,
  sceneAlt = "Soft bokeh cherry blossoms background",
  foregroundSrc = `${ASSET}/hero-branch.png?v=2`,
  foregroundAlt = "Cherry blossom branch in the foreground",
  height = "280vh",
  forceProgress,
  preview = false,
  className,
}: SakuraEditorialPosterProps) {
  const trackRef = useRef<HTMLElement>(null);
  const keywordItems = keywords.filter((item) => item.label.trim().length > 0);

  const locked = forceProgress != null && Number.isFinite(forceProgress);
  const [progress, setProgress] = useState(
    forceProgress != null ? clamp01(forceProgress) : 0,
  );
  const [stickyPx, setStickyPx] = useState<number | null>(null);

  const fillViewport = locked || preview;
  const trackHeight = fillViewport ? "auto" : height;
  const useSticky = !locked && !preview;

  useEffect(() => {
    if (locked || preview) {
      setProgress(clamp01(forceProgress ?? 0));
      setStickyPx(null);
      return;
    }

    const track = trackRef.current;
    if (!track) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setProgress(1);
      return;
    }

    const scrollRoot = getScrollParent(track);
    let target = 0;
    let current = 0;
    let raf = 0;

    const read = () => {
      const fromRoot = readScrollProgress(track, scrollRoot);
      if (scrollRoot === window) return fromRoot;
      const fromWindow = readScrollProgress(track, window);
      return Math.abs(fromWindow - fromRoot) > 0.02 ? fromWindow : fromRoot;
    };

    const loop = () => {
      const delta = target - current;
      current += Math.abs(delta) > 0.35 ? delta * 0.22 : delta * 0.14;
      if (Math.abs(delta) < 0.0008) current = target;
      setProgress(current);
      raf = window.requestAnimationFrame(loop);
    };

    const onScroll = () => {
      target = read();
    };

    const onResize = () => {
      if (scrollRoot === window) {
        setStickyPx(window.innerHeight);
      } else {
        setStickyPx((scrollRoot as HTMLElement).clientHeight);
      }
      target = read();
    };

    onResize();
    target = read();
    current = target;
    setProgress(current);

    const opts: AddEventListenerOptions = { passive: true };
    scrollRoot.addEventListener("scroll", onScroll, opts);
    window.addEventListener("resize", onResize);
    raf = window.requestAnimationFrame(loop);

    return () => {
      scrollRoot.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
    };
  }, [forceProgress, locked, preview]);

  const revealProgress = locked || preview ? clamp01(forceProgress ?? 0) : progress;
  const copyProgress = clamp01((revealProgress - 0.78) / 0.22);
  const copyOffset = `${(1 - copyProgress) * 100}%`;
  const panelHeight =
    useSticky && stickyPx != null
      ? stickyPx
      : fillViewport
        ? "100%"
        : ("100svh" as const);

  return (
    <section
      ref={trackRef}
      className={cn(
        "relative isolate w-full",
        fillViewport && "h-screen",
        className,
      )}
      style={{
        height: useSticky ? trackHeight : undefined,
      }}
    >
      <div
        className={cn(
          "box-border w-full overflow-hidden",
          FRAME_PAD_CLASS,
          useSticky ? "sticky top-0" : "relative",
        )}
        style={{ height: panelHeight }}
      >
        <article className="@container relative flex h-full w-full min-h-0 flex-col overflow-hidden">
          <div className="@container relative min-h-0 flex-1 overflow-hidden [container-type:size]">
            <SakuraHeroVisual
              title={title}
              sceneSrc={sceneSrc}
              sceneSrcMobile={sceneSrcMobile}
              sceneAlt={sceneAlt}
              foregroundSrc={foregroundSrc}
              foregroundAlt={foregroundAlt}
              revealProgress={revealProgress}
            />
          </div>

          <div
            className="absolute inset-x-0 bottom-0 z-30 will-change-transform"
            style={{ transform: `translate3d(0, ${copyOffset}, 0)` }}
          >
            <SakuraEditorialCopy
              keywordItems={keywordItems}
              headline={headline}
              body={body}
              subheadline={subheadline}
              footerLeft={footerLeft}
              footerCenter={footerCenter}
              footerRight={footerRight}
              socialHandle={socialHandle}
            />
          </div>
        </article>
      </div>
    </section>
  );
}

export default SakuraEditorialPoster;
