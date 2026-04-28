import type { GatewayClient } from "../gateway/client.js";
import type { LangChainAdapterConfig } from "./langchain-adapter.js";
import type { AssemblyMode } from "./assembly-mode.js";

export interface AssemblyConfig {
  gatewayUrl: string;
  apiKey: string;
  agentId?: string;
  mode?: AssemblyMode;
  gatewayClient?: GatewayClient;
  langchain?: LangChainAdapterConfig;
}
