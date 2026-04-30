import type { OpenAIAgentsRunTool } from "../types/openai-agents-adapter.js";

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
