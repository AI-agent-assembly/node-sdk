import { DynamicTool } from "@langchain/core/tools";
import { FakeStreamingLLM } from "@langchain/core/utils/testing";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
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

  it("applies pre-execution DENY during AgentExecutor tool attempt", async () => {
    const gateway = createGatewayMock();
    gateway.check = vi.fn(async () => ({ denied: true, reason: "blocked-by-policy" }));
    const toolFunc = vi.fn(async (input: string) => `echo:${input}`);

    const dynamicTool = new DynamicTool({
      name: "blocked_tool",
      description: "Blocked operation",
      func: toolFunc
    });

    const wrappedTool = wrapToolWithAssembly(dynamicTool, gateway, {
      generateRunId: () => "run-agent-denied"
    });

    const llm = new FakeStreamingLLM({
      responses: [
        "Thought: I should use a tool.\nAction: blocked_tool\nAction Input: secret",
        "Final Answer: unreachable"
      ]
    });

    const executor = await initializeAgentExecutorWithOptions([wrappedTool], llm, {
      agentType: "zero-shot-react-description",
      maxIterations: 2,
      returnIntermediateSteps: true
    });

    const result = await executor.invoke(
      { input: "Use the blocked tool." },
      { callbacks: [new AssemblyCallbackHandler(gateway)], runId: "run-agent-denied" }
    );

    expect(result).toEqual(
      expect.objectContaining({
        output: "unreachable",
        intermediateSteps: [
          expect.objectContaining({
            action: expect.objectContaining({
              tool: "blocked_tool",
              toolInput: "secret"
            })
          })
        ]
      })
    );

    expect(toolFunc).not.toHaveBeenCalled();
    expect(gateway.check).toHaveBeenCalledWith({
      action: "tool_call",
      toolName: "blocked_tool",
      args: "secret",
      runId: "run-agent-denied"
    });
  });
});
