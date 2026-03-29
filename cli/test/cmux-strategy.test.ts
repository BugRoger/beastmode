import { describe, it, expect } from "bun:test";
import { CmuxStrategy } from "../src/cmux-strategy.js";
import type { ICmuxClient, CmuxWorkspace, CmuxSurface } from "../src/cmux-client.js";

/** Minimal mock of ICmuxClient — only the methods cleanup() uses. */
function mockClient(overrides: Partial<ICmuxClient> = {}): ICmuxClient {
  return {
    ping: async () => true,
    createWorkspace: async (name) => ({ name, surfaces: [] }),
    listWorkspaces: async () => [],
    closeWorkspace: async () => {},
    createSurface: async (ws, name) => ({ name, workspace: ws }),
    sendText: async () => {},
    closeSurface: async () => {},
    getSurface: async () => null,
    notify: async () => {},
    ...overrides,
  };
}

describe("CmuxStrategy", () => {
  describe("cleanup", () => {
    it("calls closeWorkspace with the registered workspace name", async () => {
      const closedWorkspaces: string[] = [];
      const client = mockClient({
        closeWorkspace: async (name) => { closedWorkspaces.push(name); },
      });

      const strategy = new CmuxStrategy(client);
      strategy.registerWorkspace("my-epic", "bm-my-epic");

      await strategy.cleanup("my-epic");

      expect(closedWorkspaces).toEqual(["bm-my-epic"]);
    });

    it("removes the workspace from the internal map after cleanup", async () => {
      const client = mockClient();
      const strategy = new CmuxStrategy(client);
      strategy.registerWorkspace("my-epic", "bm-my-epic");

      await strategy.cleanup("my-epic");

      expect(strategy.getWorkspace("my-epic")).toBeUndefined();
    });

    it("handles missing epicSlug gracefully (no throw)", async () => {
      const closedWorkspaces: string[] = [];
      const client = mockClient({
        closeWorkspace: async (name) => { closedWorkspaces.push(name); },
      });

      const strategy = new CmuxStrategy(client);
      // No workspace registered for this epic
      await strategy.cleanup("unknown-epic");

      // closeWorkspace should not have been called
      expect(closedWorkspaces).toHaveLength(0);
    });

    it("handles cmux errors gracefully (warning, not throw)", async () => {
      const client = mockClient({
        closeWorkspace: async () => { throw new Error("cmux is not running"); },
      });

      const strategy = new CmuxStrategy(client);
      strategy.registerWorkspace("my-epic", "bm-my-epic");

      // Should not throw
      await strategy.cleanup("my-epic");

      // Should still remove from map
      expect(strategy.getWorkspace("my-epic")).toBeUndefined();
    });

    it("handles already-closed workspace gracefully", async () => {
      // closeWorkspace already handles "not found" in CmuxClient — returns void.
      // So this should just work.
      const client = mockClient({
        closeWorkspace: async () => {
          // Simulates CmuxClient's already-closed handling — resolves void
        },
      });

      const strategy = new CmuxStrategy(client);
      strategy.registerWorkspace("my-epic", "bm-my-epic");

      await strategy.cleanup("my-epic");

      expect(strategy.getWorkspace("my-epic")).toBeUndefined();
    });

    it("can clean up multiple epics independently", async () => {
      const closedWorkspaces: string[] = [];
      const client = mockClient({
        closeWorkspace: async (name) => { closedWorkspaces.push(name); },
      });

      const strategy = new CmuxStrategy(client);
      strategy.registerWorkspace("epic-a", "bm-epic-a");
      strategy.registerWorkspace("epic-b", "bm-epic-b");

      await strategy.cleanup("epic-a");

      expect(closedWorkspaces).toEqual(["bm-epic-a"]);
      expect(strategy.getWorkspace("epic-a")).toBeUndefined();
      expect(strategy.getWorkspace("epic-b")).toBe("bm-epic-b");
    });
  });

  describe("registerWorkspace / getWorkspace", () => {
    it("registers and retrieves workspace", () => {
      const client = mockClient();
      const strategy = new CmuxStrategy(client);

      strategy.registerWorkspace("my-epic", "bm-my-epic");
      expect(strategy.getWorkspace("my-epic")).toBe("bm-my-epic");
    });

    it("returns undefined for unregistered epic", () => {
      const client = mockClient();
      const strategy = new CmuxStrategy(client);

      expect(strategy.getWorkspace("unknown")).toBeUndefined();
    });
  });
});
