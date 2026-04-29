import { describe, expect, it, vi } from "vitest";

interface MockBinding {
  connect: ReturnType<typeof vi.fn>;
  sendEvent: ReturnType<typeof vi.fn>;
  queryPolicy: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

async function loadNativeClientWithBinding(bindingFactory: () => MockBinding) {
  vi.resetModules();
  vi.doMock("node:module", () => ({
    createRequire: () => {
      const binding = bindingFactory();
      return () => binding;
    }
  }));

  return import("../src/native/client.js");
}

async function loadNativeClientWithRequire(
  requireFactory: () => (path: string) => unknown
) {
  vi.resetModules();
  vi.doMock("node:module", () => ({
    createRequire: () => requireFactory()
  }));

  return import("../src/native/client.js");
}

describe("createNativeClient", () => {
  it("returns grpc-sidecar noop client by default", async () => {
    const mod = await loadNativeClientWithBinding(() => ({
      connect: vi.fn(async () => ({})),
      sendEvent: vi.fn(() => undefined),
      queryPolicy: vi.fn(async () => ({ denied: false, pending: false })),
      disconnect: vi.fn(async () => undefined)
    }));

    const client = mod.createNativeClient({
      gateway: "https://gateway.example.com",
      apiKey: "test-key"
    });

    expect(client.mode).toBe("grpc-sidecar");
    client.sendEvent({ action: "tool_call" });
    await expect(client.queryPolicy({ action: "check" })).resolves.toEqual({
      denied: false,
      pending: false
    });
    await expect(client.close()).resolves.toBeUndefined();
  });

  it("loads binding and forwards queryPolicy/close in napi-inprocess mode", async () => {
    const binding = {
      connect: vi.fn(async () => ({ id: "handle-1" })),
      sendEvent: vi.fn(() => undefined),
      queryPolicy: vi.fn(async () => ({ denied: true, reason: "blocked" })),
      disconnect: vi.fn(async () => undefined)
    } satisfies MockBinding;

    const mod = await loadNativeClientWithBinding(() => binding);

    const client = mod.createNativeClient({
      gateway: "/tmp/aa.sock",
      apiKey: "test-key",
      mode: "napi-inprocess"
    });

    await expect(client.queryPolicy({ action: "check" })).resolves.toEqual({
      denied: true,
      reason: "blocked"
    });

    expect(binding.connect).toHaveBeenCalledWith("/tmp/aa.sock");
    await expect(client.close()).resolves.toBeUndefined();
    expect(binding.disconnect).toHaveBeenCalledTimes(1);
  });

  it("maps connect failure to NativeConnectError", async () => {
    const mod = await loadNativeClientWithBinding(() => ({
      connect: vi.fn(async () => {
        throw new Error("AA_ERR_CONNECT:socketPath cannot be empty");
      }),
      sendEvent: vi.fn(() => undefined),
      queryPolicy: vi.fn(async () => ({ denied: false })),
      disconnect: vi.fn(async () => undefined)
    }));

    const client = mod.createNativeClient({
      gateway: "",
      apiKey: "test-key",
      mode: "napi-inprocess"
    });

    await expect(client.queryPolicy({ action: "check" })).rejects.toBeInstanceOf(mod.NativeConnectError);
  });

  it("surfaces deferred sendEvent failure on next queryPolicy call", async () => {
    const binding = {
      connect: vi.fn(async () => ({ id: "handle-2" })),
      sendEvent: vi.fn(() => {
        throw new Error("AA_ERR_SEND_EVENT:queue closed");
      }),
      queryPolicy: vi.fn(async () => ({ denied: false, pending: false })),
      disconnect: vi.fn(async () => undefined)
    } satisfies MockBinding;

    const mod = await loadNativeClientWithBinding(() => binding);

    const client = mod.createNativeClient({
      gateway: "/tmp/aa.sock",
      apiKey: "test-key",
      mode: "napi-inprocess"
    });

    await client.queryPolicy({ action: "warmup" });
    client.sendEvent({ action: "tool_call" });

    await expect(client.queryPolicy({ action: "check" })).rejects.toBeInstanceOf(
      mod.NativeSendEventError
    );
  });

  it("surfaces deferred sendEvent failure when sendEvent is called before first connect finishes", async () => {
    let resolveConnect: ((handle: { id: string }) => void) | undefined;
    const connectPromise = new Promise<{ id: string }>((resolve) => {
      resolveConnect = resolve;
    });

    const binding = {
      connect: vi.fn(() => connectPromise),
      sendEvent: vi.fn(() => {
        throw new Error("AA_ERR_SEND_EVENT:queue closed");
      }),
      queryPolicy: vi.fn(async () => ({ denied: false, pending: false })),
      disconnect: vi.fn(async () => undefined)
    } satisfies MockBinding;

    const mod = await loadNativeClientWithBinding(() => binding);
    const client = mod.createNativeClient({
      gateway: "/tmp/aa.sock",
      apiKey: "test-key",
      mode: "napi-inprocess"
    });

    client.sendEvent({ action: "tool_call" });
    resolveConnect?.({ id: "handle-3" });
    await vi.waitFor(() => {
      expect(binding.sendEvent).toHaveBeenCalledTimes(1);
    });
    await Promise.resolve();

    await expect(client.queryPolicy({ action: "check" })).rejects.toBeInstanceOf(
      mod.NativeSendEventError
    );
  });

  it("maps queryPolicy and disconnect failures to typed native errors", async () => {
    const binding = {
      connect: vi.fn(async () => ({ id: "handle-4" })),
      sendEvent: vi.fn(() => undefined),
      queryPolicy: vi.fn(async () => {
        throw new Error("AA_ERR_QUERY_POLICY:query failed");
      }),
      disconnect: vi.fn(async () => {
        throw new Error("AA_ERR_DISCONNECT:disconnect failed");
      })
    } satisfies MockBinding;

    const mod = await loadNativeClientWithBinding(() => binding);
    const client = mod.createNativeClient({
      gateway: "/tmp/aa.sock",
      apiKey: "test-key",
      mode: "napi-inprocess"
    });

    await expect(client.queryPolicy({ action: "check" })).rejects.toBeInstanceOf(
      mod.NativeQueryPolicyError
    );
    await expect(client.close()).rejects.toBeInstanceOf(mod.NativeDisconnectError);
  });

  it("tries known native binding paths and succeeds on fallback path", async () => {
    const binding = {
      connect: vi.fn(async () => ({ id: "handle-5" })),
      sendEvent: vi.fn(() => undefined),
      queryPolicy: vi.fn(async () => ({ denied: false, pending: false })),
      disconnect: vi.fn(async () => undefined)
    } satisfies MockBinding;

    const mod = await loadNativeClientWithRequire(() => {
      let calls = 0;
      return () => {
        calls += 1;
        if (calls < 3) {
          throw new Error("not found");
        }
        return binding;
      };
    });

    const client = mod.createNativeClient({
      gateway: "/tmp/aa.sock",
      apiKey: "test-key",
      mode: "napi-inprocess"
    });

    await expect(client.queryPolicy({ action: "check" })).resolves.toEqual({
      denied: false,
      pending: false
    });
  });
});
