/**
 * View stack for drill-down navigation in the dashboard.
 * Maintains breadcrumb history and navigation state.
 */

/** Base view type. */
export interface BaseView {
  type: string;
}

/** Epic list view — shows all epics in a table. */
export interface EpicListView extends BaseView {
  type: "epic-list";
}

/** Feature list view — shows features within an epic. */
export interface FeatureListView extends BaseView {
  type: "feature-list";
  epicSlug: string;
}

/** Agent log view — shows detailed logs for a feature. */
export interface AgentLogView extends BaseView {
  type: "agent-log";
  epicSlug: string;
  featureSlug: string;
}

/** Union of all view types. */
export type View = EpicListView | FeatureListView | AgentLogView;

/** Type synonym for clarity. */
export type FeatureList = FeatureListView;

/** Stack of views for navigation history. */
export type ViewStack = View[];

/** Initial view stack (home view). */
export const createStack: ViewStack = [{ type: "epic-list" } as EpicListView];

/** Get the top view from the stack. */
export function peek(stack: ViewStack): View {
  return stack[stack.length - 1] ?? createStack[0]!;
}

/** Push a new view onto the stack. */
export function push(stack: ViewStack, view: View): ViewStack {
  return [...stack, view];
}

/** Pop the top view from the stack. */
export function pop(stack: ViewStack): ViewStack {
  if (stack.length <= 1) return stack; // Never pop the last view
  return stack.slice(0, -1);
}

/** Breadcrumb entry. */
export interface CrumbEntry {
  label: string;
  view: View;
}

/** Generate breadcrumbs from the view stack. */
export function crumbBar(stack: ViewStack): CrumbEntry[] {
  const crumbs: CrumbEntry[] = [];
  for (const view of stack) {
    switch (view.type) {
      case "epic-list":
        crumbs.push({ label: "Epics", view });
        break;
      case "feature-list":
        crumbs.push({ label: (view as FeatureListView).epicSlug, view });
        break;
      case "agent-log": {
        const v = view as AgentLogView;
        crumbs.push({ label: `${v.epicSlug}/${v.featureSlug}`, view });
        break;
      }
    }
  }
  return crumbs;
}
