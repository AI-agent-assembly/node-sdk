import { describe, expect, it } from "vitest";
import { initAssembly } from "../src/index.js";
import { runWithAgentId } from "../src/lineage/agent-context-store.js";

describe("initAssembly", () => {
  it("returns an assembly context with shutdown()", async () => {
    const runtime = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key"
    });

    expect(runtime.shutdown).toBeTypeOf("function");
    expect(Array.isArray(runtime.activeAdapters)).toBe(true);
    await expect(runtime.shutdown()).resolves.toBeUndefined();
  });

  it("auto-inherits parentAgentId from async context store when not explicitly provided", async () => {
    let capturedContext: Awaited<ReturnType<typeof initAssembly>> | undefined;

    await runWithAgentId("parent-agent-abc", async () => {
      capturedContext = await initAssembly({
        gatewayUrl: "https://gateway.example.com",
        apiKey: "test-key"
      });
    });

    expect(capturedContext?.parentAgentId).toBe("parent-agent-abc");
    await capturedContext?.shutdown();
  });

  it("explicit parentAgentId overrides context store value", async () => {
    let capturedContext: Awaited<ReturnType<typeof initAssembly>> | undefined;

    await runWithAgentId("store-parent", async () => {
      capturedContext = await initAssembly({
        gatewayUrl: "https://gateway.example.com",
        apiKey: "test-key",
        parentAgentId: "explicit-parent"
      });
    });

    expect(capturedContext?.parentAgentId).toBe("explicit-parent");
    await capturedContext?.shutdown();
  });

  it("does not set parentAgentId when context store is empty and config omits it", async () => {
    const runtime = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key"
    });

    expect(runtime.parentAgentId).toBeUndefined();
    await runtime.shutdown();
  });
});
