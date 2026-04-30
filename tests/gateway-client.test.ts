import { describe, expect, it } from "vitest";
import { createNoopGatewayClient } from "../src/gateway/index.js";
import type { AssemblyMode } from "../src/types/assembly-mode.js";

describe("createNoopGatewayClient", () => {
  it("returns a no-op client that resolves with allow-by-default decisions", async () => {
    const mode: AssemblyMode = "sdk-only";
    const client = createNoopGatewayClient(mode);

    expect(client.mode).toBe(mode);
    await expect(client.start()).resolves.toBeUndefined();
    await expect(client.close()).resolves.toBeUndefined();
    await expect(
      client.record({ action: "tool_call", runId: "run-1", output: { ok: true } })
    ).resolves.toBeUndefined();
    await expect(client.recordResult({ runId: "run-1", output: { ok: true } })).resolves.toBeUndefined();
    await expect(client.scanPrompts({ runId: "run-1", prompts: ["hello"] })).resolves.toBeUndefined();

    await expect(
      client.check({ action: "tool_call", runId: "run-1", toolName: "send_email" })
    ).resolves.toEqual({ denied: false, pending: false });
    await expect(client.waitForApproval("send_email", "run-1", 3000)).resolves.toEqual({
      denied: false
    });
  });
});
