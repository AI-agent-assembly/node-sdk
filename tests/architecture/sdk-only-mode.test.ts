import { describe, expect, it, vi } from "vitest";
import { startNetworkLayerIfNeeded } from "../../src/core/init-assembly.js";

describe("startNetworkLayerIfNeeded", () => {
  it("skips network startup when mode is sdk-only", async () => {
    const start = vi.fn(async () => undefined);

    await startNetworkLayerIfNeeded(
      {
        mode: "sdk-only",
        start,
        close: async () => undefined,
        check: async () => ({ denied: false, pending: false }),
        waitForApproval: async () => ({ denied: false }),
        record: async () => undefined,
        recordResult: async () => undefined,
        scanPrompts: async () => undefined
      },
      {
        gatewayUrl: "https://gateway.example.com",
        apiKey: "test-key",
        mode: "sdk-only"
      }
    );

    expect(start).not.toHaveBeenCalled();
  });
});
