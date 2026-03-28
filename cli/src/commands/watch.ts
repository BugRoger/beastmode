import type { BeastmodeConfig } from "../config";
import { watchCommand as watchCommandImpl } from "../watch-command";

export async function watchCommand(_config: BeastmodeConfig): Promise<void> {
  await watchCommandImpl([]);
}
