import type { GatewayClient } from "../../gateway/client.js";
import type { LangChainRunConfig, LangChainToolLike } from "../../types/langchain-adapter.js";

export interface WrapToolWithAssemblyOptions {
  approvalTimeoutMs?: number;
  generateRunId?: () => string;
}

export function wrapToolWithAssembly<TTool extends LangChainToolLike>(
  tool: TTool,
  _gateway: GatewayClient,
  _options: WrapToolWithAssemblyOptions = {}
): TTool {
  void _gateway;
  void _options;
  return tool;
}

export function getRunId(config: LangChainRunConfig | undefined, generateRunId: () => string): string {
  return config?.runId ?? generateRunId();
}
