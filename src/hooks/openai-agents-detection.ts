import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);

export function hasOpenAIAgentsSDK(): boolean {
  try {
    requireFromCwd.resolve("@openai/agents");
    return true;
  } catch {
    return false;
  }
}
