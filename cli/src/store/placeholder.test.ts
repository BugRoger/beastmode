import { describe, it, expect } from "vitest";
import { generatePlaceholderName, ADJECTIVES, NOUNS } from "./placeholder.js";

describe("generatePlaceholderName", () => {
  it("returns a string matching adjective-noun-hex pattern", () => {
    const name = generatePlaceholderName("a1b2");
    expect(name).toMatch(/^[a-z]+-[a-z]+-[0-9a-f]{4}$/);
  });

  it("embeds the provided hex suffix", () => {
    const name = generatePlaceholderName("f3a7");
    expect(name).toMatch(/-f3a7$/);
  });

  it("uses a word from the adjective list", () => {
    const name = generatePlaceholderName("1234");
    const adj = name.split("-")[0];
    expect(ADJECTIVES).toContain(adj);
  });

  it("uses a word from the noun list", () => {
    const name = generatePlaceholderName("1234");
    const noun = name.split("-")[1];
    expect(NOUNS).toContain(noun);
  });

  it("produces deterministic output for the same hex input", () => {
    const a = generatePlaceholderName("abcd");
    const b = generatePlaceholderName("abcd");
    expect(a).toBe(b);
  });

  it("produces different names for different hex inputs", () => {
    const a = generatePlaceholderName("0001");
    const b = generatePlaceholderName("0002");
    expect(a).not.toBe(b);
  });

  it("contains human-readable words, not bare hex", () => {
    const name = generatePlaceholderName("beef");
    expect(/[a-z]{3,}/.test(name)).toBe(true);
    expect(/^[0-9a-f]+$/.test(name)).toBe(false);
  });
});

describe("word lists", () => {
  it("has at least 50 adjectives", () => {
    expect(ADJECTIVES.length).toBeGreaterThanOrEqual(50);
  });

  it("has at least 50 nouns", () => {
    expect(NOUNS.length).toBeGreaterThanOrEqual(50);
  });

  it("all adjectives are lowercase alpha only", () => {
    for (const adj of ADJECTIVES) {
      expect(adj).toMatch(/^[a-z]+$/);
    }
  });

  it("all nouns are lowercase alpha only", () => {
    for (const noun of NOUNS) {
      expect(noun).toMatch(/^[a-z]+$/);
    }
  });
});
