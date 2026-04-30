export interface OpenAIAgentsToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIAgentsRunContext {
  agentId?: string;
  runId?: string;
  [key: string]: unknown;
}

export interface OpenAIAgentsToolCallOutput {
  error?: string;
  [key: string]: unknown;
}

export type OpenAIAgentsRunTool = (
  toolCall: OpenAIAgentsToolCall,
  context: OpenAIAgentsRunContext
) => Promise<OpenAIAgentsToolCallOutput>;
