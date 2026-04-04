import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { nyanColor } from "./nyan-colors.js";

const BANNER_LINES = [
  "█▄▄ █▀▀ ▄▀█ █▀▀ ▀█▀ █▀▄▀█ █▀█ █▀▄ █▀▀",
  "█▄█ ██▄ █▀█ ▄▄█  █  █ ▀ █ █▄█ █▄▀ ██▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄",
];

const TICK_INTERVAL_MS = 80;

export default function NyanBanner() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column">
      {BANNER_LINES.map((line, lineIndex) => (
        <Text key={lineIndex}>
          {[...line].map((char, charIndex) => {
            const color = nyanColor(char, charIndex, tick);
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
