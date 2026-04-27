import type { GatewayClient } from "../../gateway/client.js";

const BLOCKED_OUTPUT = "[BLOCKED] This action was flagged as a policy violation.";

export class AssemblyCallbackHandler {
  readonly name = "assembly_handler";
  private readonly pendingDenials = new Map<string, { reason: string; at: number }>();

  constructor(
    private readonly gateway: GatewayClient,
    private readonly now: () => number = () => Date.now(),
    private readonly pendingDenialMaxAgeMs: number = 5 * 60 * 1000
  ) {
    void this.pendingDenialMaxAgeMs;
  }

  async handleToolStart(tool: { name: string }, input: unknown, runId: string): Promise<void> {
    const decision = await this.gateway.check({
      action: "tool_call",
      toolName: tool.name,
      args: input,
      runId
    });

    await this.gateway.record({
      action: "tool_start_check",
      runId,
      reason: decision.reason
    });

    if (decision.denied) {
      this.pendingDenials.set(runId, {
        reason: decision.reason ?? "Tool denied by policy.",
        at: this.now()
      });
    }
  }

  async handleToolEnd(output: unknown, runId: string): Promise<unknown> {
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
    await this.gateway.scanPrompts({
      prompts,
      runId,
      modelName: llm.name
    });
  }

  async handleLLMEnd(output: unknown, runId: string): Promise<void> {
    await this.gateway.record({
      action: "llm_response",
      runId,
      output
    });
  }

  // Exposed for deterministic unit testing around cleanup behavior.
  getPendingDenialCount(): number {
    return this.pendingDenials.size;
  }
}
