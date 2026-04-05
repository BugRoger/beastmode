import { useState, useEffect, useRef } from "react";
import { Box, Text, measureElement } from "ink";
import { nyanColor } from "./nyan-colors.js";
import { DEPTH } from "./monokai-palette.js";

/** Base banner text (without trailing dots). */
const BANNER_LINE_1 = " █▄▄ █▀▀ ▄▀█ █▀▀ ▀█▀ █▀▄▀█ █▀█ █▀▄ █▀▀";
const BANNER_LINE_2 = " █▄█ ██▄ █▀█ ▄▄█  █  █ ▀ █ █▄█ █▄▀ ██▄";

export const TICK_INTERVAL_MS = 80;
const DOTS_START = BANNER_LINE_2.length;
const FULL_DOTS = 15;
const FADE_DOTS = 25;

/** Linearly interpolate a hex color toward the terminal background by factor (0–1). */
function fadeToBg(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const bg = parseInt(DEPTH.bg.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) + (((bg >> 16) & 0xff) - ((n >> 16) & 0xff)) * factor);
  const g = Math.round(((n >> 8) & 0xff) + (((bg >> 8) & 0xff) - ((n >> 8) & 0xff)) * factor);
  const b = Math.round((n & 0xff) + ((bg & 0xff) - (n & 0xff)) * factor);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

export interface NyanBannerProps {
  /** External tick value. When provided, internal timer is disabled. */
  tick?: number;
}

export default function NyanBanner({ tick: externalTick }: NyanBannerProps = {}) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  const [internalTick, setInternalTick] = useState(0);

  const tick = externalTick ?? internalTick;

  useEffect(() => {
    if (externalTick !== undefined) return;
    const timer = setInterval(() => {
      setInternalTick((prev) => prev + 1);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [externalTick !== undefined]);

  useEffect(() => {
    if (ref.current) {
      const measured = measureElement(ref.current).width;
      if (measured !== w) setW(measured);
    }
  });

  // Extend line 2: visible dots (15 full + 15 fade), then spaces
  let line2 = BANNER_LINE_2;
  if (w > BANNER_LINE_2.length) {
    const maxDots = FULL_DOTS + FADE_DOTS;
    let dotCount = 0;
    while (line2.length < w) {
      line2 += dotCount < maxDots ? " ▄" : "  ";
      dotCount++;
    }
  }

  return (
    <Box ref={ref} flexDirection="column" flexGrow={1}>
      {[BANNER_LINE_1, line2].map((line, lineIndex) => (
        <Text key={lineIndex}>
          {[...line].map((char, charIndex) => {
            let color = nyanColor(char, charIndex, tick);
            // Fade dots to black after the first 15
            if (color && charIndex >= DOTS_START) {
              const dotNum = Math.floor((charIndex - DOTS_START) / 2);
              if (dotNum >= FULL_DOTS) {
                const fade = Math.min(1, (dotNum - FULL_DOTS) / FADE_DOTS);
                color = fadeToBg(color, fade);
              }
            }
            return color ? (
              <Text key={charIndex} color={color}>
                {char}
              </Text>
            ) : (
              char
            );
          })}
        </Text>
      ))}
    </Box>
  );
}
