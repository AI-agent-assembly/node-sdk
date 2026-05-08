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
  /** ID of the parent agent that delegated work to this agent. */
  parentAgentId?: string;
  /** Team this agent belongs to for budget and policy scoping. */
  teamId?: string;
  /**
   * Human-readable explanation for why this agent was delegated to.
   * Must be ≤ 256 characters; throws `RangeError` otherwise.
   */
  delegationReason?: string;
  /** Name of the tool that spawned this agent, if applicable. */
  spawnedByTool?: string;
}
