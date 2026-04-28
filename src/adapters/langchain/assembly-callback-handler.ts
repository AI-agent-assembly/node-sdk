import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { GatewayClient } from "../../gateway/client.js";

const BLOCKED_OUTPUT = "[BLOCKED] This action was flagged as a policy violation.";

function getSerializedName(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = (value as { name?: unknown }).name;
  return typeof candidate === "string" ? candidate : undefined;
}

export class AssemblyCallbackHandler extends BaseCallbackHandler {
  readonly name = "assembly_handler";
  private readonly pendingDenials = new Map<string, { reason: string; at: number }>();

  constructor(
    private readonly gateway: GatewayClient,
    private readonly now: () => number = () => Date.now(),
    private readonly pendingDenialMaxAgeMs: number = 5 * 60 * 1000
  ) {
    super();
  }

  async handleToolStart(tool: { name?: string }, input: unknown, runId: string): Promise<void> {
    this.cleanupExpiredPendingDenials();

    const toolName = tool.name ?? getSerializedName(tool) ?? "unknown_tool";
    const decision = await this.gateway.check({
      action: "tool_call",
      toolName,
      args: input,
      runId
    });

    await this.gateway.record({
      action: "tool_start_check",
      runId,
      ...(decision.reason ? { reason: decision.reason } : {})
    });

    if (decision.denied) {
      this.pendingDenials.set(runId, {
        reason: decision.reason ?? "Tool denied by policy.",
        at: this.now()
      });
    }
  }

  async handleToolEnd(output: unknown, runId: string): Promise<unknown> {
    this.cleanupExpiredPendingDenials();

    const pending = this.pendingDenials.get(runId);
    if (pending) {
      this.pendingDenials.delete(runId);
      await this.gateway.record({
        action: "policy_post_block",
        runId,
        reason: pending.reason
      });
      return BLOCKED_OUTPUT;
    }

    await this.gateway.recordResult({ runId, output });
    return output;
  }

  async handleLLMStart(llm: { name?: string }, prompts: string[], runId: string): Promise<void> {
    this.cleanupExpiredPendingDenials();

    const modelName = llm.name ?? getSerializedName(llm);
    await this.gateway.scanPrompts({
      prompts,
      runId,
      ...(modelName ? { modelName } : {})
    });
  }

  async handleLLMEnd(output: unknown, runId: string): Promise<void> {
    this.cleanupExpiredPendingDenials();

    await this.gateway.record({
      action: "llm_response",
      runId,
      output
    });
  }

  cleanupExpiredPendingDenials(now: number = this.now()): number {
    let removed = 0;
    for (const [runId, denial] of this.pendingDenials.entries()) {
      if (now - denial.at >= this.pendingDenialMaxAgeMs) {
        this.pendingDenials.delete(runId);
        removed += 1;
      }
    }
    return removed;
  }

  // Exposed for deterministic unit testing around cleanup behavior.
  getPendingDenialCount(): number {
    return this.pendingDenials.size;
  }
}
