import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  AuditEvent,
  CallStackNode,
  CallStackNodeKind
} from "../../src/types/audit.js";

describe("CallStackNode", () => {
  it("accepts the required fields with all optionals omitted", () => {
    const node: CallStackNode = { id: "n0", kind: "llm", label: "gpt-4o" };
    expect(node.id).toBe("n0");
    expect(node.kind).toBe("llm");
    expect(node.label).toBe("gpt-4o");
    expect(node.latencyMs).toBeUndefined();
    expect(node.children).toBeUndefined();
  });

  it("carries latencyMs and a nested children tree", () => {
    const child: CallStackNode = {
      id: "n1",
      kind: "tool",
      label: "gmail.send",
      latencyMs: 120
    };
    const parent: CallStackNode = {
      id: "n0",
      kind: "llm",
      label: "gpt-4o",
      latencyMs: 300,
      children: [child]
    };
    expect(parent.children?.[0]).toBe(child);
    expect(parent.children?.[0]?.latencyMs).toBe(120);
  });

  it("supports a three-level call stack tree (LLM → tool → result)", () => {
    const tree: CallStackNode = {
      id: "n0",
      kind: "llm",
      label: "gpt-4o",
      latencyMs: 300,
      children: [
        {
          id: "n1",
          kind: "tool",
          label: "gmail.send",
          latencyMs: 120,
          children: [{ id: "n2", kind: "result", label: "200 OK" }]
        }
      ]
    };
    expect(tree.children?.[0]?.children?.[0]?.kind).toBe("result");
    expect(tree.children?.[0]?.children?.[0]?.latencyMs).toBeUndefined();
  });

  it("constrains `kind` to the three known values at the type level", () => {
    expectTypeOf<CallStackNodeKind>().toEqualTypeOf<"llm" | "tool" | "result">();
  });
});

describe("AuditEvent", () => {
  it("constructs with required fields and leaves callStack undefined by default", () => {
    const event: AuditEvent = {
      eventId: "evt-1",
      agentId: "support-agent",
      actionType: "llm_call",
      decision: "allow"
    };
    expect(event.eventId).toBe("evt-1");
    expect(event.callStack).toBeUndefined();
    expect(event.labels).toBeUndefined();
    expect(event.traceId).toBeUndefined();
  });

  it("carries a populated callStack with tracing fields and labels", () => {
    const event: AuditEvent = {
      eventId: "evt-1",
      agentId: "support-agent",
      actionType: "llm_call",
      decision: "allow",
      traceId: "trace-1",
      spanId: "span-1",
      labels: { env: "prod" },
      callStack: [
        {
          id: "n0",
          kind: "llm",
          label: "gpt-4o",
          latencyMs: 300,
          children: [{ id: "n1", kind: "tool", label: "gmail.send", latencyMs: 120 }]
        }
      ]
    };
    expect(event.callStack?.[0]?.kind).toBe("llm");
    expect(event.callStack?.[0]?.children?.[0]?.label).toBe("gmail.send");
    expect(event.labels?.env).toBe("prod");
  });

  it("resolves from the top-level @agent-assembly/sdk re-export", async () => {
    // AuditEvent + CallStackNode are exported as `type` only, so they don't
    // appear on the runtime module — but the type re-export chain must
    // compile: src/index.ts → src/types/index.ts → src/types/audit.ts.
    // Type-only `import type` keeps this check fully erasable.
    type SdkPublic = typeof import("../../src/index.js");
    expectTypeOf<SdkPublic>().toHaveProperty("withAssembly");
    const sample: AuditEvent = {
      eventId: "evt",
      agentId: "a",
      actionType: "llm_call",
      decision: "allow"
    };
    expect(sample.eventId).toBe("evt");
  });
});
