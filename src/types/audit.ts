// Mirrors the wire-protocol shape of `assembly.audit.v1.AuditEvent` +
// `assembly.audit.v1.CallStackNode` as of agent-assembly commit
// `ed4aa11a8c1d1ce1e6f96b08cf2179fd772099b2` (AAASM-1419 / PR #467).

/**
 * Discriminator for a {@link CallStackNode} — open-ended on the wire
 * (proto uses `string kind`) but typed here as a union for the three
 * values the dashboard currently renders.
 */
export type CallStackNodeKind = "llm" | "tool" | "result";

/**
 * One node in the hierarchical call stack attached to an
 * {@link AuditEvent}. Renders inline beneath an expanded Live Ops row
 * in the dashboard.
 *
 * Field names are camelCase per the SDK's TypeScript convention; the
 * wire JSON uses snake_case (`latency_ms`) and the gateway-side mapper
 * translates between the two.
 */
export interface CallStackNode {
  /** Stable identifier for this node within the call stack. */
  id: string;
  /** Node category — one of `"llm"`, `"tool"`, or `"result"`. */
  kind: CallStackNodeKind;
  /** Human-readable label rendered by downstream UI. */
  label: string;
  /**
   * Step-local latency in milliseconds, or `undefined` when the producer
   * did not record a duration. The wire field is `latency_ms`.
   */
  latencyMs?: number;
  /**
   * Recursive descent — nested calls produced by this step. Omitted (or
   * empty array) when the node has no children.
   */
  children?: CallStackNode[];
}

/**
 * A single governance-relevant occurrence in the gateway audit trail.
 *
 * Focused subset of the proto `assembly.audit.v1.AuditEvent` message —
 * exposes the scalar identifying fields, labels, and the new
 * `callStack` field added in AAASM-1419. The proto's `detail` oneof
 * (LLM / tool / file-op / network / process / violation / approval
 * variants) and the full lineage block are intentionally out of scope
 * here; they will land as separate follow-up Tasks if a Node consumer
 * needs them.
 */
export interface AuditEvent {
  /** Unique identifier for this audit record (UUID v7). */
  eventId: string;
  /** Identity string of the agent that produced this event. */
  agentId: string;
  /**
   * High-level action category — e.g. `"llm_call"`, `"tool_call"`,
   * `"file_op"`. Open-ended on the wire (proto enum, surfaced as a
   * normalized string).
   */
  actionType: string;
  /**
   * Policy engine verdict — e.g. `"allow"`, `"deny"`, `"redact"`.
   * Open-ended on the wire.
   */
  decision: string;
  /** Distributed tracing run-level identifier. Empty string when unset. */
  traceId?: string;
  /** Distributed tracing action-level identifier. Empty string when unset. */
  spanId?: string;
  /** Distributed tracing parent span identifier. Empty when this is a root span. */
  parentSpanId?: string;
  /** Arbitrary key/value labels attached at event creation. */
  labels?: Record<string, string>;
  /**
   * Hierarchical record of LLM / tool / result steps that led to this
   * event. Empty array (or undefined) when the producer did not record
   * a stack. Renders inline beneath an expanded Live Ops row.
   */
  callStack?: CallStackNode[];
}
