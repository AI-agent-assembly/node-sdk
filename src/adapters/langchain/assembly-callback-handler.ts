import type { GatewayClient } from "../../gateway/client.js";

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

  async handleToolEnd(output: unknown, _runId: string): Promise<unknown> {
    return output;
  }

  async handleLLMStart(_llm: { name?: string }, _prompts: string[], _runId: string): Promise<void> {
    return;
  }

  async handleLLMEnd(_output: unknown, _runId: string): Promise<void> {
    return;
  }

  // Exposed for deterministic unit testing around cleanup behavior.
  getPendingDenialCount(): number {
    return this.pendingDenials.size;
  }
}
