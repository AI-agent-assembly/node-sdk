import { describe, expect, it, vi } from "vitest";
import { PolicyViolationError } from "../src/errors/policy-violation-error.js";
import type { GatewayClient } from "../src/gateway/client.js";
import { withAssembly } from "../src/wrappers/with-assembly.js";

function createMockGateway(overrides: Partial<GatewayClient> = {}): GatewayClient {
  return {
    mode: "sdk-only",
    start: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    check: vi.fn(async () => ({ denied: false, pending: false })),
    waitForApproval: vi.fn(async () => ({ denied: false })),
    record: vi.fn(async () => undefined),
    recordResult: vi.fn(async () => undefined),
    scanPrompts: vi.fn(async () => undefined),
    ...overrides
  };
}

describe("withAssembly governance", () => {
  it("ALLOW: passes through to original execute when gateway allows", async () => {
    const gateway = createMockGateway();
    const executeFn = vi.fn(async (args: { query: string }) => `result:${args.query}`);
    const tools = {
      search: { description: "Search", execute: executeFn }
    };

    withAssembly(tools, { gatewayClient: gateway });

    const result = await tools.search.execute({ query: "hello" });

    expect(gateway.check).toHaveBeenCalledOnce();
    expect(executeFn).toHaveBeenCalledWith({ query: "hello" });
    expect(result).toBe("result:hello");
  });

  it("DENY: throws PolicyViolationError when gateway denies", async () => {
    const gateway = createMockGateway({
      check: vi.fn(async () => ({ denied: true, pending: false, reason: "policy X" }))
    });
    const executeFn = vi.fn(async () => "should not run");
    const tools = {
      dangerous: { description: "Dangerous tool", execute: executeFn }
    };

    withAssembly(tools, { gatewayClient: gateway });

    await expect(tools.dangerous.execute()).rejects.toThrow(PolicyViolationError);
    await expect(tools.dangerous.execute()).rejects.toThrow("Tool 'dangerous' blocked: policy X");
    expect(executeFn).not.toHaveBeenCalled();
  });

  it("PENDING→approve: waits for approval then executes", async () => {
    const gateway = createMockGateway({
      check: vi.fn(async () => ({ denied: false, pending: true })),
      waitForApproval: vi.fn(async () => ({ denied: false }))
    });
    const executeFn = vi.fn(async () => "approved-result");
    const tools = {
      sensitive: { description: "Sensitive tool", execute: executeFn }
    };

    withAssembly(tools, { gatewayClient: gateway });

    const result = await tools.sensitive.execute();

    expect(gateway.waitForApproval).toHaveBeenCalledOnce();
    expect(executeFn).toHaveBeenCalledOnce();
    expect(result).toBe("approved-result");
  });

  it("PENDING→deny: throws PolicyViolationError when approval is rejected", async () => {
    const gateway = createMockGateway({
      check: vi.fn(async () => ({ denied: false, pending: true })),
      waitForApproval: vi.fn(async () => ({ denied: true, reason: "Manager rejected" }))
    });
    const executeFn = vi.fn(async () => "should not run");
    const tools = {
      sensitive: { description: "Sensitive tool", execute: executeFn }
    };

    withAssembly(tools, { gatewayClient: gateway });

    await expect(tools.sensitive.execute()).rejects.toThrow(PolicyViolationError);
    await expect(tools.sensitive.execute()).rejects.toThrow(
      "Approval rejected for 'sensitive': Manager rejected"
    );
    expect(executeFn).not.toHaveBeenCalled();
  });

  it("PENDING→timeout: throws PolicyViolationError on approval timeout", async () => {
    const gateway = createMockGateway({
      check: vi.fn(async () => ({ denied: false, pending: true })),
      waitForApproval: vi.fn(
        () => new Promise<{ denied: boolean }>((resolve) => {
          setTimeout(() => resolve({ denied: false }), 5000);
        })
      )
    });
    const executeFn = vi.fn(async () => "should not run");
    const tools = {
      slow: { description: "Slow approval tool", execute: executeFn }
    };

    withAssembly(tools, { gatewayClient: gateway, approvalTimeoutMs: 50 });

    await expect(tools.slow.execute()).rejects.toThrow(PolicyViolationError);
    await expect(tools.slow.execute()).rejects.toThrow("Approval timeout after 50ms");
    expect(executeFn).not.toHaveBeenCalled();
  });
});
