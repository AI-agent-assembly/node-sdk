import { describe, expect, it, vi } from "vitest";
import { AssemblyCallbackHandler } from "../src/adapters/langchain/index.js";
import type { GatewayClient } from "../src/gateway/client.js";

function createGatewayMock(): GatewayClient {
  return {
    mode: "sdk-only",
    start: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    check: vi.fn(async () => ({ denied: true, reason: "denied" })),
    waitForApproval: vi.fn(async () => ({ denied: false })),
    record: vi.fn(async () => undefined),
    recordResult: vi.fn(async () => undefined),
    scanPrompts: vi.fn(async () => undefined)
  };
}

describe("AssemblyCallbackHandler pending-denial cleanup", () => {
  it("removes pending denials older than five minutes", async () => {
    const gateway = createGatewayMock();
    let currentTime = 0;
    const now = () => currentTime;
    const handler = new AssemblyCallbackHandler(gateway, now, 5 * 60 * 1000);

    await handler.handleToolStart({ name: "send_email" }, { to: "x@example.com" }, "run-old");
    expect(handler.getPendingDenialCount()).toBe(1);

    currentTime = 5 * 60 * 1000 + 1;
    const removed = handler.cleanupExpiredPendingDenials();

    expect(removed).toBe(1);
    expect(handler.getPendingDenialCount()).toBe(0);
  });
});
