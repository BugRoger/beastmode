import { describe, test, expect } from "bun:test";
import { RingBuffer, SessionEmitter } from "../dispatch/factory.js";
import type { LogEntry } from "../dispatch/factory.js";

describe("RingBuffer", () => {
  test("stores entries up to capacity", () => {
    const buf = new RingBuffer(3);
    buf.push({ timestamp: 1, type: "text", text: "a" });
    buf.push({ timestamp: 2, type: "text", text: "b" });
    buf.push({ timestamp: 3, type: "text", text: "c" });

    expect(buf.size).toBe(3);
    const entries = buf.toArray();
    expect(entries.map((e) => e.text)).toEqual(["a", "b", "c"]);
  });

  test("evicts oldest when over capacity", () => {
    const buf = new RingBuffer(2);
    buf.push({ timestamp: 1, type: "text", text: "a" });
    buf.push({ timestamp: 2, type: "text", text: "b" });
    buf.push({ timestamp: 3, type: "text", text: "c" });

    expect(buf.size).toBe(2);
    const entries = buf.toArray();
    expect(entries.map((e) => e.text)).toEqual(["b", "c"]);
  });

  test("assigns monotonic sequence numbers", () => {
    const buf = new RingBuffer(5);
    const e1 = buf.push({ timestamp: 1, type: "text", text: "a" });
    const e2 = buf.push({ timestamp: 2, type: "text", text: "b" });
    const e3 = buf.push({ timestamp: 3, type: "text", text: "c" });

    expect(e1.seq).toBe(0);
    expect(e2.seq).toBe(1);
    expect(e3.seq).toBe(2);
  });

  test("sequence numbers continue after eviction", () => {
    const buf = new RingBuffer(2);
    buf.push({ timestamp: 1, type: "text", text: "a" }); // seq 0
    buf.push({ timestamp: 2, type: "text", text: "b" }); // seq 1
    const e3 = buf.push({ timestamp: 3, type: "text", text: "c" }); // seq 2

    expect(e3.seq).toBe(2);
    expect(buf.toArray()[0].seq).toBe(1); // oldest is seq 1
  });

  test("clear resets the buffer", () => {
    const buf = new RingBuffer(5);
    buf.push({ timestamp: 1, type: "text", text: "a" });
    buf.push({ timestamp: 2, type: "text", text: "b" });

    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  test("empty buffer returns empty array", () => {
    const buf = new RingBuffer(5);
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });
});

describe("SessionEmitter", () => {
  test("pushEntry stores in buffer and emits", () => {
    const emitter = new SessionEmitter(10);
    const received: LogEntry[] = [];
    emitter.on("entry", (entry) => received.push(entry));

    emitter.pushEntry({ timestamp: 1, type: "text", text: "hello" });

    expect(received.length).toBe(1);
    expect(received[0].text).toBe("hello");
    expect(received[0].seq).toBe(0);
    expect(emitter.bufferSize).toBe(1);
  });

  test("getBuffer returns snapshot of all entries", () => {
    const emitter = new SessionEmitter(10);
    emitter.pushEntry({ timestamp: 1, type: "text", text: "a" });
    emitter.pushEntry({ timestamp: 2, type: "tool-start", text: "[Read] foo.ts" });
    emitter.pushEntry({ timestamp: 3, type: "tool-result", text: "> 3 lines" });

    const buf = emitter.getBuffer();
    expect(buf.length).toBe(3);
    expect(buf.map((e) => e.type)).toEqual(["text", "tool-start", "tool-result"]);
  });

  test("buffer collects even without listeners", () => {
    const emitter = new SessionEmitter(10);
    // No listeners attached
    emitter.pushEntry({ timestamp: 1, type: "text", text: "silent" });
    emitter.pushEntry({ timestamp: 2, type: "heartbeat", text: "..." });

    expect(emitter.bufferSize).toBe(2);
    expect(emitter.getBuffer().map((e) => e.text)).toEqual(["silent", "..."]);
  });

  test("complete emits done event", () => {
    const emitter = new SessionEmitter(10);
    const doneEvents: Array<{ success: boolean }> = [];
    emitter.on("done", (payload) => doneEvents.push(payload));

    emitter.complete(true);
    expect(doneEvents).toEqual([{ success: true }]);
  });

  test("respects buffer capacity", () => {
    const emitter = new SessionEmitter(3);
    for (let i = 0; i < 5; i++) {
      emitter.pushEntry({ timestamp: i, type: "text", text: `msg-${i}` });
    }

    expect(emitter.bufferSize).toBe(3);
    expect(emitter.getBuffer().map((e) => e.text)).toEqual(["msg-2", "msg-3", "msg-4"]);
  });
});
