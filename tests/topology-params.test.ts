import { describe, expect, it } from "vitest";
import { initAssembly } from "../src/index.js";

describe("initAssembly topology params", () => {
  it("exposes all topology fields from config on the returned context", async () => {
    const ctx = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      parentAgentId: "parent-agent",
      teamId: "team-alpha",
      delegationReason: "sub-task delegation",
      spawnedByTool: "search_tool"
    });

    expect(ctx.parentAgentId).toBe("parent-agent");
    expect(ctx.teamId).toBe("team-alpha");
    expect(ctx.delegationReason).toBe("sub-task delegation");
    expect(ctx.spawnedByTool).toBe("search_tool");
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
    expect(ctx.spawnedByTool).toBeUndefined();
    await ctx.shutdown();
  });

  it("accepts partial topology params (spawnedByTool only)", async () => {
    const ctx = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      spawnedByTool: "code_executor"
    });

    expect(ctx.parentAgentId).toBeUndefined();
    expect(ctx.teamId).toBeUndefined();
    expect(ctx.delegationReason).toBeUndefined();
    expect(ctx.spawnedByTool).toBe("code_executor");
    await ctx.shutdown();
  });

  it("accepts partial topology params (teamId only)", async () => {
    const ctx = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      teamId: "team-beta"
    });

    expect(ctx.parentAgentId).toBeUndefined();
    expect(ctx.teamId).toBe("team-beta");
    expect(ctx.delegationReason).toBeUndefined();
    expect(ctx.spawnedByTool).toBeUndefined();
    await ctx.shutdown();
  });

  it("throws RangeError when delegationReason exceeds 256 characters", async () => {
    await expect(
      initAssembly({
        gatewayUrl: "https://gateway.example.com",
        apiKey: "test-key",
        delegationReason: "x".repeat(257)
      })
    ).rejects.toThrow(RangeError);
  });

  it("accepts delegationReason at exactly 256 characters", async () => {
    const ctx = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "test-key",
      delegationReason: "x".repeat(256)
    });

    expect(ctx.delegationReason).toHaveLength(256);
    await ctx.shutdown();
  });
});
