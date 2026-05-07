import { describe, expect, it } from "vitest";
import { initAssembly } from "../src/index.js";

describe("initAssembly topology params", () => {
  it("exposes topology fields from config on the returned context", async () => {
    const ctx = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      parentAgentId: "parent-agent",
      teamId: "team-alpha",
      delegationReason: "sub-task delegation"
    });

    expect(ctx.parentAgentId).toBe("parent-agent");
    expect(ctx.teamId).toBe("team-alpha");
    expect(ctx.delegationReason).toBe("sub-task delegation");
    await ctx.shutdown();
  });

  it("topology fields are undefined when not provided (backward compatible)", async () => {
    const ctx = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key"
    });

    expect(ctx.parentAgentId).toBeUndefined();
    expect(ctx.teamId).toBeUndefined();
    expect(ctx.delegationReason).toBeUndefined();
    await ctx.shutdown();
  });

  it("accepts partial topology params", async () => {
    const ctx = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      teamId: "team-beta"
    });

    expect(ctx.parentAgentId).toBeUndefined();
    expect(ctx.teamId).toBe("team-beta");
    expect(ctx.delegationReason).toBeUndefined();
    await ctx.shutdown();
  });
});
