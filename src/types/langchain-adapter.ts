export interface LangChainRunConfig {
  runId?: string;
  [key: string]: unknown;
}

export interface LangChainToolLike<TInput = unknown, TOutput = unknown> {
  name: string;
  invoke: (input: TInput, config?: LangChainRunConfig) => Promise<TOutput>;
}

export interface LangChainCallbackHandlerLike {
  name: string;
  handleToolStart?: (
    tool: { name?: string },
    input: unknown,
    runId: string,
    ...rest: unknown[]
  ) => Promise<void>;
  handleToolEnd?: (output: unknown, runId: string, ...rest: unknown[]) => Promise<unknown>;
  handleLLMStart?: (
    llm: { name?: string },
    prompts: string[],
    runId: string,
    ...rest: unknown[]
  ) => Promise<void>;
  handleLLMEnd?: (output: unknown, runId: string, ...rest: unknown[]) => Promise<void>;
}

export interface LangChainAdapterConfig {
  tools?: Record<string, LangChainToolLike>;
  callbacks?: LangChainCallbackHandlerLike[];
  approvalTimeoutMs?: number;
}
