import type { GatewayClient } from "../gateway/client.js";
import type { ToolMap } from "../types/tool-map.js";

export interface WithAssemblyOptions {
  gatewayClient: GatewayClient;
  agentId?: string;
  approvalTimeoutMs?: number;
}

export function withAssembly<TTool, TTools extends ToolMap<TTool>>(
  tools: TTools,
  options: WithAssemblyOptions
): TTools {
  void options;
  return tools;
}
