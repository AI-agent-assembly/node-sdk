import type { GatewayClient } from "../../gateway/client.js";

export class AssemblyCallbackHandler {
  readonly name = "assembly_handler";
  private readonly pendingDenials = new Map<string, { reason: string; at: number }>();

  constructor(
    private readonly gateway: GatewayClient,
    private readonly now: () => number = () => Date.now(),
    private readonly pendingDenialMaxAgeMs: number = 5 * 60 * 1000
  ) {
    void this.gateway;
    void this.now;
    void this.pendingDenialMaxAgeMs;
  }

  async handleToolStart(_tool: { name: string }, _input: unknown, _runId: string): Promise<void> {
    return;
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
