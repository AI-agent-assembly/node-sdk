import { randomUUID } from "node:crypto";
import { PolicyViolationError } from "../../errors/policy-violation-error.js";
import type { GatewayClient } from "../../gateway/client.js";
import type { LangChainRunConfig, LangChainToolLike } from "../../types/langchain-adapter.js";

export interface WrapToolWithAssemblyOptions {
  approvalTimeoutMs?: number;
  generateRunId?: () => string;
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 30_000;

function createRunId(): string {
  return `run_${randomUUID()}`;
}

async function waitForApprovalWithTimeout(
  gateway: GatewayClient,
  toolName: string,
  runId: string,
  timeoutMs: number
): Promise<{ denied?: boolean; reason?: string }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<{ denied: true; reason: string }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ denied: true, reason: `Approval timeout after ${timeoutMs}ms` });
    }, timeoutMs);
  });

  try {
    const approvalPromise = gateway.waitForApproval(toolName, runId, timeoutMs);
    return await Promise.race([approvalPromise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function wrapToolWithAssembly<TTool extends LangChainToolLike>(
  tool: TTool,
  gateway: GatewayClient,
  options: WrapToolWithAssemblyOptions = {}
): TTool {
  const originalInvoke = tool.invoke.bind(tool);
  const generateRunId = options.generateRunId ?? createRunId;
  const approvalTimeoutMs = options.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS;

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

    if (decision.pending) {
      const finalDecision = await waitForApprovalWithTimeout(
        gateway,
        tool.name,
        runId,
        approvalTimeoutMs
      );
      if (finalDecision.denied) {
        throw new PolicyViolationError(
          `Approval rejected for '${tool.name}': ${finalDecision.reason ?? "Rejected"}`
        );
      }
    }

    return originalInvoke(input, config ? { ...config, runId } : { runId });
  };

  return tool;
}

export function getRunId(config: LangChainRunConfig | undefined, generateRunId: () => string): string {
  return config?.runId ?? generateRunId();
}
