import type { ToolMap } from "../types/tool-map.js";

export interface WithAssemblyOptions {
  agentId?: string;
  gatewayUrl?: string;
}

export function withAssembly<TTool, TTools extends ToolMap<TTool>>(
  tools: TTools,
  options: WithAssemblyOptions
): TTools {
  void options;
  return tools;
}
