import { describe, test, expect } from "bun:test";
import {
  createStack,
  push,
  pop,
  peek,
  crumbBar,
  type ViewType,
} from "../dashboard/view-stack";

describe("createStack", () => {
  test("returns array with single epic-list view", () => {
    const stack = createStack();
    expect(stack).toHaveLength(1);
    expect(stack[0]).toEqual({ type: "epic-list" });
  });
});

describe("push", () => {
  test("adds view to top of stack", () => {
    const stack = createStack();
    const view: ViewType = { type: "feature-list", epicSlug: "abc" };
    const next = push(stack, view);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual(view);
  });

  test("does not mutate original stack (immutability)", () => {
    const stack = createStack();
    const view: ViewType = { type: "feature-list", epicSlug: "abc" };
    push(stack, view);
    expect(stack).toHaveLength(1);
  });
});

describe("pop", () => {
  test("removes top view and returns new stack", () => {
    const stack = push(createStack(), {
      type: "feature-list",
      epicSlug: "abc",
    });
    const popped = pop(stack);
    expect(popped).toHaveLength(1);
    expect(popped[0]).toEqual({ type: "epic-list" });
  });

  test("at root returns same reference (no-op)", () => {
    const stack = createStack();
    const popped = pop(stack);
    expect(popped).toBe(stack);
  });
});

describe("peek", () => {
  test("returns the top element", () => {
    const stack = createStack();
    expect(peek(stack)).toEqual({ type: "epic-list" });
  });

  test("returns the just-pushed element", () => {
    const view: ViewType = { type: "feature-list", epicSlug: "xyz" };
    const stack = push(createStack(), view);
    expect(peek(stack)).toEqual(view);
  });
});

describe("crumbBar", () => {
  test("depth 1 (epic-list) returns 'epics'", () => {
    const stack = createStack();
    expect(crumbBar(stack)).toBe("epics");
  });

  test("depth 2 (feature-list) returns 'epics > {slug}'", () => {
    const stack = push(createStack(), {
      type: "feature-list",
      epicSlug: "my-epic",
    });
    expect(crumbBar(stack)).toBe("epics > my-epic");
  });

  test("depth 3 (agent-log) returns 'epics > {slug} > {feature}'", () => {
    let stack = push(createStack(), {
      type: "feature-list",
      epicSlug: "my-epic",
    });
    stack = push(stack, {
      type: "agent-log",
      epicSlug: "my-epic",
      featureSlug: "feat-1",
    });
    expect(crumbBar(stack)).toBe("epics > my-epic > feat-1");
  });
});

describe("full navigation cycle", () => {
  test("create -> push feature -> push agent -> pop -> pop -> back at root", () => {
    const root = createStack();

    const withFeature = push(root, {
      type: "feature-list",
      epicSlug: "e1",
    });
    expect(peek(withFeature)).toEqual({ type: "feature-list", epicSlug: "e1" });

    const withAgent = push(withFeature, {
      type: "agent-log",
      epicSlug: "e1",
      featureSlug: "f1",
    });
    expect(peek(withAgent)).toEqual({
      type: "agent-log",
      epicSlug: "e1",
      featureSlug: "f1",
    });

    const backToFeature = pop(withAgent);
    expect(peek(backToFeature)).toEqual({
      type: "feature-list",
      epicSlug: "e1",
    });

    const backToRoot = pop(backToFeature);
    expect(peek(backToRoot)).toEqual({ type: "epic-list" });
    expect(backToRoot).toHaveLength(1);
  });
});
