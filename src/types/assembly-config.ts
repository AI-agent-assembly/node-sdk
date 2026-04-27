import type { AssemblyMode } from "./assembly-mode.js";

export interface AssemblyConfig {
  gatewayUrl: string;
  apiKey: string;
  agentId?: string;
  mode?: AssemblyMode;
}
