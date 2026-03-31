import type { BeastmodeConfig } from "../config";

export async function dashboardCommand(config: BeastmodeConfig, _args: string[] = [], verbosity: number = 0): Promise<void> {
  // Dynamic import — React/Ink loaded only when dashboard runs
  const { render } = await import("ink");
  const React = await import("react");
  const { default: App } = await import("../dashboard/App.js");

  // Enter alternate screen buffer
  process.stdout.write("\x1b[?1049h");

  const { waitUntilExit } = render(
    React.createElement(App, { config, verbosity }),
  );

  try {
    await waitUntilExit();
  } finally {
    // Restore terminal
    process.stdout.write("\x1b[?1049l");
  }
}
