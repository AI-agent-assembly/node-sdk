import type {
  OpenAIAgentsRunContext,
  OpenAIAgentsRunTool,
  OpenAIAgentsToolCall
} from "../types/openai-agents-adapter.js";

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
