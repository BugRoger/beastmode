import { useState, useEffect } from "react";

export interface TerminalSize {
  columns: number;
  rows: number;
}

/** Hook that tracks terminal dimensions, updating on resize. */
export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(() => ({
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  }));

  useEffect(() => {
    const onResize = () => {
      setSize({
        columns: process.stdout.columns ?? 80,
        rows: process.stdout.rows ?? 24,
      });
    };

    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);

  return size;
}
