import { describe, expect, it } from "vitest";
import { initAssembly } from "../src/index.js";

describe("initAssembly", () => {
  it("returns a runtime handle with close()", async () => {
    const runtime = await initAssembly({
      gateway: "https://gateway.example.com",
      apiKey: "test-key"
    });

    expect(runtime.close).toBeTypeOf("function");
    await expect(runtime.close()).resolves.toBeUndefined();
  });
});
