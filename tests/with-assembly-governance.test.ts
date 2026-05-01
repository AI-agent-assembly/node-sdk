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
});
