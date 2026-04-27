import { describe, expect, it, vi } from "vitest";
import { wrapToolWithAssembly } from "../src/adapters/langchain/index.js";
import { PolicyViolationError } from "../src/errors/index.js";
import type { GatewayClient } from "../src/gateway/client.js";
import type { LangChainToolLike } from "../src/types/langchain-adapter.js";

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

function createTool(): LangChainToolLike {
  return {
    name: "send_email",
    invoke: vi.fn(async () => "tool-result")
  };
}

describe("wrapToolWithAssembly", () => {
  it("blocks tool invocation when gateway check returns DENY", async () => {
    const gateway = createGatewayMock();
    gateway.check = vi.fn(async () => ({ denied: true, reason: "no outbound email" }));

    const tool = createTool();
    const invokeSpy = tool.invoke as ReturnType<typeof vi.fn>;

    wrapToolWithAssembly(tool, gateway, {
      generateRunId: () => "run-deny"
    });

    await expect(tool.invoke({ to: "bob@example.com" })).rejects.toBeInstanceOf(PolicyViolationError);
    expect(invokeSpy).not.toHaveBeenCalled();
  });
});
