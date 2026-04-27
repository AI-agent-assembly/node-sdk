import { describe, expect, it, vi } from "vitest";

async function loadDetectFrameworks(installed: ReadonlySet<string>) {
  vi.resetModules();
  vi.doMock("node:module", () => ({
    createRequire: () => ({
      resolve: (packageName: string) => {
        if (!installed.has(packageName)) {
          throw new Error("MODULE_NOT_FOUND");
        }
        return packageName;
      }
    })
  }));

  const module = await import("../../src/core/init-assembly.js");
  return module.detectFrameworks;
}

describe("detectFrameworks", () => {
  it("returns only frameworks that are installed", async () => {
    const detectFrameworks = await loadDetectFrameworks(new Set(["ai"]));

    expect(detectFrameworks()).toEqual(["vercel-ai-sdk"]);
  });

  it("returns all supported frameworks when all are installed", async () => {
    const detectFrameworks = await loadDetectFrameworks(
      new Set(["@langchain/core", "ai", "@openai/agents"])
    );

    expect(detectFrameworks()).toEqual(["langchain-js", "vercel-ai-sdk", "openai-agents"]);
  });
});
