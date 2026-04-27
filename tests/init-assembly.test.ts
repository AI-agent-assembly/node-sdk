import { describe, expect, it } from "vitest";
import { initAssembly } from "../src/index.js";

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
});
