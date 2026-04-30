import type {
  OpenAIAgentsRunContext,
  OpenAIAgentsRunTool,
  OpenAIAgentsToolCall,
  OpenAIAgentsToolCallOutput
} from "../types/openai-agents-adapter.js";
import type { GatewayClient } from "../gateway/client.js";

export interface OpenAIAgentsAgentClass {
  prototype: {
    _runTool?: OpenAIAgentsRunTool;
  };
}

export interface OpenAIAgentsPatchState {
  isPatched: boolean;
  originalRunTool: OpenAIAgentsRunTool | undefined;
}

export const openAIAgentsPatchState: OpenAIAgentsPatchState = {
  isPatched: false,
  originalRunTool: undefined
};

export function captureOriginalRunTool(
  agentClass: OpenAIAgentsAgentClass
): OpenAIAgentsRunTool | undefined {
  const candidate = agentClass.prototype._runTool;
  if (!candidate) {
    return undefined;
  }

  if (!openAIAgentsPatchState.originalRunTool) {
    openAIAgentsPatchState.originalRunTool = candidate;
  }

  return openAIAgentsPatchState.originalRunTool;
}

export function parseToolCallArguments(toolCall: OpenAIAgentsToolCall): unknown {
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return toolCall.function.arguments;
  }
}

export interface OpenAIAgentsToolCallContextMetadata {
  agentId?: string;
  runId?: string;
}

export function extractToolCallContextMetadata(
  context: OpenAIAgentsRunContext | undefined
): OpenAIAgentsToolCallContextMetadata {
  return {
    agentId: context?.agentId ?? undefined,
    runId: context?.runId ?? undefined
  };
}

export function formatDeniedToolCallOutput(
  reason: string | undefined,
  prefix: string
): OpenAIAgentsToolCallOutput {
  const detail = reason?.trim() ? reason : "denied";
  return { error: `${prefix}: ${detail}` };
}

export interface AwaitApprovalOptions {
  toolName: string;
  runId: string;
  timeoutMs: number;
}

export async function handlePendingApproval(
  gatewayClient: GatewayClient,
  options: AwaitApprovalOptions
): Promise<OpenAIAgentsToolCallOutput | undefined> {
  const approval = await gatewayClient.waitForApproval(
    options.toolName,
    options.runId,
    options.timeoutMs
  );

  if (!approval.denied) {
    return undefined;
  }

  return formatDeniedToolCallOutput(approval.reason, "Approval denied");
}

export function recordToolResultNonBlocking(
  gatewayClient: GatewayClient,
  runId: string,
  output: unknown
): void {
  void gatewayClient.recordResult({ runId, output }).catch(() => undefined);
}

export interface CreatePatchedRunToolOptions {
  fallbackRunId: string;
  approvalTimeoutMs: number;
}

export function createPatchedRunTool(
  originalRunTool: OpenAIAgentsRunTool,
  gatewayClient: GatewayClient,
  options: CreatePatchedRunToolOptions
): OpenAIAgentsRunTool {
  return async function patchedRunTool(toolCall, context) {
    const toolName = toolCall.function.name;
    const args = parseToolCallArguments(toolCall);
    const metadata = extractToolCallContextMetadata(context);
    const runId = metadata.runId ?? options.fallbackRunId;

    const decision = await gatewayClient.check({
      action: "tool_call",
      toolName,
      args,
      runId
    });

    if (decision.denied) {
      return formatDeniedToolCallOutput(decision.reason, "Blocked by governance policy");
    }

    if (decision.pending) {
      const pendingOutput = await handlePendingApproval(gatewayClient, {
        toolName,
        runId,
        timeoutMs: options.approvalTimeoutMs
      });
      if (pendingOutput) {
        return pendingOutput;
      }
    }

    const result = await originalRunTool.call(this, toolCall, context);
    recordToolResultNonBlocking(gatewayClient, runId, {
      toolName,
      args,
      result,
      agentId: metadata.agentId
    });
    return result;
  };
}
