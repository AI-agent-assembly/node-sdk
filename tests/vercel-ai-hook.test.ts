import { afterEach, describe, expect, it, vi } from "vitest";
import type { GatewayClient } from "../src/gateway/client.js";

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
  });
});

describe("vercel ai sdk adapter", () => {
  it("executes original tool on ALLOW decision", async () => {
    const gateway = createGatewayClientMock();
    gateway.check = vi.fn(async () => ({ denied: false, pending: false }));
    const originalExecute = vi.fn(async () => ({ ok: "allow-path" }));

    const hooks = await import("../src/hooks/ai-sdk.js");
    const wrappedExecute = hooks.createWrappedExecute(
      originalExecute,
      "a weather tool",
      gateway,
      { approvalTimeoutMs: 5_000, fallbackRunId: "fallback" }
    );

    const result = await wrappedExecute(
      { city: "Tokyo" },
      { toolCallId: "call-1" }
    );

    expect(result).toEqual({ ok: "allow-path" });
    expect(gateway.check).toHaveBeenCalledWith({
      action: "tool_call",
      toolName: "a weather tool",
      args: { city: "Tokyo" },
      runId: "call-1"
    });
    expect(originalExecute).toHaveBeenCalledTimes(1);
  });

  it("throws PolicyViolationError on DENY without executing original tool", async () => {
    const gateway = createGatewayClientMock();
    gateway.check = vi.fn(async () => ({ denied: true, reason: "policy-blocked" }));
    const originalExecute = vi.fn(async () => ({ ok: true }));

    const hooks = await import("../src/hooks/ai-sdk.js");
    const wrappedExecute = hooks.createWrappedExecute(
      originalExecute,
      "send email tool",
      gateway,
      { approvalTimeoutMs: 5_000, fallbackRunId: "fallback" }
    );

    const error = await wrappedExecute(
      { to: "user@example.com" },
      { toolCallId: "call-2" }
    ).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe("PolicyViolationError");
    expect((error as Error).message).toBe(
      "Tool blocked by governance policy: policy-blocked"
    );

    expect(originalExecute).not.toHaveBeenCalled();
  });

  it("continues execution when PENDING is approved", async () => {
    const gateway = createGatewayClientMock();
    gateway.check = vi.fn(async () => ({ pending: true, denied: false }));
    gateway.waitForApproval = vi.fn(async () => ({ denied: false }));
    const originalExecute = vi.fn(async () => ({ ok: "approved" }));

    const hooks = await import("../src/hooks/ai-sdk.js");
    const wrappedExecute = hooks.createWrappedExecute(
      originalExecute,
      "transfer funds",
      gateway,
      { approvalTimeoutMs: 8_000, fallbackRunId: "fallback" }
    );

    const result = await wrappedExecute(
      { amount: 100 },
      { toolCallId: "call-3" }
    );

    expect(result).toEqual({ ok: "approved" });
    expect(gateway.waitForApproval).toHaveBeenCalledWith(
      "transfer funds",
      "call-3",
      8_000
    );
    expect(originalExecute).toHaveBeenCalledTimes(1);
  });

  it("throws PolicyViolationError when PENDING is denied", async () => {
    const gateway = createGatewayClientMock();
    gateway.check = vi.fn(async () => ({ pending: true, denied: false }));
    gateway.waitForApproval = vi.fn(async () => ({
      denied: true,
      reason: "manual reviewer rejected"
    }));
    const originalExecute = vi.fn(async () => ({ ok: true }));

    const hooks = await import("../src/hooks/ai-sdk.js");
    const wrappedExecute = hooks.createWrappedExecute(
      originalExecute,
      "delete account",
      gateway,
      { approvalTimeoutMs: 1_000, fallbackRunId: "fallback" }
    );

    const error = await wrappedExecute(
      { id: "u1" },
      { toolCallId: "call-4" }
    ).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe("PolicyViolationError");
    expect((error as Error).message).toBe(
      "Approval rejected: manual reviewer rejected"
    );

    expect(originalExecute).not.toHaveBeenCalled();
  });
});

async function resetPatchState(): Promise<void> {
  const hooks = await import("../src/hooks/ai-sdk.js");
  hooks.unpatchVercelAiSdk();
  hooks.vercelAiSdkPatchState.originalToolFactory = undefined;
  hooks.vercelAiSdkPatchState.patchedModule = undefined;
  hooks.vercelAiSdkPatchState.isPatched = false;
}
