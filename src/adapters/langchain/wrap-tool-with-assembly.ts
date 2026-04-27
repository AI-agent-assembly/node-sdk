import { PolicyViolationError } from "../../errors/policy-violation-error.js";
import type { GatewayClient } from "../../gateway/client.js";
import type { LangChainRunConfig, LangChainToolLike } from "../../types/langchain-adapter.js";

export interface WrapToolWithAssemblyOptions {
  approvalTimeoutMs?: number;
  generateRunId?: () => string;
}

function createRunId(): string {
  return `run_${Math.random().toString(36).slice(2, 10)}`;
}

export function wrapToolWithAssembly<TTool extends LangChainToolLike>(
  tool: TTool,
  gateway: GatewayClient,
  options: WrapToolWithAssemblyOptions = {}
): TTool {
  const originalInvoke = tool.invoke.bind(tool);
  const generateRunId = options.generateRunId ?? createRunId;

  tool.invoke = async (input: unknown, config?: LangChainRunConfig) => {
    const runId = getRunId(config, generateRunId);
    const decision = await gateway.check({
      action: "tool_call",
      toolName: tool.name,
      args: input,
      runId
    });

    if (decision.denied) {
      throw new PolicyViolationError(`Tool '${tool.name}' blocked: ${decision.reason ?? "Denied"}`);
    }

    return originalInvoke(input, {
      ...(config ?? {}),
      runId
    });
  };

  return tool;
}

export function getRunId(config: LangChainRunConfig | undefined, generateRunId: () => string): string {
  return config?.runId ?? generateRunId();
}
