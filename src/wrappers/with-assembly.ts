import { randomUUID } from "node:crypto";
import { PolicyViolationError } from "../errors/policy-violation-error.js";
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

function wrapSingleTool(
  name: string,
  tool: Record<string, unknown>,
  gateway: GatewayClient,
  options: WithAssemblyOptions
): void {
  const approvalTimeoutMs = options.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS;

  if (hasExecute(tool)) {
    const originalExecute = tool.execute;
    tool.execute = async (...args: unknown[]) => {
      const runId = `run_${randomUUID()}`;
      const decision = await gateway.check({
        action: "tool_call",
        toolName: name,
        args,
        runId
      });

      if (decision.denied) {
        throw new PolicyViolationError(
          `Tool '${name}' blocked: ${decision.reason ?? "Denied"}`
        );
      }

      if (decision.pending) {
        const finalDecision = await waitForApprovalWithTimeout(
          gateway, name, runId, approvalTimeoutMs
        );
        if (finalDecision.denied) {
          throw new PolicyViolationError(
            `Approval rejected for '${name}': ${finalDecision.reason ?? "Rejected"}`
          );
        }
      }

      return originalExecute(...args);
    };
  } else if (hasInvoke(tool)) {
    const originalInvoke = tool.invoke;
    tool.invoke = async (...args: unknown[]) => {
      const runId = `run_${randomUUID()}`;
      const decision = await gateway.check({
        action: "tool_call",
        toolName: name,
        args,
        runId
      });

      if (decision.denied) {
        throw new PolicyViolationError(
          `Tool '${name}' blocked: ${decision.reason ?? "Denied"}`
        );
      }

      if (decision.pending) {
        const finalDecision = await waitForApprovalWithTimeout(
          gateway, name, runId, approvalTimeoutMs
        );
        if (finalDecision.denied) {
          throw new PolicyViolationError(
            `Approval rejected for '${name}': ${finalDecision.reason ?? "Rejected"}`
          );
        }
      }

      return originalInvoke(...args);
    };
  }
}

export function withAssembly<TTool, TTools extends ToolMap<TTool>>(
  tools: TTools,
  options: WithAssemblyOptions
): TTools {
  void options;
  return tools;
}
