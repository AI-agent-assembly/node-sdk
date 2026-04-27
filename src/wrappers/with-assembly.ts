import type { ToolMap } from "../types/tool-map.js";

export interface WithAssemblyOptions {
  agentId?: string;
  gatewayUrl?: string;
}

export function withAssembly<TTool, TTools extends ToolMap<TTool>>(
  tools: TTools,
  _options: WithAssemblyOptions
): TTools {
  return tools;
}
