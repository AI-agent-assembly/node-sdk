/**
 * Integration tests for topology field forwarding via native client registration event (AAASM-1178).
 *
 * These tests use a mock native binding to intercept sendEvent payloads so they
 * run without a live sidecar. They exercise the full initAssembly → NativeClient →
 * sendEvent path, verifying all 4 topology fields reach the registration payload.
 */

import { describe, expect, it, vi } from "vitest";

interface MockBinding {
  connect: ReturnType<typeof vi.fn>;
  sendEvent: ReturnType<typeof vi.fn>;
  queryPolicy: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

function makeMockBinding(): MockBinding {
  return {
    connect: vi.fn(async () => ({ id: "integration-handle" })),
    sendEvent: vi.fn(() => undefined),
    queryPolicy: vi.fn(async () => ({ denied: false, pending: false })),
    disconnect: vi.fn(async () => undefined),
  };
}

async function loadInitAssemblyWithBinding(binding: MockBinding) {
  vi.resetModules();
  vi.doMock("node:module", () => ({
    createRequire: () => () => binding,
  }));
  return import("../../src/index.js");
}

describe("integration: topology registration via native client", () => {
  it("sends all 4 topology fields in the registration event", async () => {
    const binding = makeMockBinding();
    const { initAssembly } = await loadInitAssemblyWithBinding(binding);

    const ctx = await initAssembly({
      gatewayUrl: "/tmp/aa-integration.sock",
      apiKey: "integration-api-key",
      mode: "napi-inprocess",
      parentAgentId: "parent-agent-integration",
      teamId: "team-integration",
      delegationReason: "integration delegation",
      spawnedByTool: "integration_tool",
    });

    await ctx.shutdown();

    const registrationCall = binding.sendEvent.mock.calls.find(
      ([, event]) =>
        (event as Record<string, string>).event_type === "register"
    );
    expect(registrationCall).toBeDefined();

    const [, event] = registrationCall!;
    expect(event).toMatchObject({
      event_type: "register",
      parent_agent_id: "parent-agent-integration",
      team_id: "team-integration",
      delegation_reason: "integration delegation",
      spawned_by_tool: "integration_tool",
    });
  });

  it("sends only event_type when no topology fields are provided", async () => {
    const binding = makeMockBinding();
    const { initAssembly } = await loadInitAssemblyWithBinding(binding);

    const ctx = await initAssembly({
      gatewayUrl: "/tmp/aa-integration-bare.sock",
      apiKey: "integration-api-key",
      mode: "napi-inprocess",
    });

    await ctx.shutdown();

    const registrationCall = binding.sendEvent.mock.calls.find(
      ([, event]) =>
        (event as Record<string, string>).event_type === "register"
    );
    expect(registrationCall).toBeDefined();

    const [, event] = registrationCall! as [object, Record<string, string>];
    expect(event.event_type).toBe("register");
    expect(event.parent_agent_id).toBeUndefined();
    expect(event.team_id).toBeUndefined();
    expect(event.delegation_reason).toBeUndefined();
    expect(event.spawned_by_tool).toBeUndefined();
  });

  it("sends partial topology when only some fields are provided", async () => {
    const binding = makeMockBinding();
    const { initAssembly } = await loadInitAssemblyWithBinding(binding);

    const ctx = await initAssembly({
      gatewayUrl: "/tmp/aa-integration-partial.sock",
      apiKey: "integration-api-key",
      mode: "napi-inprocess",
      teamId: "team-partial",
      spawnedByTool: "partial_tool",
    });

    await ctx.shutdown();

    const registrationCall = binding.sendEvent.mock.calls.find(
      ([, event]) =>
        (event as Record<string, string>).event_type === "register"
    );
    expect(registrationCall).toBeDefined();

    const [, event] = registrationCall! as [object, Record<string, string>];
    expect(event.team_id).toBe("team-partial");
    expect(event.spawned_by_tool).toBe("partial_tool");
    expect(event.parent_agent_id).toBeUndefined();
    expect(event.delegation_reason).toBeUndefined();
  });

  it("skips registration event entirely in sdk-only mode", async () => {
    const binding = makeMockBinding();
    const { initAssembly } = await loadInitAssemblyWithBinding(binding);

    const ctx = await initAssembly({
      gatewayUrl: "https://gateway.example.com",
      apiKey: "integration-api-key",
      mode: "sdk-only",
      parentAgentId: "should-not-be-sent",
    });

    await ctx.shutdown();

    expect(binding.connect).not.toHaveBeenCalled();
    expect(binding.sendEvent).not.toHaveBeenCalled();
  });
});
