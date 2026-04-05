import { setup, assign } from "xstate";
import type { EpicContext, EpicEvent, DispatchType } from "./types";
import {
  hasFeatures,
  allFeaturesCompleted,
  outputCompleted,
  canRegress,
  regressTargetsPlan,
  regressTargetsImplement,
  regressTargetsValidate,
  regressTargetsRelease,
  hasFailingFeatures,
} from "./guards";
import {
  computeEnrichFeatures,
  computeRenameSlug,
  computeSetSummary,
  computeSetFeatures,
  computeResetFeatures,
  computeMarkFeatureCompleted,
  computeRegress,
  computeRegressFeatures,
  computeAccumulateArtifacts,
} from "./actions";
import { syncGitHubService } from "./services";

export const epicMachine = setup({
  types: {
    context: {} as EpicContext,
    events: {} as EpicEvent,
    input: {} as EpicContext,
  },
  guards: {
    hasFeatures,
    allFeaturesCompleted,
    outputCompleted,
    canRegress,
    regressTargetsPlan,
    regressTargetsImplement,
    regressTargetsValidate,
    regressTargetsRelease,
    hasFailingFeatures,
  },
  actions: {
    enrichManifest: assign({
      features: ({ context, event }) => computeEnrichFeatures(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    renameSlug: assign({
      slug: ({ context, event }) => computeRenameSlug(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    setSummary: assign({
      summary: ({ context, event }) => computeSetSummary(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    setFeatures: assign({
      features: ({ event }) => computeSetFeatures(event),
      updated_at: () => new Date().toISOString(),
    }),
    resetFeatures: assign({
      features: ({ context }) => computeResetFeatures(context),
      updated_at: () => new Date().toISOString(),
    }),
    applyRegress: assign(({ context, event }) => {
      const result = computeRegress(context, event);
      return {
        ...result,
        updated_at: new Date().toISOString(),
      };
    }),
    applyRegressFeatures: assign(({ context, event }) => {
      const result = computeRegressFeatures(context, event);
      return {
        ...result,
        updated_at: new Date().toISOString(),
      };
    }),
    markCancelled: assign({
      updated_at: () => new Date().toISOString(),
    }),
    markFeatureCompleted: assign({
      features: ({ context, event }) => computeMarkFeatureCompleted(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    accumulateArtifacts: assign({
      artifacts: ({ context, event }) => computeAccumulateArtifacts(context, event),
      updated_at: () => new Date().toISOString(),
    }),
    persist: () => {
      // Side-effect stub — consumer provides real implementation
    },
  },
  actors: {
    syncGitHub: syncGitHubService,
  },
}).createMachine({
  id: "epic",
  initial: "design",
  context: ({ input }) => input,
  states: {
    design: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        DESIGN_COMPLETED: {
          target: "plan",
          actions: ["renameSlug", "setSummary", "accumulateArtifacts", "persist"],
        },
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    plan: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        PLAN_COMPLETED: {
          target: "implement",
          guard: "hasFeatures",
          actions: ["setFeatures", "accumulateArtifacts", "persist"],
        },
        REGRESS: [
          {
            target: "plan",
            guard: { type: "canRegress" },
            actions: ["applyRegress", "persist"],
          },
        ],
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    implement: {
      meta: { dispatchType: "fan-out" as DispatchType },
      on: {
        FEATURE_COMPLETED: {
          actions: ["markFeatureCompleted", "persist"],
        },
        IMPLEMENT_COMPLETED: {
          target: "validate",
          guard: "allFeaturesCompleted",
          actions: ["persist"],
        },
        REGRESS: [
          {
            target: "plan",
            guard: { type: "regressTargetsPlan" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "implement",
            guard: { type: "canRegress" },
            actions: ["applyRegress", "persist"],
          },
        ],
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    validate: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        VALIDATE_COMPLETED: {
          target: "release",
          actions: ["persist"],
        },
        REGRESS_FEATURES: {
          target: "implement",
          guard: "hasFailingFeatures",
          actions: ["applyRegressFeatures", "persist"],
        },
        REGRESS: [
          {
            target: "plan",
            guard: { type: "regressTargetsPlan" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "implement",
            guard: { type: "regressTargetsImplement" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "validate",
            guard: { type: "canRegress" },
            actions: ["applyRegress", "persist"],
          },
        ],
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    release: {
      meta: { dispatchType: "single" as DispatchType },
      on: {
        RELEASE_COMPLETED: {
          target: "done",
          actions: ["persist"],
        },
        REGRESS: [
          {
            target: "plan",
            guard: { type: "regressTargetsPlan" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "implement",
            guard: { type: "regressTargetsImplement" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "validate",
            guard: { type: "regressTargetsValidate" },
            actions: ["applyRegress", "persist"],
          },
          {
            target: "release",
            guard: { type: "canRegress" },
            actions: ["applyRegress", "persist"],
          },
        ],
        CANCEL: {
          target: "cancelled",
          actions: ["markCancelled", "persist"],
        },
      },
    },
    done: {
      meta: { dispatchType: "skip" as DispatchType },
      type: "final",
    },
    cancelled: {
      meta: { dispatchType: "skip" as DispatchType },
      type: "final",
    },
  },
});
