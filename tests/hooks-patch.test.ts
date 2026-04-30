import { describe, expect, it } from "vitest";
import { patchVercelAiSdk } from "../src/hooks/ai-sdk.js";
import { patchLangChain } from "../src/hooks/langchain.js";
import type { NativeClient } from "../src/native/client.js";

function createClient(mode: NativeClient["mode"]): NativeClient {
  return {
    mode,
    close: async () => undefined,
    sendEvent: () => undefined,
    queryPolicy: async () => ({ denied: false, pending: false })
  };
}

describe("framework patch hooks", () => {
  it("returns false for native modes while patching is not implemented", async () => {
    await expect(patchVercelAiSdk(createClient("grpc-sidecar"))).resolves.toBe(false);
    await expect(patchVercelAiSdk(createClient("napi-inprocess"))).resolves.toBe(false);
    await expect(patchLangChain(createClient("grpc-sidecar"))).resolves.toBe(false);
    await expect(patchLangChain(createClient("napi-inprocess"))).resolves.toBe(false);
  });

  it("returns false for runtime-invalid modes from JavaScript callers", async () => {
    const invalidClient = {
      ...createClient("grpc-sidecar"),
      mode: "sdk-only"
    } as unknown as NativeClient;

    await expect(patchVercelAiSdk(invalidClient)).resolves.toBe(false);
    await expect(patchLangChain(invalidClient)).resolves.toBe(false);
  });
});
