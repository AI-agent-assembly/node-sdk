import { DynamicTool } from "@langchain/core/tools";
import { describe, expect, it, vi } from "vitest";
import { AssemblyCallbackHandler, wrapToolWithAssembly } from "../src/adapters/langchain/index.js";
import { PolicyViolationError } from "../src/errors/index.js";
import type { GatewayClient } from "../src/gateway/client.js";

function createGatewayMock(): GatewayClient {
  return {
    mode: "sdk-only",
    start: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    check: vi.fn(async () => ({ denied: false, pending: false })),
    waitForApproval: vi.fn(async () => ({ denied: false })),
    record: vi.fn(async () => undefined),
    recordResult: vi.fn(async () => undefined),
    scanPrompts: vi.fn(async () => undefined)
  };
}

describe("LangChain runtime integration", () => {
  it("captures real DynamicTool callback lifecycle through AssemblyCallbackHandler", async () => {
    const gateway = createGatewayMock();
    const toolFunc = vi.fn(async (input: string) => `echo:${input}`);

    const dynamicTool = new DynamicTool({
      name: "echo_tool",
      description: "Echo input",
      func: toolFunc
    });

    const wrappedTool = wrapToolWithAssembly(dynamicTool, gateway, {
      generateRunId: () => "run-real-runtime"
    });

    const handler = new AssemblyCallbackHandler(gateway);

    const output = await wrappedTool.invoke("hello", {
      callbacks: [handler],
      runId: "run-real-runtime"
    });

    expect(output).toBe("echo:hello");
    expect(toolFunc).toHaveBeenCalledTimes(1);
    expect(gateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tool_start_check",
        runId: "run-real-runtime"
      })
    );
    expect(gateway.recordResult).toHaveBeenCalledWith({
      runId: "run-real-runtime",
      output: "echo:hello"
    });
  });

  it("blocks real DynamicTool execution pre-invoke when gateway denies", async () => {
    const gateway = createGatewayMock();
    gateway.check = vi.fn(async () => ({ denied: true, reason: "blocked-by-policy" }));
    const toolFunc = vi.fn(async (input: string) => `echo:${input}`);

    const dynamicTool = new DynamicTool({
      name: "danger_tool",
      description: "Danger operation",
      func: toolFunc
    });

    const wrappedTool = wrapToolWithAssembly(dynamicTool, gateway, {
      generateRunId: () => "run-denied-runtime"
    });

    await expect(
      wrappedTool.invoke("secret", {
        callbacks: [new AssemblyCallbackHandler(gateway)],
        runId: "run-denied-runtime"
      })
    ).rejects.toBeInstanceOf(PolicyViolationError);

    expect(toolFunc).not.toHaveBeenCalled();
  });
});
