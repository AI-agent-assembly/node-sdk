import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);

export function hasVercelAiSdk(): boolean {
  try {
    requireFromCwd.resolve("ai");
    return true;
  } catch {
    return false;
  }
}
