import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);

export function hasMastra(): boolean {
  try {
    requireFromCwd.resolve("@mastra/core");
    return true;
  } catch {
    return false;
  }
}
