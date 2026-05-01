import type { GatewayClient } from "../gateway/client.js";
import type { ToolMap } from "../types/tool-map.js";

export interface WithAssemblyOptions {
  gatewayClient: GatewayClient;
  agentId?: string;
  approvalTimeoutMs?: number;
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 30_000;

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
