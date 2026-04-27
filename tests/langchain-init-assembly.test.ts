import { describe, expect, it, vi } from "vitest";
import type { GatewayClient } from "../src/gateway/client.js";
import type { LangChainToolLike } from "../src/types/langchain-adapter.js";

function createGatewayMock(): GatewayClient {
  return {
    mode: "sdk-only",
    start: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    check: vi.fn(async () => ({ denied: true, reason: "blocked by policy" })),
    waitForApproval: vi.fn(async () => ({ denied: false })),
    record: vi.fn(async () => undefined),
    recordResult: vi.fn(async () => undefined),
    scanPrompts: vi.fn(async () => undefined)
  };
}

async function loadInitAssemblyWithInstalledPackages(installed: ReadonlySet<string>) {
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

  return import("../src/core/init-assembly.js");
}

function createTool(name: string): LangChainToolLike {
  return {
    name,
    invoke: vi.fn(async () => `${name}-ok`)
  };
}

describe("initAssembly LangChain integration", () => {
  it("auto-registers callback handler and wraps all configured tools", async () => {
    const gateway = createGatewayMock();
    const callbacks: { name: string }[] = [];
    const firstTool = createTool("send_email");
    const secondTool = createTool("search_web");

    const { initAssembly } = await loadInitAssemblyWithInstalledPackages(new Set(["@langchain/core"]));

    const runtime = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      mode: "sdk-only",
      gatewayClient: gateway,
      langchain: {
        callbacks,
        tools: {
          sendEmail: firstTool,
          searchWeb: secondTool
        },
        approvalTimeoutMs: 100
      }
    });

    expect(runtime.activeAdapters).toContain("langchain-js");
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]?.name).toBe("assembly_handler");

    await expect(firstTool.invoke({ to: "user@example.com" })).rejects.toThrow("send_email");
    await expect(secondTool.invoke({ q: "query" })).rejects.toThrow("search_web");

    await runtime.shutdown();
  });

  it("propagates policy violation cleanly from wrapped tool invoke", async () => {
    const gateway = createGatewayMock();
    const blockedTool = createTool("transfer_funds");

    const { initAssembly } = await loadInitAssemblyWithInstalledPackages(new Set(["@langchain/core"]));

    await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      mode: "sdk-only",
      gatewayClient: gateway,
      langchain: {
        tools: { transferFunds: blockedTool }
      }
    });

    await expect(blockedTool.invoke({ amount: 1000 })).rejects.toThrow("transfer_funds");
  });
});
