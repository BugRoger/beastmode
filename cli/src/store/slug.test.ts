import { describe, it, expect } from "bun:test";
import { slugify, isValidSlug } from "./slug.js";

describe("slugify", () => {
  it("should lowercase and hyphenate", () => {
    expect(slugify("Login Flow")).toBe("login-flow");
  });

  it("should strip special characters", () => {
    expect(slugify("Login Flow!")).toBe("login-flow");
  });

  it("should collapse multiple hyphens", () => {
    expect(slugify("a--b---c")).toBe("a-b-c");
  });

  it("should strip leading and trailing hyphens", () => {
    expect(slugify("-hello-")).toBe("hello");
  });

  it("should throw on empty input", () => {
    expect(() => slugify("")).toThrow("Cannot slugify");
  });

  it("should throw on all-special-character input", () => {
    expect(() => slugify("!!!")).toThrow("Cannot slugify");
  });

  it("should preserve already-valid slugs", () => {
    expect(slugify("auth-system")).toBe("auth-system");
  });
});

describe("isValidSlug", () => {
  it("should accept valid slugs", () => {
    expect(isValidSlug("auth-system")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
    expect(isValidSlug("abc123")).toBe(true);
  });

  it("should reject leading hyphens", () => {
    expect(isValidSlug("-auth")).toBe(false);
  });

  it("should reject trailing hyphens", () => {
    expect(isValidSlug("auth-")).toBe(false);
  });

  it("should reject uppercase", () => {
    expect(isValidSlug("Auth")).toBe(false);
  });

  it("should reject special characters", () => {
    expect(isValidSlug("auth!system")).toBe(false);
  });

  it("should reject empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("should accept dots for feature ID suffixes", () => {
    expect(isValidSlug("auth-flow.2")).toBe(true);
    expect(isValidSlug("auth-flow-a3f2.2")).toBe(true);
  });

  it("should reject leading dot", () => {
    expect(isValidSlug(".auth")).toBe(false);
  });

  it("should reject trailing dot", () => {
    expect(isValidSlug("auth.")).toBe(false);
  });

  it("should accept dot in the middle", () => {
    expect(isValidSlug("a.b")).toBe(true);
  });
});
