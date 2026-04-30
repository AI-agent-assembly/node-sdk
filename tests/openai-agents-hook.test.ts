import { afterEach, describe, expect, it, vi } from "vitest";
import type { GatewayClient } from "../src/gateway/client.js";

interface FakeAgentInstance {
  calls: number;
}

interface FakeAgentClass {
  prototype: {
    _runTool: (
      this: FakeAgentInstance,
      toolCall: { function: { name: string; arguments: string } },
      context: { runId?: string; agentId?: string }
    ) => Promise<unknown>;
  };
}

function createGatewayClientMock(): GatewayClient {
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

afterEach(() => {
  return resetPatchState().finally(() => {
    vi.resetModules();
    vi.unmock("@openai/agents");
  });
});

describe("openai agents adapter", () => {
  it("activates patching during initAssembly when @openai/agents is detected", async () => {
    const gateway = createGatewayClientMock();
    const fakeAgentClass: FakeAgentClass = {
      prototype: {
        _runTool: vi.fn(async function (this: FakeAgentInstance) {
          this.calls += 1;
          return { ok: true };
        })
      }
    };

    vi.doMock("@openai/agents", () => ({ Agent: fakeAgentClass }));
    vi.doMock("node:module", () => ({
      createRequire: () => ({
        resolve: (packageName: string) => {
          if (packageName === "@openai/agents") {
            return packageName;
          }
          throw new Error("MODULE_NOT_FOUND");
        }
      })
    }));

    const { initAssembly } = await import("../src/core/init-assembly.js");
    await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      mode: "sdk-only",
      gatewayClient: gateway
    });

    const hooks = await import("../src/hooks/openai-agents.js");
    expect(hooks.openAIAgentsPatchState.isPatched).toBe(true);
    expect(fakeAgentClass.prototype._runTool).not.toBe(
      hooks.openAIAgentsPatchState.originalRunTool
    );
  });

  it("returns error output on DENY without throwing or executing original tool", async () => {
    const gateway = createGatewayClientMock();
    gateway.check = vi.fn(async () => ({ denied: true, reason: "policy-blocked" }));
    const originalRunTool = vi.fn(async () => ({ ok: true }));

    const hooks = await import("../src/hooks/openai-agents.js");
    const patchedRunTool = hooks.createPatchedRunTool(originalRunTool, gateway, {
      fallbackRunId: "fallback-run",
      approvalTimeoutMs: 5_000
    });

    const result = await patchedRunTool(
      {
        function: {
          name: "send_email",
          arguments: "{\"to\":\"user@example.com\"}"
        }
      },
      {
        runId: "run-1",
        agentId: "agent-1"
      }
    );

    expect(result).toEqual({
      error: "Blocked by governance policy: policy-blocked"
    });
    expect(originalRunTool).not.toHaveBeenCalled();
  });
});
async function resetPatchState() {
  const hooks = await import("../src/hooks/openai-agents.js");
  hooks.unpatchOpenAIAgents();
  hooks.openAIAgentsPatchState.originalRunTool = undefined;
  hooks.openAIAgentsPatchState.patchedAgentClass = undefined;
  hooks.openAIAgentsPatchState.isPatched = false;
}
