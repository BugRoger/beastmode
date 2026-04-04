import { describe, it, expect, beforeEach, mock } from "bun:test";

// ---------- module-level mocks (must precede imports) ----------

const mockSelectStrategy = mock(async (configured: string) => ({
  strategy: (configured === "cmux" ? "cmux" : configured === "iterm2" ? "iterm2" : "sdk") as any,
}));
const mockDispatchPhase = mock(async () => ({
  success: true,
  message: "test",
}));

// Track which factory was instantiated
let lastCreatedFactory: string | null = null;

class MockCmuxSessionFactory {
  constructor(_client: any) {
    lastCreatedFactory = "cmux";
  }
}

class MockCmuxClient {
  constructor() {}
}

class MockITermSessionFactory {
  constructor(_client: any) {
    lastCreatedFactory = "iterm2";
  }
}

class MockIt2Client {
  constructor() {}
}

class MockSdkSessionFactory {
  constructor(_fn: any) {
    lastCreatedFactory = "sdk";
  }
}

class MockReconcilingFactory {
  resolved?: any;
  constructor(_inner: any, _root: string, _logger: any) {}
}

class MockWatchLoop {
  isRunning() {
    return false;
  }
  async start() {}
  async stop() {}
}

class MockInkRender {
  async waitUntilExit() {}
}

const mockRender = mock((_element: any) => new MockInkRender());
const mockReact = { createElement: mock((_comp: any, _props: any) => ({})) };
const mockApp = { default: () => null };
const mockListEnriched = mock(async (_root: string) => []);
const mockDiscoverGitHub = mock(async () => null);

mock.module("../commands/watch.js", () => ({
  selectStrategy: mockSelectStrategy,
  dispatchPhase: mockDispatchPhase,
  ReconcilingFactory: MockReconcilingFactory,
}));

mock.module("../dispatch/cmux.js", () => ({
  CmuxSessionFactory: MockCmuxSessionFactory,
  CmuxClient: MockCmuxClient,
  cmuxAvailable: mock(async () => true),
}));

mock.module("../dispatch/it2.js", () => ({
  ITermSessionFactory: MockITermSessionFactory,
  It2Client: MockIt2Client,
  iterm2Available: mock(async () => ({ available: true, sessionId: "test-session" })),
  IT2_SETUP_INSTRUCTIONS: "test instructions",
}));

mock.module("../dispatch/factory.js", () => ({
  SdkSessionFactory: MockSdkSessionFactory,
  SessionEmitter: class {},
}));

mock.module("../commands/watch-loop.js", () => ({
  WatchLoop: MockWatchLoop,
}));

mock.module("ink", () => ({
  render: mockRender,
}));

mock.module("react", () => ({
  default: mockReact,
  createElement: mockReact.createElement,
}));

mock.module("../dashboard/App.js", () => ({
  default: mockApp,
}));

mock.module("../manifest/store.js", () => ({
  listEnriched: mockListEnriched,
}));

mock.module("../github/discovery.js", () => ({
  discoverGitHub: mockDiscoverGitHub,
}));

const mockLoadConfig = mock((_root: string) => ({
  github: { enabled: false },
  cli: {
    interval: 60,
    "dispatch-strategy": undefined as string | undefined,
  },
}));

const mockCreateLogger = mock((_verbosity: number, _opts: any) => ({
  log: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
}));
const mockExistsSync = mock(() => true);
const mockResolve = mock((...parts: string[]) => parts.join("/"));

mock.module("../config.js", () => ({
  loadConfig: mockLoadConfig,
}));

mock.module("../logger.js", () => ({
  createLogger: mockCreateLogger,
}));

// Mock fs and path at the end
const mockFs = {
  existsSync: mockExistsSync,
};
const mockPath = {
  resolve: mockResolve,
};

mock.module("node:fs", () => mockFs);
mock.module("node:path", () => mockPath);

// ---------- import after mocks ----------

import { dashboardCommand } from "../commands/dashboard.js";

// ---------- helpers ----------

function resetMocks() {
  mockSelectStrategy.mockClear();
  mockDispatchPhase.mockClear();
  mockRender.mockClear();
  mockReact.createElement.mockClear();
  mockLoadConfig.mockClear();
  mockCreateLogger.mockClear();
  mockListEnriched.mockClear();
  mockDiscoverGitHub.mockClear();
  lastCreatedFactory = null;
}

// ---------- tests ----------

describe("dashboardCommand strategy selection", () => {
  beforeEach(resetMocks);

  it("calls selectStrategy with sdk when config is undefined", async () => {
    mockLoadConfig.mockReturnValueOnce({
      github: { enabled: false },
      cli: { interval: 60, "dispatch-strategy": undefined },
    });

    await dashboardCommand(
      { github: { enabled: false }, cli: { interval: 60 } } as any,
      [],
      0,
    );

    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
    expect(mockSelectStrategy).toHaveBeenCalledWith("sdk", undefined, expect.any(Object));
    expect(lastCreatedFactory).toBe("sdk");
  });

  it("calls selectStrategy with explicit sdk config", async () => {
    mockLoadConfig.mockReturnValueOnce({
      github: { enabled: false },
      cli: { interval: 60, "dispatch-strategy": "sdk" },
    });

    await dashboardCommand(
      { github: { enabled: false }, cli: { interval: 60, "dispatch-strategy": "sdk" } } as any,
      [],
      0,
    );

    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
    expect(mockSelectStrategy).toHaveBeenCalledWith("sdk", undefined, expect.any(Object));
    expect(lastCreatedFactory).toBe("sdk");
  });

  it("calls selectStrategy with explicit cmux config", async () => {
    mockLoadConfig.mockReturnValueOnce({
      github: { enabled: false },
      cli: { interval: 60, "dispatch-strategy": "cmux" },
    });

    await dashboardCommand(
      { github: { enabled: false }, cli: { interval: 60, "dispatch-strategy": "cmux" } } as any,
      [],
      0,
    );

    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
    expect(mockSelectStrategy).toHaveBeenCalledWith("cmux", undefined, expect.any(Object));
    expect(lastCreatedFactory).toBe("cmux");
  });

  it("calls selectStrategy with explicit iterm2 config", async () => {
    mockLoadConfig.mockReturnValueOnce({
      github: { enabled: false },
      cli: { interval: 60, "dispatch-strategy": "iterm2" },
    });

    await dashboardCommand(
      { github: { enabled: false }, cli: { interval: 60, "dispatch-strategy": "iterm2" } } as any,
      [],
      0,
    );

    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
    expect(mockSelectStrategy).toHaveBeenCalledWith("iterm2", undefined, expect.any(Object));
    expect(lastCreatedFactory).toBe("iterm2");
  });

  it("calls selectStrategy with auto config", async () => {
    mockLoadConfig.mockReturnValueOnce({
      github: { enabled: false },
      cli: { interval: 60, "dispatch-strategy": "auto" },
    });

    await dashboardCommand(
      { github: { enabled: false }, cli: { interval: 60, "dispatch-strategy": "auto" } } as any,
      [],
      0,
    );

    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
    expect(mockSelectStrategy).toHaveBeenCalledWith("auto", undefined, expect.any(Object));
    // Note: auto falls through to sdk in the current mock
    expect(lastCreatedFactory).toBe("sdk");
  });

  it("calls selectStrategy exactly once regardless of config", async () => {
    mockLoadConfig.mockReturnValueOnce({
      github: { enabled: false },
      cli: { interval: 60, "dispatch-strategy": "sdk" },
    });

    await dashboardCommand(
      { github: { enabled: false }, cli: { interval: 60, "dispatch-strategy": "sdk" } } as any,
      [],
      0,
    );

    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
  });
});
