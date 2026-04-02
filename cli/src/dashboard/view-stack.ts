// View types — discriminated union

export type EpicList = {
  readonly type: "epic-list";
};

export type FeatureList = {
  readonly type: "feature-list";
  readonly epicSlug: string;
};

export type AgentLog = {
  readonly type: "agent-log";
  readonly epicSlug: string;
  readonly featureSlug: string;
};

export type ViewType = EpicList | FeatureList | AgentLog;

// Stack is just an array of views, bottom-first
export type ViewStack = readonly ViewType[];

/** Returns a fresh stack with the root epic-list view. */
export function createStack(): ViewStack {
  return [{ type: "epic-list" }];
}

/** Returns a new stack with the given view pushed on top. */
export function push(stack: ViewStack, view: ViewType): ViewStack {
  return [...stack, view];
}

/** Returns a new stack with the top view removed. No-op if at root. */
export function pop(stack: ViewStack): ViewStack {
  if (stack.length <= 1) return stack;
  return stack.slice(0, -1);
}

/** Returns the top (last) element of the stack. */
export function peek(stack: ViewStack): ViewType {
  return stack[stack.length - 1];
}

/** Derives a breadcrumb string from the current stack state. */
export function crumbBar(stack: ViewStack): string {
  const top = peek(stack);

  switch (top.type) {
    case "epic-list":
      return "epics";
    case "feature-list":
      return `epics > ${top.epicSlug}`;
    case "agent-log":
      return `epics > ${top.epicSlug} > ${top.featureSlug}`;
  }
}
