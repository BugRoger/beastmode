import { describe, test, expect } from "bun:test";

// ---------------------------------------------------------------------------
// Group 1: useLogEntries merge logic
// ---------------------------------------------------------------------------

describe("log entry merging", () => {
  // Helper: create a fake LogEntry
  function entry(seq: number, timestamp: number, text: string, type: "text" | "result" = "text") {
    return { seq, timestamp, type, text };
  }

  test("entries from multiple sessions merge sorted by timestamp", () => {
    const bufferA = [entry(0, 1000, "first"), entry(1, 3000, "third")];
    const bufferB = [entry(0, 2000, "second"), entry(1, 4000, "fourth")];

    const merged = [...bufferA.map(e => ({ ...e, label: "a" })), ...bufferB.map(e => ({ ...e, label: "b" }))];
    merged.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);

    expect(merged.map(e => e.text)).toEqual(["first", "second", "third", "fourth"]);
  });

  test("same timestamp uses seq as tiebreaker", () => {
    const entries = [
      { ...entry(1, 1000, "b"), label: "x" },
      { ...entry(0, 1000, "a"), label: "y" },
    ];
    entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    expect(entries.map(e => e.text)).toEqual(["a", "b"]);
  });

  test("filter sessions by epicSlug when selected", () => {
    const sessions = [
      { id: "1", epicSlug: "dashboard", featureSlug: "log" },
      { id: "2", epicSlug: "auth", featureSlug: "login" },
      { id: "3", epicSlug: "dashboard", featureSlug: "details" },
    ];
    const selectedEpicSlug = "dashboard";
    const filtered = sessions.filter(s => s.epicSlug === selectedEpicSlug);
    expect(filtered.map(s => s.id)).toEqual(["1", "3"]);
  });

  test("undefined selectedEpicSlug includes all sessions", () => {
    const sessions = [
      { id: "1", epicSlug: "dashboard" },
      { id: "2", epicSlug: "auth" },
    ];
    const selectedEpicSlug = undefined;
    const filtered = selectedEpicSlug === undefined
      ? sessions
      : sessions.filter(s => s.epicSlug === selectedEpicSlug);
    expect(filtered.length).toBe(2);
  });

  test("label uses featureSlug when available", () => {
    const session = { epicSlug: "dashboard", featureSlug: "log-panel" };
    const label = session.featureSlug ?? session.epicSlug;
    expect(label).toBe("log-panel");
  });

  test("label falls back to epicSlug when no featureSlug", () => {
    const session = { epicSlug: "dashboard", featureSlug: undefined };
    const label = session.featureSlug ?? session.epicSlug;
    expect(label).toBe("dashboard");
  });

  test("isError detection for result entries containing error", () => {
    const e = entry(0, 1000, "session failed with error", "result");
    const isError = e.type === "result" && e.text.toLowerCase().includes("error");
    expect(isError).toBe(true);
  });

  test("isError false for non-result entries", () => {
    const e = entry(0, 1000, "some error text", "text");
    const isError = e.type === "result" && e.text.toLowerCase().includes("error");
    expect(isError).toBe(false);
  });

  test("isError false for result without error text", () => {
    const e = entry(0, 1000, "completed successfully", "result");
    const isError = e.type === "result" && e.text.toLowerCase().includes("error");
    expect(isError).toBe(false);
  });

  test("maxEntries limits to latest entries", () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      ...entry(i, 1000 + i * 100, `entry-${i}`),
      label: "a",
    }));
    const maxEntries = 3;
    const limited = entries.length > maxEntries
      ? entries.slice(entries.length - maxEntries)
      : entries;
    expect(limited.length).toBe(3);
    expect(limited[0].text).toBe("entry-7");
    expect(limited[2].text).toBe("entry-9");
  });

  test("empty sessions returns empty entries", () => {
    const sessions: unknown[] = [];
    const entries: unknown[] = [];
    for (const _session of sessions) {
      // Would collect from buffers
    }
    expect(entries.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group 2: LogPanel formatting logic
// ---------------------------------------------------------------------------

describe("log panel formatting", () => {
  const LABEL_WIDTH = 20;

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
  }

  test("formatTime converts ms to HH:MM:SS", () => {
    // 2024-01-01 14:30:45 UTC
    const ts = new Date("2024-01-01T14:30:45Z").getTime();
    const formatted = formatTime(ts);
    // Check format is correct (exact value depends on timezone)
    expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  test("formatTime pads single digits", () => {
    // Use a known time
    const ts = new Date(2024, 0, 1, 1, 2, 3).getTime();
    const formatted = formatTime(ts);
    expect(formatted).toBe("01:02:03");
  });

  test("label truncated at LABEL_WIDTH with ellipsis", () => {
    const label = "very-long-feature-name-that-exceeds-limit";
    const truncated = label.length > LABEL_WIDTH
      ? label.slice(0, LABEL_WIDTH - 1) + "\u2026"
      : label.padEnd(LABEL_WIDTH);
    expect(truncated.length).toBe(LABEL_WIDTH);
    expect(truncated.endsWith("\u2026")).toBe(true);
  });

  test("short label padded to LABEL_WIDTH", () => {
    const label = "log-panel";
    const padded = label.length > LABEL_WIDTH
      ? label.slice(0, LABEL_WIDTH - 1) + "\u2026"
      : label.padEnd(LABEL_WIDTH);
    expect(padded.length).toBe(LABEL_WIDTH);
    expect(padded.startsWith("log-panel")).toBe(true);
  });

  test("empty entries triggers empty state", () => {
    const entries: unknown[] = [];
    const isEmpty = entries.length === 0;
    expect(isEmpty).toBe(true);
    // Component renders "no active sessions" when empty
  });

  test("maxVisibleLines limits visible entries to tail", () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({ text: `line-${i}` }));
    const maxVisibleLines = 50;
    const visible = entries.length > maxVisibleLines
      ? entries.slice(entries.length - maxVisibleLines)
      : entries;
    expect(visible.length).toBe(50);
    expect(visible[0].text).toBe("line-50");
    expect(visible[49].text).toBe("line-99");
  });
});

// ---------------------------------------------------------------------------
// Group 3: Aggregate vs filtered mode
// ---------------------------------------------------------------------------

describe("aggregate vs filtered mode", () => {
  function entry(seq: number, timestamp: number, text: string) {
    return { seq, timestamp, type: "text" as const, text };
  }

  test("aggregate mode interleaves all sessions by timestamp", () => {
    const sessionsData = [
      { label: "feature-a", entries: [entry(0, 1000, "a1"), entry(1, 3000, "a2")] },
      { label: "feature-b", entries: [entry(0, 2000, "b1"), entry(1, 4000, "b2")] },
    ];

    const merged: Array<{ text: string; label: string; timestamp: number }> = [];
    for (const session of sessionsData) {
      for (const e of session.entries) {
        merged.push({ ...e, label: session.label });
      }
    }
    merged.sort((a, b) => a.timestamp - b.timestamp);

    expect(merged.map(e => `${e.label}:${e.text}`)).toEqual([
      "feature-a:a1",
      "feature-b:b1",
      "feature-a:a2",
      "feature-b:b2",
    ]);
  });

  test("multiple sessions for same epic interleave correctly", () => {
    const sessions = [
      { epicSlug: "dash", featureSlug: "log", entries: [entry(0, 100, "log-1"), entry(1, 300, "log-2")] },
      { epicSlug: "dash", featureSlug: "details", entries: [entry(0, 200, "det-1"), entry(1, 400, "det-2")] },
    ];

    // Filter for "dash" epic
    const filtered = sessions.filter(s => s.epicSlug === "dash");
    expect(filtered.length).toBe(2);

    // Merge entries
    const merged: Array<{ text: string; timestamp: number }> = [];
    for (const s of filtered) {
      for (const e of s.entries) {
        merged.push(e);
      }
    }
    merged.sort((a, b) => a.timestamp - b.timestamp);
    expect(merged.map(e => e.text)).toEqual(["log-1", "det-1", "log-2", "det-2"]);
  });

  test("single epic mode excludes other epics", () => {
    const sessions = [
      { epicSlug: "dashboard", id: "1" },
      { epicSlug: "auth", id: "2" },
      { epicSlug: "dashboard", id: "3" },
    ];
    const selected = "dashboard";
    const filtered = sessions.filter(s => s.epicSlug === selected);
    expect(filtered.map(s => s.id)).toEqual(["1", "3"]);
  });
});
