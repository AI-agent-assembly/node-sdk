export interface LangChainRunConfig {
  runId?: string;
}

export interface LangChainToolLike<TInput = unknown, TOutput = unknown> {
  name: string;
  invoke: (input: TInput, config?: LangChainRunConfig) => Promise<TOutput>;
}

export interface LangChainCallbackHandlerLike {
  name: string;
  handleToolStart?: (tool: { name: string }, input: unknown, runId: string) => Promise<void>;
  handleToolEnd?: (output: unknown, runId: string) => Promise<unknown>;
  handleLLMStart?: (llm: { name?: string }, prompts: string[], runId: string) => Promise<void>;
  handleLLMEnd?: (output: unknown, runId: string) => Promise<void>;
}

export interface LangChainAdapterConfig {
  tools?: Record<string, LangChainToolLike>;
  callbacks?: LangChainCallbackHandlerLike[];
  approvalTimeoutMs?: number;
}
