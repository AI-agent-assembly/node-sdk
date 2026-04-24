import { describe, expect, it } from "vitest";
import { createNativeClient } from "../src/native/client.js";
import { registerFrameworkHooks } from "../src/hooks/adapter-registry.js";

describe("registerFrameworkHooks", () => {
  it("runs without throwing", async () => {
    const client = createNativeClient({
      gateway: "https://gateway.example.com",
      apiKey: "test-key"
    });

    await expect(registerFrameworkHooks(client)).resolves.toBeUndefined();
  });
});
