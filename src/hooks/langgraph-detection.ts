import { createRequire } from "node:module";

const requireFromCwd = createRequire(`${process.cwd()}/`);

export function hasLangGraph(): boolean {
  try {
    requireFromCwd.resolve("@langchain/langgraph");
    return true;
  } catch {
    return false;
  }
}
