export interface OpenAIAgentsToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIAgentsRunContext {
  agentId?: string;
  runId?: string;
}

export interface OpenAIAgentsToolCallOutput {
  error?: string;
}

export type OpenAIAgentsRunTool = (
  toolCall: OpenAIAgentsToolCall,
  context: OpenAIAgentsRunContext
) => Promise<OpenAIAgentsToolCallOutput>;
