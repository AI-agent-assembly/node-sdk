import type { GatewayClient } from "../gateway/client.js";
import type { ToolMap } from "../types/tool-map.js";

export interface WithAssemblyOptions {
  gatewayClient: GatewayClient;
  agentId?: string;
  approvalTimeoutMs?: number;
}

function hasExecute(
  tool: Record<string, unknown>
): tool is Record<string, unknown> & { execute: (...args: unknown[]) => unknown } {
  return typeof tool.execute === "function";
}

function hasInvoke(
  tool: Record<string, unknown>
): tool is Record<string, unknown> & { invoke: (...args: unknown[]) => unknown } {
  return typeof tool.invoke === "function";
}

export function withAssembly<TTool, TTools extends ToolMap<TTool>>(
  tools: TTools,
  options: WithAssemblyOptions
): TTools {
  void options;
  return tools;
}
